# `/api/mobile` reference

All endpoints require `Authorization: Bearer <token>` from `POST /api/auth/login`
(same login as the web app). Responses use the ERP envelope
`{ success, message, data }` except the two sync endpoints, which return the
WatermelonDB shapes directly.

## Device endpoints

### `GET /bootstrap` — `mobile-app.view`

```json
{
  "agent": { "userId": "…", "fullName": "…", "email": "…", "employeeId": "12", "isSuperAdmin": false, "permissions": ["mobile-app.view", "mobile-app.create"] },
  "company": { "id": "…", "companyName": "Sun Sea …", "currencyCode": "INR", "logoUrl": null },
  "settings": { "orderStatusOnSubmit": "DRAFT", "paymentModes": ["Cash","Cheque","UPI","NEFT"], "chequeOcrEnabled": true, "attachmentStorage": "imagekit", "maxAttachmentBytes": 8388608 },
  "serverTime": 1756900000000
}
```

### `GET /sync/pull?lastPulledAt=<ms>&full=1` — `mobile-app.view`

Returns `{ changes, timestamp, full }`. `changes` has one entry per table with
`created` (always empty — everything is sent as `updated`), `updated` and
`deleted` (ids). Omitting `lastPulledAt`, passing `full=1`, or a
`lastPulledAt` older than 12 hours yields a full refresh.

Record shapes (WatermelonDB raw; snake_case, dates `YYYY-MM-DD`, timestamps epoch ms, JSON columns as strings):

| Table | Columns |
| ----- | ------- |
| `customers` | `id, customer_code, firm_name, display_name, mobile, email, gstin, address_line, city, state, pincode, credit_limit, credit_days, outstanding, grade_name, type_name, status, updated_at` — `outstanding` is the ledger net balance (positive = customer owes) |
| `invoices` | `id, invoice_no, customer_id, invoice_date, due_date, grand_total, paid_amount, balance, status (UNPAID/PARTIAL/PAID), updated_at` |
| `products` | `id, product_code, product_name, uom, rate, grade_rates (JSON {grade: rate}), category, is_active, updated_at` |
| `routes` | `id, route_code, route_name` |
| `route_customers` | `id, route_id, customer_id, sequence, planned_time` |
| `visits` | `id, customer_id, route_id, planned_date, planned_time, sequence, status, outcome, check_in_at, check_out_at, latitude, longitude, notes, updated_at` |
| `collections` | `id, receipt_no, customer_id, visit_id, amount, payment_mode, reference_no, bank_name, cheque_date, drawer_name, collected_at, notes, allocations (JSON), attachments (JSON), status (POSTED/FAILED), sync_error, updated_at` |
| `orders` | `id (client id), order_no, sales_order_id, customer_id, visit_id, order_date, items (JSON), total_amount, remarks, status (ERP status or FAILED), sync_error, updated_at` |

### `POST /sync/push` — `mobile-app.create`

```json
{
  "lastPulledAt": 1756900000000,
  "changes": {
    "visits":      { "created": [ …visit raw… ], "updated": [ … ], "deleted": ["uuid"] },
    "collections": { "created": [ …collection raw… ], "updated": [], "deleted": [] },
    "orders":      { "created": [ …order raw… ], "updated": [], "deleted": [] }
  }
}
```

Collection raw (device → server):

```json
{
  "id": "6f1c…", "customer_id": "…", "visit_id": "…",
  "amount": 18750, "payment_mode": "Cheque",
  "reference_no": "123456", "bank_name": "State Bank of India", "cheque_date": "2026-05-20", "drawer_name": "Sri Balaji Stores",
  "collected_at": 1756900000000, "notes": null,
  "allocations": "[{\"invoiceId\":\"…\",\"invoiceNo\":\"INV-10045\",\"amount\":7850},{\"invoiceId\":\"…\",\"invoiceNo\":\"INV-10046\",\"amount\":6450}]",
  "attachments": "[{\"kind\":\"CHEQUE_FRONT\",\"url\":\"https://…\",\"fileId\":null,\"localId\":\"…\"}]"
}
```

`amount − Σ allocations` (if positive) is posted on account. Allocations above
an invoice's current balance are rejected for that collection only.

Order raw:

```json
{ "id": "…", "customer_id": "…", "visit_id": null, "order_date": "2026-05-20", "remarks": "Deliver before 25 May",
  "items": "[{\"productId\":\"41\",\"quantity\":2},{\"productId\":\"57\",\"quantity\":5,\"unitPrice\":180}]" }
```

`unitPrice` is optional; when omitted the ERP applies the customer-grade price.

Response:

```json
{ "success": true, "results": {
  "visits": { "ok": 3, "failed": [] },
  "collections": [{ "id": "…", "status": "POSTED", "receiptNo": "MC-2026-00012" }, { "id": "…", "status": "FAILED", "error": "Invoice INV-10045: allocation ₹7850 exceeds balance ₹0" }],
  "orders": [{ "id": "…", "status": "CREATED", "orderNo": "SO-2026-031" }]
} }
```

### `POST /attachments` — `mobile-app.create`

`multipart/form-data`: `file` (jpg/png/webp/heic/pdf ≤ 8 MB), `kind`
(`CASH_RECEIPT | CHEQUE_FRONT | CHEQUE_BACK | UPI_SCREENSHOT | OTHER`),
`collectionId`. → `{ url, fileId, driver, size, mimeType, kind, collectionId }`.

### `POST /ocr/cheque` — `mobile-app.create`

`multipart/form-data`: `image`. →

```json
{ "bankName": "State Bank of India", "branch": null, "ifsc": "SBIN0001234", "chequeNumber": "123456", "accountNumber": null,
  "date": "2026-05-20", "amount": 18750, "amountInWords": "Eighteen thousand seven hundred fifty only",
  "drawerName": "Sri Balaji Stores", "payeeName": "Sun Sea …", "isPostDated": false, "confidence": "high", "warnings": [] }
```

`503` when `ANTHROPIC_API_KEY` is not configured; `422` when the image cannot be read.

### `GET /customers/:id/statement` — `mobile-app.view`

Online drill-down from the Receivable service: `{ customer, summary, invoices, collectionHistory }`.

## Office endpoints — `mobile-app.manage`

| Method | Path | Body / query |
| ------ | ---- | ------------ |
| GET | `/admin/agents` | — |
| GET | `/admin/routes` | — (routes with stops and assignments) |
| POST | `/admin/routes` | `{ routeCode, routeName }` |
| PUT | `/admin/routes/:id/customers` | `{ customers: [{ customerId, sequence, plannedTime? }] }` (replaces the list) |
| PUT | `/admin/routes/:id/assignments` | `{ assignments: [{ agentUserId, dayOfWeek? }] }` — `dayOfWeek` 0–6 (Sun–Sat) or null for every day |
| GET | `/admin/visits` | `?agentUserId=&date=YYYY-MM-DD` or `?from=&to=` |
| POST | `/admin/visits` | `{ agentUserId, plannedDate, visits: [{ customerId, plannedTime?, sequence?, notes? }] }` |
| GET | `/admin/collections` | `?agentUserId=&customerId=&from=&to=&status=&page=&pageSize=` |
| POST | `/admin/collections/:id/repost` | — (retry a `FAILED` collection) |

## Permissions

Registered in `permissionRegistry.ts` as module `mobile-app`:

| Key | Who | Grants |
| --- | --- | ------ |
| `mobile-app.view` | field agents | bootstrap, pull, statement |
| `mobile-app.create` | field agents | push, attachments, OCR |
| `mobile-app.manage` | office | routes, planning, collections register, repost |

Super admins bypass all checks (as everywhere else in the ERP).
