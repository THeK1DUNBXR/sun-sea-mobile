# SunSea Collection Agent & Insights — System Design

This document is the single contract shared by the ERP backend (SunSea-Erp/backend),
the ERP web frontend (SunSea-Erp/frontend) and the two mobile apps in this repo
(`apps/collection-agent`, `apps/insights`). Every implementer builds against it.

**Hard constraint:** no paid / hosted AI or ML APIs anywhere. Free on-device or
in-browser libraries only (e.g. tesseract.js in the web app). Push notifications use the
free Expo push service. Maps: Leaflet + OpenStreetMap tiles on web, react-native-maps on
mobile (no Google Maps API key required on iOS; Android uses the OS map provider).

## 1. Actors & flow

1. **Admin (web ERP)** creates sales invoices (existing), then *assigns* an invoice with an
   outstanding balance to a **collection agent** (a `User` whose role holds
   `collection-agent-app.access`). Admin can bulk-assign, re-assign, set target date,
   priority and instructions.
2. **Collection agent (mobile app)** logs in, sees assigned invoices (sorted by
   due/priority/nearby), navigates/calls/WhatsApps the customer, and records either a
   **collection** (money received: cash/UPI/cheque/bank/card, photo proof, GPS, signature)
   or a **visit outcome** (customer unavailable, promised-to-pay date, refused, dispute…).
   The app also streams **precise GPS** (foreground + background) and lets the agent
   record **cash deposits** handed over to the office. It works **offline** with a sync queue.
3. **Backend** turns a collection into real money in the books: appends to
   `SalesInvoice.payments` JSON (existing convention), inserts `SalesInvoicePayment`,
   posts a RECEIPT voucher via `voucherPostingService.postReceiptVouchersForSales`,
   updates invoice status (`PARTIALLY_PAID` / `PAID`), decrements `customer.outstandingAmount`,
   and updates the assignment. Admin later **verifies** (or rejects → reverses) the record.
4. **Admin** watches a **live map** of all agents (web) with trails, last-seen, today's
   stats; verifies collections; accepts deposits (cash-in-hand reconciliation).
5. **Founder (Insights app)** gets a read-only snapshot: sales, collections, outstanding &
   aging, agent leaderboard, cash in hand, live agent map, production pulse.

## 2. Data model (already added to `backend/prisma/schema.prisma`)

- `InvoiceCollectionAssignment` — one active row per invoice (`isActive`), history kept.
  status: PENDING | IN_PROGRESS | PARTIALLY_COLLECTED | COLLECTED | UNCOLLECTED | CANCELLED.
- `CollectionRecord` — money collected. `clientRef` is an idempotency key from the app.
  `receiptNo` format `RCPT-YYYYMM-000001` (server-generated). status
  PENDING_VERIFICATION | VERIFIED | REJECTED. `paymentEntryId` = id of the entry pushed
  into `SalesInvoice.payments`; `voucherId` = the posted RECEIPT voucher.
- `CollectionVisit` — every visit with an outcome; `promisedDate/promisedAmount` for PTP.
- `AgentCashDeposit` — agent → office handover; status PENDING | ACCEPTED | REJECTED.
  Cash-in-hand for an agent = Σ VERIFIED+PENDING CASH records − Σ ACCEPTED deposits.
- `AgentLocation` (breadcrumbs) + `AgentLocationLatest` (upsert, for the live map).
- `AgentDeviceToken` — Expo push tokens.

Schema is applied with `npx prisma db push` (this repo has no SQL migrations folder).

Permissions (in `permissionRegistry.ts`): `collections.{view,assign,edit,delete,verify,export}`,
`collection-deposits.{view,accept}`, `agent-tracking.{view,export}`,
`collection-agent-app.access`, `insights-app.access`. Super admins bypass everything.

## 3. Backend API (Express, all under `/api`, Bearer JWT from `/api/auth/login`)

Response envelope: `{ success, message, data }` (use `ApiResponse`). Errors `{ success:false, message }`.
Mobile apps log in with the existing `POST /api/auth/login { email, password }` →
`data.accessToken`, `data.accessTokenExpiresAt`, `data.user` (flat, no `tokens` wrapper; user fields are `userId`, `fullName`, `email`, `username`, `isSuperAdmin`). Then `GET /api/auth/me` → `data.user`, `data.permissions`, `data.isSuperAdmin` (permissions are only returned here). Locked or suspended accounts receive a generic 401.
The agent app must refuse users lacking `collection-agent-app.access` (unless super admin);
the insights app requires `insights-app.access` (or super admin).

### 3.1 Admin: `/api/collections`  (module `backend/src/modules/collections/`)
| Method | Path | Perm | Notes |
|---|---|---|---|
| GET | `/agents` | collections.view | Users whose role holds `collection-agent-app.access` + live stats (assigned count, collected today, cash in hand, last location) |
| GET | `/assignable-invoices` | collections.view | Invoices with outstanding > 0, filters: `search, customerId, unassignedOnly, overdueOnly, page, pageSize` → each with `outstanding`, `paid`, `currentAssignment` |
| POST | `/assignments` | collections.assign | `{ salesInvoiceIds: string[], agentUserId, targetDate?, priority?, instructions? }` bulk; re-assigns if an active assignment exists (cancels old) |
| GET | `/assignments` | collections.view | filters `agentUserId, status, customerId, fromDate, toDate, search, page, pageSize` |
| GET | `/assignments/:id` | collections.view | with invoice, customer, records, visits |
| PATCH | `/assignments/:id` | collections.edit | targetDate, priority, instructions, status (UNCOLLECTED/CANCELLED) |
| DELETE | `/assignments/:id` | collections.delete | cancel (soft: isActive=false, status CANCELLED) |
| GET | `/records` | collections.view | filters `agentUserId, status, method, fromDate, toDate, search, page` |
| GET | `/records/:id` | collections.view | |
| POST | `/records/:id/verify` | collections.verify | status VERIFIED |
| POST | `/records/:id/reject` | collections.verify | `{ reason }` → reverse: remove payments JSON entry, delete SalesInvoicePayment, delete voucher, restore invoice status/outstanding, assignment amounts |
| GET | `/visits` | collections.view | filters agentUserId, outcome, fromDate, toDate |
| GET | `/deposits` | collection-deposits.view | |
| POST | `/deposits/:id/accept` | collection-deposits.accept | marks ACCEPTED, links PENDING cash records of that agent up to the amount (FIFO) |
| POST | `/deposits/:id/reject` | collection-deposits.accept | `{ reason }` |
| GET | `/summary` | collections.view | KPIs: assigned total/outstanding, collected today/MTD, pending verification count+amount, cash in hand total, PTP due today, agents active |
| GET | `/agents/:agentUserId/performance` | collections.view | `fromDate,toDate`: collected, visits, success rate, avg per day, daily series |
| POST | `/notify/:agentUserId` | collections.assign | `{ title, body }` → Expo push to agent devices |

### 3.2 Agent app: `/api/agent` (file `collections/agent-app.routes.ts`, requires `collection-agent-app.access` or super admin)
| Method | Path | Notes |
|---|---|---|
| GET | `/me/summary` | today: assigned count, outstanding, collected today amount/count, visits today, cash in hand, pending deposits, PTP due today |
| GET | `/assignments` | active assignments for me. query `status, search, sort=due|priority|amount|nearby&lat&lng`. Each: assignment + invoice (`invoiceNo, invoiceDate, dueDate, grandTotal, paid, outstanding, items[]`) + customer (`firmName, displayName, phones[], addresses[] with lat/lng if any, gstin`) + `lastVisit`, `promise` |
| GET | `/assignments/:id` | full detail incl. records & visits for this assignment |
| POST | `/collections` | multipart or JSON. body: `clientRef, assignmentId, amount, paymentMethod, referenceNumber?, chequeNumber?, chequeDate?, bankName?, collectedAt, latitude?, longitude?, locationAccuracy?, payerName?, notes?, deviceInfo?`; files `proof` (image), `signature` (image, optional). Idempotent on `clientRef` (returns existing). Validates amount ≤ outstanding+0.01. Returns record + updated assignment + receipt data |
| GET | `/collections` | my records, `fromDate,toDate,status,page` |
| GET | `/collections/:id/receipt` | JSON receipt (company, customer, invoice, amount in words) for share/print |
| POST | `/visits` | `clientRef, assignmentId, visitedAt, outcome, promisedDate?, promisedAmount?, notes?, latitude?, longitude?`; file `photo` optional |
| POST | `/locations` | batch `{ locations: [{ latitude, longitude, accuracy?, altitude?, speed?, heading?, batteryLevel?, isMoving?, source?, recordedAt }] }` → inserts breadcrumbs, upserts latest, emits socket `agent:location` |
| GET | `/deposits` / POST `/deposits` | `{ clientRef, amount, depositedAt, method, referenceNumber?, notes? }` file `proof` optional |
| POST | `/push-token` | `{ pushToken, platform, deviceName, appName }` |
| GET | `/history` | timeline of my records+visits+deposits, `fromDate,toDate` |
| GET | `/customers/:customerId/ledger` | outstanding invoices of that customer + recent receipts (agent can see full customer picture) |

### 3.3 Tracking: `/api/agent-tracking` (perm `agent-tracking.view`)
| GET | `/live` | all agents with `AgentLocationLatest`, online flag (recordedAt < 5 min), today's collected, assignments pending, current task (nearest pending assignment) |
| GET | `/agents/:agentUserId/history?date=YYYY-MM-DD` | breadcrumbs for that day (downsampled to ≤ 2000 pts) + stops (collections/visits with lat/lng) + distance km |
| GET | `/agents/:agentUserId/stops?fromDate&toDate` | |

Socket.IO events (server → clients): `agent:location { agentUserId, latitude, longitude, accuracy, speed, heading, batteryLevel, recordedAt, isMoving }`,
`collection:recorded { recordId, agentUserId, salesInvoiceId, amount }`, `collection:verified`, `collection:rejected`,
`assignment:created { agentUserId, count }`, `deposit:created`.
Existing events reused: `payment:created`, `voucher:created`, `accountLedger:updated`, `salesInvoice:updated`.

### 3.4 Insights: `/api/insights` (perm `insights-app.access` or super admin)
| GET | `/overview` | `{ sales: {today, yesterday, mtd, lastMtd, pctChange}, collections: {today, mtd, pendingVerification, cashInHand}, receivables: {totalOutstanding, overdue, aging: {0_30, 31_60, 61_90, 90_plus}, topDebtors[10]}, agents: {active, total, leaderboard[{agentUserId, name, collectedToday, collectedMtd, visitsToday, pendingAssignments}]}, ptp: {dueToday, overdue}, production: subset of getTvSummary (running machines, todays output) , generatedAt }` |
| GET | `/trends?days=30` | daily series `{ date, sales, collections, invoicesCount }` |
| GET | `/agents/live` | same as agent-tracking live (re-exported for the app) |
| GET | `/recent-activity?limit=30` | mixed feed: invoices created, collections recorded, deposits |

## 4. Money-recording rules (backend `collections.service.ts`)
Inside one `prisma.$transaction`:
1. Load assignment (must be active & belong to agent), invoice, customer. Compute `paid` = Σ payments JSON amounts; `outstanding = grandTotal − paid`. Reject if `amount > outstanding + 0.01`.
2. Generate `receiptNo`; create `CollectionRecord`.
3. Push `{ id: <uuid>, amount, paymentMethod: <"Cash" | "UPI" | "Cheque" | "Bank Transfer" | "Card" | "Other">, referenceNumber, paymentDate: YYYY-MM-DD, recordedBy: agentUserId, source: "AGENT_APP", collectionRecordId }` into `salesInvoice.payments` (parse with `extractPaymentsArray`). The `paymentMethod` string must contain "Cash" for cash so `postReceiptVouchersForSales` routes it to the CASH ledger.
4. Create `SalesInvoicePayment` row (`recordedBy`, `paymentDate`).
5. Update invoice `status`: `PAID` when outstanding − amount ≤ 0.01 else `PARTIALLY_PAID`.
6. `customer.outstandingAmount` decrement by amount (floor at 0).
7. Update assignment `amountCollected`, `status` (COLLECTED / PARTIALLY_COLLECTED), `lastVisitAt`; auto-create a `CollectionVisit` with outcome COLLECTED / PARTIAL_COLLECTED for the same clientRef suffix `-visit`.
After commit: `voucherPostingService.postReceiptVouchersForSales(invoiceId)` (try/catch, log), then store `voucherId` on the record by matching `refDocId` (use `deriveStablePaymentRefId` from `utils/payments.ts` — read it), emit sockets, send push? (no; admin side only).
Rejection reverses steps 3–7 and deletes the voucher whose `refDocType="SALES_PAYMENT"` & `refDocId` matches.

Images: use the existing `upload.middleware` (multer) + `uploadToImageKit` from `src/config/imagekit.ts` (folder `/collections/proofs`). If ImageKit env is missing, fall back to saving under `uploads/collections/` and returning `${BACKEND_URL}/uploads/collections/<file>`.

## 5. Web frontend (SunSea-Erp/frontend) — module layout
- `src/services/collectionsService.ts`, `src/services/agentTrackingService.ts` (axios via `apiClient`, same shape as `salesInvoiceService.ts`). Add endpoint keys to `src/api/config.ts`.
- `src/modules/collections/pages/`:
  - `CollectionAssignmentsPage.tsx` — `/collections/assignments`: two tabs: "Assign invoices" (assignable invoices table with checkboxes → assign modal: agent select, target date, priority, instructions) and "Assignments" (list w/ filters, status badges, reassign/cancel, detail drawer).
  - `CollectionRecordsPage.tsx` — `/collections/records`: verification queue + all records; row detail modal showing proof photo, map pin, cheque details; Verify / Reject (reason). "Read text from image" button using **tesseract.js** (free, in-browser) to extract text from the proof photo and pre-fill cheque no./amount fields for the verifier (never auto-submits).
  - `CollectionAgentsPage.tsx` — `/collections/agents`: agent cards (assigned, collected today, cash in hand, online/last seen) → agent performance drill-down (charts w/ recharts).
  - `CollectionDepositsPage.tsx` — `/collections/deposits`: accept/reject.
  - `CollectionsDashboardPage.tsx` — `/collections`: KPI tiles from `/collections/summary`, PTP due today, recent activity.
- `src/modules/agent-tracking/pages/LiveMapPage.tsx` — `/agent-tracking/live`: Leaflet map (leaflet is already a dependency; OSM tiles), one marker per agent (online = green, stale = grey), popup with name/phone/last seen/speed/battery/today's numbers, side panel list with search; live updates via socket `agent:location`; click agent → today's trail polyline + stop markers (`/agents/:id/history`), date picker for past days, "follow" toggle. `AgentHistoryPage.tsx` optional.
- Sales invoice list (`SalesInvoiceList.tsx`): add "Agent" column (current assignment agent name/status) and an "Assign agent" row action (permission `collections.assign`) opening the same assign modal.
- Sidebar (`sidebar.data.ts`): new group **Collections** with items Dashboard, Assignments, Records/Verification, Deposits, Agents, Live Map (permissions as above). Routes in `AppRoutes.tsx` via `ProtectedRoute permission=...`.
- Socket: existing `socket.io-client`; find the existing socket hook/provider in `src` and reuse it.

## 6. Mobile apps (this repo) — Expo + TypeScript
Two independent Expo apps (each with its own `package.json`; no workspace hoisting so Metro stays simple):
- `apps/collection-agent` — Expo Router, React Native, TypeScript, `expo-location` (+ `expo-task-manager` background task), `expo-camera`/`expo-image-picker`, `expo-notifications`, `react-native-maps`, `@react-native-async-storage/async-storage`, `@tanstack/react-query`, `axios`, `expo-secure-store` (token), `react-native-signature-canvas` (optional, via WebView), `expo-sharing`/`expo-print` for receipt PDF (local, free).
  Screens: Login · Home (today KPIs, sync status, tracking toggle) · Assignments (list, filters, sort by due/priority/nearby, search) · Assignment detail (invoice items, outstanding, customer contact: call / WhatsApp / navigate via `Linking`, ledger) · Record Collection (amount w/ "full outstanding" shortcut, method, refs, cheque fields, proof photo, signature, GPS captured automatically) · Visit Outcome · History · Deposits (list + new) · Receipt view/share (expo-print → PDF) · Profile/Settings (tracking on/off, offline queue, logout).
  Offline: every POST (collections, visits, deposits, locations) is queued in AsyncStorage with a `clientRef` (uuid) and replayed FIFO when online (NetInfo). Location pings buffer and flush every 30s / 20 points.
  Tracking: `Location.startLocationUpdatesAsync` with `Accuracy.BestForNavigation`/`High`, `distanceInterval: 15m`, `timeInterval: 15s`, `foregroundService` notification on Android; `Accuracy.Balanced` when idle. Permissions: foreground + background ("Always"). `app.json` must include iOS `NSLocationAlwaysAndWhenInUseUsageDescription`, `UIBackgroundModes: [location]`, Android `ACCESS_BACKGROUND_LOCATION`, `FOREGROUND_SERVICE_LOCATION`.
- `apps/insights` — Expo Router, read-only: Login · Overview (KPI tiles, sales vs collections 30-day chart via `react-native-svg` + `victory-native` or a hand-rolled SVG chart, receivable aging bars, top debtors) · Agents (leaderboard + live map with react-native-maps) · Activity feed · Settings. Auto-refresh every 60 s + pull-to-refresh.
- Shared conventions: `EXPO_PUBLIC_API_URL` env (e.g. `https://api.example.com/api`), axios client attaches `Authorization: Bearer`, 401 → logout. Store the token in `expo-secure-store`.

## 7. Nice-to-haves implemented where cheap
- Promise-to-pay follow-ups (PTP due today list for agent + admin).
- Route planning: "nearby" sort using haversine on customer address lat/lng when available; else by pincode/city grouping.
- Receipt numbering + shareable receipt (PDF on device, WhatsApp share via Linking).
- Cash-in-hand reconciliation via deposits.
- Push notification to agent on new assignment (Expo push, free).
- Agent performance leaderboard.
