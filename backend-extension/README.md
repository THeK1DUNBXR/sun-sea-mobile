# Sun Sea ERP — backend extension for the mobile app

This folder is a **drop-in module** for the existing Sun Sea ERP backend
(`sunsea-main/backend`, Express 5 + Prisma). It adds everything the
sales-executive mobile app needs while reusing the ERP's own services, so
anything captured in the field lands in the same tables, ledgers and screens
the office already uses:

| Field action              | What the ERP records                                                                    |
| ------------------------- | --------------------------------------------------------------------------------------- |
| Invoice-wise collection   | payment appended to `sales_invoices.payments`, `sales_invoice_payments` row, RECEIPT voucher (Cash → `CASH-001`, other modes → `BANK-001`, credit customer ledger), `customers.outstandingAmount` reduced, invoice marked `PAID` when settled |
| On-account collection     | RECEIPT voucher against the customer ledger (`refDocType = MOBILE_COLLECTION`)          |
| New sale order            | `sales_orders` + items through `salesOrderService.create` (grade pricing, GST, order source = `SALES_PERSON`), status from `MOBILE_ORDER_STATUS` (default `DRAFT`, review in *Draft Orders*) |
| Visit / route plan        | `mobile_visits`, `mobile_route_customers`, `mobile_route_assignments`                    |
| Receipt / cheque photos   | ImageKit (existing) or S3, URL stored on the collection                                  |

Socket events (`salesInvoice:updated`, `payment:created`, `voucher:created`,
`accountLedger:updated`, `customer:updated`, `salesOrder:created`,
`mobileCollection:created`) are emitted so open web screens refresh live.

## Install (5 minutes)

```bash
# from the folder that contains both checkouts
node sun-sea-mobile/backend-extension/scripts/apply-schema.js sunsea-main/backend

cd sunsea-main/backend
npm install @anthropic-ai/sdk              # cheque OCR
# npm install @aws-sdk/client-s3           # only if you want S3 instead of ImageKit
npx prisma migrate dev --name mobile_app   # or `npx prisma db push`
npx prisma generate
npm run dev
```

The script is idempotent. It:

1. appends [`prisma/mobile-models.prisma`](prisma/mobile-models.prisma) to `schema.prisma` and adds the back-relations on `Customer` and `Route`;
2. registers `mobile-app` (`view`, `create`, `manage`) in `permissionRegistry.ts` — the Role Matrix in the web app picks it up automatically on the next server start;
3. mounts `/api/mobile` in `routes/index.routes.ts`;
4. copies [`src/modules/mobile`](src/modules/mobile) into the backend.

### Environment variables

| Variable                | Required | Purpose                                                                   |
| ----------------------- | -------- | ------------------------------------------------------------------------- |
| `ANTHROPIC_API_KEY`     | for OCR  | Cheque OCR (`POST /api/mobile/ocr/cheque`). Without it the app falls back to manual entry. |
| `MOBILE_OCR_MODEL`      | no       | Defaults to `claude-opus-5`.                                              |
| `MOBILE_ORDER_STATUS`   | no       | Status given to orders submitted from the field. Default `DRAFT`; use `CONFIRMED` to skip office review. |
| `MOBILE_STORAGE_DRIVER` | no       | `imagekit` (default, reuses `IMAGEKIT_*`) or `s3`.                        |
| `AWS_S3_BUCKET`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_PUBLIC_URL` | for S3 | Standard AWS SDK credentials; `AWS_S3_PUBLIC_URL` optionally points at a CDN. |

### Roles

Create a role such as **Sales Executive** in the web app and tick
`mobile-app.view` + `mobile-app.create`. Nothing else is needed — the mobile
endpoints call the ERP services directly, so agents do not need
`sales-orders.*`, `sales-invoices.*` or `accounts.*` permissions (and therefore
cannot use the web app beyond their profile). Office users who plan routes get
`mobile-app.manage`.

## Endpoints

All routes require a Bearer token from `POST /api/auth/login` (the same login
the web app uses).

### Device

| Method | Path                                   | Permission          | Notes |
| ------ | -------------------------------------- | ------------------- | ----- |
| GET    | `/api/mobile/bootstrap`                | `mobile-app.view`   | Agent profile, company, feature flags (`chequeOcrEnabled`, `orderStatusOnSubmit`) |
| GET    | `/api/mobile/sync/pull?lastPulledAt=&full=` | `mobile-app.view` | WatermelonDB pull. Tables: `customers`, `invoices`, `products`, `routes`, `route_customers`, `visits`, `collections`, `orders`. Incremental when `lastPulledAt` is < 12 h old, otherwise a full refresh. |
| POST   | `/api/mobile/sync/push`                | `mobile-app.create` | WatermelonDB push: `visits` (created/updated/deleted), `collections` (created), `orders` (created). Each record is idempotent on its client-generated UUID. Failures are recorded per record (never fail the whole batch) and echoed back on the next pull as `status = FAILED` + `sync_error`. |
| POST   | `/api/mobile/attachments`              | `mobile-app.create` | `multipart/form-data`: `file`, `kind` (`CASH_RECEIPT`, `CHEQUE_FRONT`, `CHEQUE_BACK`, `UPI_SCREENSHOT`), `collectionId`. Returns `{ url, fileId, driver }`. |
| POST   | `/api/mobile/ocr/cheque`               | `mobile-app.create` | `multipart/form-data`: `image`. Returns bank, cheque no, date, amount, drawer, confidence, warnings. |
| GET    | `/api/mobile/customers/:id/statement`  | `mobile-app.view`   | Online ledger drill-down (invoices + collection history) from the Receivable service. |

### Office

| Method | Path                                         | Notes |
| ------ | -------------------------------------------- | ----- |
| GET    | `/api/mobile/admin/agents`                   | Users whose role has `mobile-app.view` |
| GET/POST | `/api/mobile/admin/routes`                 | List / create routes (`routeCode`, `routeName`) |
| PUT    | `/api/mobile/admin/routes/:id/customers`     | `{ customers: [{ customerId, sequence, plannedTime }] }` — ordered stops |
| PUT    | `/api/mobile/admin/routes/:id/assignments`   | `{ assignments: [{ agentUserId, dayOfWeek | null }] }` — `null` = every day |
| GET/POST | `/api/mobile/admin/visits`                 | List (`agentUserId`, `date`, `from`, `to`) / plan ad-hoc visits |
| GET    | `/api/mobile/admin/collections`              | Register of field collections (`agentUserId`, `customerId`, `from`, `to`, `status`, paging) |
| POST   | `/api/mobile/admin/collections/:id/repost`   | Retry a `FAILED` collection after fixing the cause |

When an agent has no visits planned for a day, the pull auto-generates them
from the routes assigned to that agent for that weekday.

## Data flow for a collection

```
device (offline)            push                 ERP
────────────────            ────                 ───
collection {uuid}      ──▶  validate + lock  ──▶ sales_invoices.payments  += {id: uuid_inv, amount, mode, ref, date}
  allocations[]                                  sales_invoice_payments   += row
  attachments[] (urls)                           vouchers                 += RCT-<invoice>  (postReceiptVouchersForSales)
                                                 vouchers                 += RCT-MC-…      (on-account remainder)
                                                 customers.outstandingAmount -= amount
                                                 mobile_collections       += {receipt_no MC-YYYY-NNNNN}
                       ◀──  next pull        ──  device shows receipt no / status
```

Everything inside the arrow runs in one Prisma transaction.

## Verifying

`npx tsc --noEmit` in the backend must stay clean after applying the module
(it does against the current `sunsea-main` checkout).
