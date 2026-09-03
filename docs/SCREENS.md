# Wireframe → implementation

Reference: *SUN SEA ERP – Mobile App Wireframe (Collection Agent)*.

| # | Wireframe screen | Implementation | Notes |
| - | ---------------- | -------------- | ----- |
| 1 | Login | `LoginScreen` | Username/email + password against `/api/auth/login`. "Remember me" is implicit: the token is kept in secure storage for the session's 7-day life. Server URL editable via *Server settings*. |
| 2 | Dashboard | `DashboardScreen` | Planned visits / completed (today's `visits`), collections today (sum of today's local `collections`), new orders today. Quick actions. Last-sync + online/offline footer. |
| 3 | Route & Visit Plan | `RoutePlanScreen` | Day navigator, timeline of visits (planned time or check-in time), status pill, *Skip*. *Start Navigation* opens Maps for the next pending stop. Visits come from office planning or auto-generated from the agent's route for that weekday. |
| 4 | Customer Visit Summary | `CustomerDetailScreen` | Outstanding (ledger balance), last collection, open invoices with due dates, call / WhatsApp / navigate, check-in & complete visit, *Collection* / *New Order* footer. |
| 5 | Invoice-wise Collection Entry | `CollectionEntryScreen` | Select invoices (Select All), editable amount per invoice (defaults to balance), optional on-account amount, running total, over-allocation guard, *Proceed to Payment*. |
| 6 | Payment Mode Selection | `PaymentModeScreen` | Cash / Cheque / UPI / NEFT radio list. |
| 7A | Cash Payment | `CashPaymentScreen` | Amount received (partial payments rebalance the last invoice), receipt photo (camera or gallery, downscaled JPEG), remarks. |
| 7B | Cheque Payment (OCR) | `ChequePaymentScreen` | Photo of cheque front → `/ocr/cheque` auto-fills bank, cheque no, date, amount, drawer with confidence badge and warnings; manual entry offline. |
| 7C | UPI Payment | `UpiPaymentScreen` | Amount, UPI transaction ID (or UTR for NEFT), optional screenshot. |
| 8 | Collection Success | `CollectionSuccessScreen` | Amount, mode, reference, date/time, invoices applied; badge shows *Saved offline* → *Posted · MC-2026-00012* once the sync returns. *Done* returns to the tabs. |
| 9 | New Sale Order – Item Entry | `NewOrderScreen` | Product search, quantity stepper, customer-grade pricing, running totals. |
| 10 | New Order – Review | `OrderReviewScreen` | Line review, estimated total, credit-limit warning, remarks, *Submit Order* (creates a Draft Order in the ERP by default). |
| 11 | Customer Outstanding View | `OutstandingScreen` | Total outstanding, ageing buckets 0-30 / 31-60 / 61-90 / 90+, invoice list, ERP receipt history when online. |
| 12 | Offline Mode Indicator | `OfflineBadge` in every header + dashboard footer | Uses NetInfo; unsynced counts on the Sync tab badge. |
| 13 | Sync Status | `SyncStatusScreen` | Progress (uploading photos / data / downloading), per-type counters, *Sync Now*, *Full refresh*, last upload result, *Needs attention* list for records the ERP rejected. |
| – | Customers | `CustomersScreen` | Search any customer (name, code, city, mobile) to start an unplanned visit / order. |
| – | Settings | `SettingsScreen` | Signed-in agent, server URL, log out, clear local data. |

## v1.1 additions (beyond the wireframe)

| Screen | Implementation | Purpose |
| ------ | -------------- | ------- |
| Home (redesigned) | `DashboardScreen` | Greeting + day status, target rings (collections / sales / visits), today's numbers, next visit card with navigate / collect / order, follow-ups due, quick actions |
| Follow-ups tab | `FollowUpsScreen` | Due / upcoming / history; call, collect, reschedule, done |
| Log follow-up | `FollowUpLogScreen` | Promise to pay, callback, dispute, no action; reason codes; quick dates; promised amount |
| Cash & day | `DayScreen` | Start / end day with GPS, cash in hand, handovers today, end-of-day summary |
| Cash handover | `HandoverScreen` | Office cash or bank deposit with slip photo |
| Cheque register | `ChequesScreen` | Due today, post-dated, ready for deposit |
| Expense claims | `ExpensesScreen`, `ExpenseNewScreen` | Category chips, bill photo, approval status |
| New outlets | `LeadsScreen`, `LeadNewScreen` | Capture shop, contact, GPS, photo; becomes a Lead customer |
| My performance | `PerformanceScreen` | Targets vs pace, 7-day collections, by mode, productivity, promises kept |
| More | `MoreScreen` | Hub for the above plus sync and settings |
| Customer 360 | `CustomerDetailScreen` | Tabs: Overview (credit status, visit, open follow-ups, quick actions), Invoices (overdue tags, send invoice), Orders (ERP history + repeat), Activity |

## App flow (wireframe section 1)

Login → Dashboard → Route / Visits → Customer Visit → Collection Entry
(→ Payment mode → capture → Success) or New Sale Order (→ Review → Success)
→ Sync (auto) → Outstanding / Sync status.

## Key features (wireframe footer) — where they live

| Feature | Where |
| ------- | ----- |
| Field Collections + New Sale Orders | `data/actions.ts`, posted by `mobile.collection.service.ts` / `mobile.order.service.ts` |
| Route & Visit Planning | `mobile.visit.service.ts` (+ admin endpoints), `RoutePlanScreen` |
| Invoice-wise Collection Entry | `CollectionEntryScreen`, allocations JSON |
| Cash / Cheque / UPI / NEFT | payment screens; Cash → `CASH-001`, others → `BANK-001` |
| Cheque OCR Scan (AI, auto-fill) | `mobile.ocr.service.ts` (Claude vision, strict JSON) |
| Cash Receipt Photo + S3 store | `PhotoBox`, `mobile.attachment.service.ts` (S3 or ImageKit) |
| Full Offline Mode (WatermelonDB) | `db/`, `sync/` |
| Auto Background Sync on Network | `SyncProvider` (NetInfo, AppState, interval, on-change) |
| Customer Outstanding View | `OutstandingScreen`, `utils/aging.ts` |
| Secure, Fast & Reliable | ERP JWT + role permissions, secure token storage, idempotent UUID pushes, transactional posting |
