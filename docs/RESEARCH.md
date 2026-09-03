# Research: what makes a field sales & collection app effective

Two inputs shaped v1.1 of the Sun Sea Field app: (1) what the Sun Sea ERP
already does, so the mobile app multiplies its use instead of duplicating it,
and (2) how established field-sales / collections products approach the same
job.

## 1. What the Sun Sea ERP does today (and what the field team can feed)

| ERP module (web) | Capability | How the mobile app now uses it |
| ---------------- | ---------- | ------------------------------ |
| Customers | Codes, grades (price lists), types, credit limit + credit days, status `Active / OnHold / Blocked / Lead / Inactive`, addresses, transports, GSTIN, ledger balance | Customer 360 with credit status; **lead capture** creates the customer as `Lead` for the office to activate |
| Sales Orders | Full workflow (`DRAFT → CONFIRMED → … → DISPATCHED → INVOICED`), order source tracking (`SALES_PERSON` + employee), credit check (`limit`, overdue invoices, pending approvals) | Orders land as Drafts with the agent as source; **order history per customer**, **repeat last order**, **frequently bought**; credit-check warnings mirror the ERP rule |
| Products | Grade rates, categories, images, minimum qty, finished-goods stock per store | Catalogue shows **image, category filter, stock on hand, minimum qty**; grade pricing |
| Sales Invoices | Payments JSON + payment rows, `PAID` status, due dates, **WhatsApp / e-mail of the invoice PDF** | Invoice-wise collections; **send the invoice PDF to the customer on WhatsApp** from the visit |
| Accounts → Receivable / Vouchers | Ledger balances, ageing, RECEIPT vouchers, collection history | Outstanding + ageing offline; ledger history online; every collection posts receipt vouchers |
| Expenses / Petty cash | Expense records with categories, payment method, receipts, auto vouchers | **Field expense claims** with receipt photo, approved by the office into Expenses |
| Payroll → Attendance | `attendance_records` per employee/day | **Start day / End day** marks attendance for the agent's employee record |
| WhatsApp service | Text + document messages via WhatsApp Cloud API | Invoice PDF sharing; receipts shared via the phone's WhatsApp |
| Dashboard / Reports | Sales order report, recent orders | Agent targets + MTD performance on the mobile dashboard |

Gaps the ERP has that the field app closes: there was no notion of a route,
visit, follow-up (promise to pay), cash handover, daily attendance from the
field, or agent targets. These are new tables in `backend-extension`.

## 2. What the market does

Sources (summaries via web search; several vendor sites are not reachable from
the build environment):
[Pepup Sales – top field sales apps](https://www.pepupsales.com/blog/top-10-field-sales-apps/),
[SalesDiary](https://salesdiary.com/),
[Bridgesuite – FFM for FMCG](https://www.bridgesuite.ai/field-force-management-software-for-fmcg-features-benefits-and-comparison/),
[Delta Sales App – FMCG field sales software](https://deltasalesapp.com/blog/best-field-sales-software),
[SalesTrendz – SFA for distributors](https://www.salestrendz.com/best-sales-force-automation-software/),
[BeatRoute – van sales](https://beatroute.io/platform/van-sales-automation-software/),
[FieldAssist – van sales](https://www.fieldassist.com/van-sales-automation-software),
[RouteMagic – van sales / DSD](https://www.routemagic.app/solutions/van-sales/),
[LeanPay – promise to pay](https://www.leanpay.io/en/blog/promise-to-pay),
[CollectPro – payment collection best practices](https://collectpro.app/best-practices-for-payment-collection/),
[Versapay collections](https://www.versapay.com/solutions/collections),
[PhonePe – digital receipts](https://business.phonepe.com/articles/what-is-a-payment-receipt-how-to-generate-digital-receipts-for-business),
[Google Open Health Stack – offline & sync design](https://developers.google.com/open-health-stack/design/offline-sync-guideline),
[LeanCode – offline app design](https://leancode.co/blog/offline-mobile-app-design),
[WizyVision – apps for field work](https://wizyvision.com/blog/how-to-design-mobile-apps),
[AlterSquare – field usability](https://altersquare.io/mobile-first-design-for-construction-management-software-field-usability-guide/).

Recurring patterns across Indian SFA/DMS products (Bizom, FieldAssist,
SalesDiary, BeatRoute, Delta) and collections tools:

1. **Beat / route discipline** — day start (attendance), planned outlets in
   sequence, check-in with GPS, productive vs unproductive visit, reason codes.
2. **Order taking aids** — suggested / repeat orders from history, schemes,
   stock visibility, minimum quantities, credit checks before booking.
3. **Collections discipline** — invoice-wise allocation, multiple modes, instant
   digital receipt to the customer (WhatsApp), **promise-to-pay with a date and
   reminders**, treating a broken promise as a risk signal, reason codes for
   non-payment.
4. **Cash control** — end-of-day cash in hand, cheque (incl. post-dated)
   register, deposit / handover with proof, reconciliation against the ERP.
5. **Targets & nudges** — daily/monthly targets, progress, "what to do next".
6. **Customer 360 at the doorstep** — outstanding, ageing, last orders, last
   payments, disputes, contact actions.
7. **Offline-first UX** — cache-first reads, optimistic writes, explicit
   pending/synced/failed states, progress rather than spinners, retry paths.
8. **Field-ready UI** — large touch targets (≥48 dp), 16–18 px body text, high
   contrast for sunlight, one primary action per screen, minimal typing.

## 3. What v1.1 adds (mapped to the above)

| # | Feature | Pattern | ERP tie-in |
| - | ------- | ------- | ---------- |
| 1 | **Start day / End day** with GPS and an end-of-day summary (cash in hand by mode, cheques, visits, orders) | 1, 4 | `attendance_records` (Present) via the agent's employee |
| 2 | **Cash handover / bank deposit** with slip photo, office confirmation | 4 | CONTRA voucher (Cash → Bank) when the office confirms a deposit |
| 3 | **Follow-ups & promise-to-pay** — reason codes when nothing is collected, promised amount/date, due list on the dashboard, broken-promise flag | 3 | Visible to the office in the collections register |
| 4 | **Digital receipt sharing** — text receipt to the customer's WhatsApp / share sheet, offline | 3 | Receipt no. from the ERP once synced |
| 5 | **Send invoice PDF on WhatsApp** from the visit | 3, 6 | ERP WhatsApp service + invoice template |
| 6 | **Post-dated cheque register** with due-soon flags | 4 | Cheque metadata on collections |
| 7 | **Customer 360** — credit status (limit, exposure, overdue, hold), order history with ERP status, last payments, activity | 6 | Sales orders, invoices, vouchers |
| 8 | **Repeat last order / frequently bought**, product images, category chips, stock on hand, minimum qty, credit-check warning before submit | 2 | Products, finished-goods stock, credit check rule |
| 9 | **Targets & MTD performance** rings on the dashboard | 5 | Office-set targets per agent (new admin endpoint) |
| 10 | **Field expense claims** with receipt photo | 1, 4 | Approved into ERP Expenses |
| 11 | **New customer (lead) capture** with GPS and photo | 1, 6 | Customer created as `Lead` |
| 12 | **Customer filters & sorting** — overdue, on today's route, on hold/blocked, by outstanding | 6, 8 | — |
| 13 | **UI refresh for the field** — 48 dp targets, larger type, progress rings, bottom action bars, haptics, pull-to-refresh sync, toasts, richer empty/pending/failed states | 7, 8 | — |
| 14 | **App lock** (device biometrics / PIN) for a device that carries cash data | — | — |

Deferred (candidates for v1.2): sales-return / damage requests, dispatch
tracking per order, schemes & promotions (the ERP has no scheme master yet),
Tamil localisation, manager view.
