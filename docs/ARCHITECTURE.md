# Architecture

## Goals

1. **Offline-first.** A sales executive must be able to see customers,
   balances and invoices, capture collections/orders and photograph receipts
   with no signal. Nothing the agent does may be lost.
2. **Reflected in the web ERP, not beside it.** Field data must post into the
   same tables and ledgers the office uses, through the ERP's own services, so
   reports, receivables and vouchers stay consistent.
3. **No parallel back-office.** The web app keeps ownership of masters
   (customers, products, invoices, roles). The mobile app only *adds*
   collections, orders and visit facts.

## Components

### `backend-extension` (Express module inside the existing backend)

* `mobile.routes.ts` — `/api/mobile/*`, guarded by the ERP's `authMiddleware`
  and `requirePermission("mobile-app.*")`.
* `mobile.sync.service.ts` — WatermelonDB pull/push implementation.
* `mobile.collection.service.ts` — posts a collection **in one transaction**:
  invoice payment JSON + `sales_invoice_payments` + receipt vouchers (via the
  ERP's `voucherPostingService.postReceiptVouchersForSales`) + on-account
  voucher + customer outstanding + `mobile_collections` row + sync map.
* `mobile.order.service.ts` — wraps `salesOrderService.create` (same pricing,
  GST, validation as the web form), generating the order number server-side and
  retrying on number collisions.
* `mobile.visit.service.ts` — visit upserts, auto-planning from route
  assignments, office planning endpoints.
* `mobile.attachment.service.ts` — ImageKit (default, existing ERP store) or S3.
* `mobile.ocr.service.ts` — cheque field extraction with Claude vision and a
  strict JSON schema (`claude-opus-5` by default).
* `prisma/mobile-models.prisma` — five new tables; no existing column is altered.

### `mobile` (Expo + WatermelonDB)

* Reads: every screen observes WatermelonDB queries (`src/db/hooks.ts`), so the
  UI updates instantly when a sync lands or a collection is captured.
* Writes: `src/data/actions.ts`; each record gets a client UUID.
* Sync: `src/sync/sync.ts` + `SyncProvider`.

## Sync protocol

WatermelonDB's standard `synchronize()` contract, over two endpoints:

* `GET /api/mobile/sync/pull?lastPulledAt=<ms>` →
  `{ changes: { <table>: { created, updated, deleted } }, timestamp, full }`
* `POST /api/mobile/sync/push` ← `{ changes, lastPulledAt }` →
  `{ results }` (per-record outcome; never fails the batch)

| Table            | Owner  | Pull scope (full)                              | Incremental key                      | Push |
| ---------------- | ------ | ---------------------------------------------- | ------------------------------------ | ---- |
| customers        | ERP    | all non-deleted, with ledger net balance       | `updatedAt`, or any invoice/voucher/collection touching the customer | – |
| invoices         | ERP    | unpaid + last 180 days, with paid/balance      | `updatedAt`                          | – |
| products         | ERP    | active                                         | `updatedAt` (inactive ⇒ deleted)     | – |
| routes, route_customers | ERP | all (device prunes to the pulled set)     | always full                          | – |
| visits           | agent  | last 30 days + future                          | `updatedAt` / `deletedAt`            | created, updated, deleted |
| collections      | agent  | last 90 days                                   | `updatedAt`                          | created only (immutable) |
| orders           | agent  | last 90 days (sync map ⨝ sales_orders)         | sync-map or order `updatedAt`        | created only |
| attachments      | device | never pulled; uploaded via `/attachments` first| –                                    | ignored by server |

Rules that keep it safe:

* **Idempotency.** Client UUIDs are primary keys (`mobile_visits`,
  `mobile_collections`) or mapped in `mobile_sync_records`; a duplicate push is a
  no-op and returns the earlier result.
* **Per-record failure isolation.** A collection that cannot post (e.g. invoice
  already settled in the office) is stored as `FAILED` with the reason, echoed
  back to the device, and can be re-posted by the office after fixing the cause.
  The rest of the batch still posts.
* **Full refresh after 12 h** (or on demand) so ledger balances never drift.
* **Photos before records.** The device uploads pending photos and stamps the
  URLs onto the collection before pushing it. If upload fails, the sync stops
  and retries later — the ERP never sees a receipt without its evidence.
* **Device switch.** Logging in as a different user wipes the local DB.
  Re-login as the same user keeps unsynced data.

## Posting rules (what the office sees)

| Field event | ERP effect |
| ----------- | ---------- |
| Collection allocated to invoice(s) | Each invoice gets a payment entry `{ id: <collectionId>_<inv>, amount, paymentMethod, referenceNumber, paymentDate, recordedBy, source: "MOBILE" }` in `sales_invoices.payments`, a `sales_invoice_payments` row, and a `RECEIPT` voucher `RCT-<invoiceNo>` (Dr Cash/Bank, Cr Customer) via the existing posting service. Invoice status → `PAID` when settled. |
| Unallocated (on-account / advance) amount | `RECEIPT` voucher `RCT-MC-YYYY-NNNNN` against the customer ledger, `refDocType = MOBILE_COLLECTION`. |
| Any collection | `customers.outstandingAmount -= amount`; `mobile_collections` row with receipt number `MC-YYYY-NNNNN`, allocations, photo URLs, voucher ids, agent. |
| New order | `sales_orders` via `salesOrderService.create` with `orderType = salesperson`, `orderSource = SALES_PERSON`, `sourceEmployeeId` = the agent's employee, status `MOBILE_ORDER_STATUS` (default `DRAFT` → *Draft Orders* for office confirmation). Pricing uses the customer grade rates unless the agent overrode a price. |
| Visit check-in / completion | `mobile_visits` with timestamps, GPS (if permitted), outcome. |

Cash → `CASH-001`; Cheque / UPI / NEFT → `BANK-001` (same convention as the
web receipt flow). Cheque metadata (bank, number, date, drawer) is on the
collection row and in the voucher narration.

## Security model

* Same JWT + session table as the web app (`POST /api/auth/login`).
* Three permissions registered through the ERP's registry: `mobile-app.view`,
  `mobile-app.create`, `mobile-app.manage`. Agents need only the first two —
  the module calls services directly, so agents get no web-module rights.
* Agent-scoped data: visits/collections/orders are filtered by the JWT user.
  Customers/products/invoices are company-wide (the field team can sell to any
  customer).
* Token is stored in `expo-secure-store`; a `401` forces re-login without
  discarding offline entries.

## Decisions worth knowing

* **WatermelonDB over a hand-rolled queue** — gives per-record change tracking,
  conflict handling and a battle-tested sync loop; the backend implements its
  small protocol instead of custom endpoints per entity.
* **Server-side order numbers / receipt numbers** — avoids collisions between
  agents and the office; the device shows "pending" until the pull echoes them.
* **Orders default to DRAFT** — the office reviews stock/credit before
  confirming. Set `MOBILE_ORDER_STATUS=CONFIRMED` to skip that.
* **ImageKit by default** — it is what the ERP already uses; S3 is a config
  switch (`MOBILE_STORAGE_DRIVER=s3`) as per the wireframe.
* **Cheque OCR on the server** — one API key, structured output with
  confidence + warnings, and the agent always verifies before saving. Offline,
  the same screen degrades to manual entry.
* **Expo prebuild (not Expo Go)** — WatermelonDB needs native code; the
  `@morrowdigital/watermelondb-expo-plugin` wires JSI in `expo prebuild`.

## Before first rollout (checklist)

1. Apply the extension, migrate, restart; confirm `GET /api/mobile/bootstrap`
   returns your company for an admin token.
2. Create the *Sales Executive* role with `mobile-app.view/create`; link each
   agent's user to their Employee record (order source tracking).
3. Create routes and stops (`POST /api/mobile/admin/routes`,
   `PUT /api/mobile/admin/routes/:id/customers`) and assign agents
   (`PUT /api/mobile/admin/routes/:id/assignments`).
4. Build the dev client (`expo prebuild`, `expo run:android`) and log in on a
   device; run a sync and check customers/invoices/products arrive.
5. Record a test collection (Cash, ₹1) against a test invoice; verify in the web
   app: invoice payment, RECEIPT voucher, customer outstanding, and the
   collection register (`GET /api/mobile/admin/collections`).
6. Record a test order; confirm it appears under Draft Orders with the agent as
   source.
7. Toggle airplane mode, capture a collection with a photo, reconnect; confirm
   the photo URL is on the `mobile_collections` row.
8. Decide `MOBILE_ORDER_STATUS`, storage driver and whether to enable OCR
   (`ANTHROPIC_API_KEY`).
