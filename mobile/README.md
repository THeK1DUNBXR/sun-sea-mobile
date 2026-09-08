# Sun Sea Field — sales executive mobile app

React Native (Expo SDK 57) + WatermelonDB, offline-first. Talks only to the
existing Sun Sea ERP backend through the `/api/mobile` module in
[`../backend-extension`](../backend-extension).

## What the agent can do

| Screen (wireframe #)          | File                                   | Works offline |
| ----------------------------- | -------------------------------------- | ------------- |
| 1 Login                       | `src/screens/LoginScreen.tsx`          | needs network once; data survives re-login |
| 2 Dashboard                   | `src/screens/DashboardScreen.tsx`      | yes |
| 3 Route & visit plan          | `src/screens/RoutePlanScreen.tsx`      | yes (plan is pulled; check-in/skip queued) |
| 4 Customer visit summary      | `src/screens/CustomerDetailScreen.tsx` | yes |
| 5 Invoice-wise collection     | `src/screens/CollectionEntryScreen.tsx`| yes |
| 6 Payment mode                | `src/screens/PaymentModeScreen.tsx`    | yes |
| 7A Cash + receipt photo       | `src/screens/CashPaymentScreen.tsx`    | yes (photo uploads on sync) |
| 7B Cheque + OCR               | `src/screens/ChequePaymentScreen.tsx`  | capture yes; OCR auto-fill needs network |
| 7C UPI / NEFT                 | `src/screens/UpiPaymentScreen.tsx`     | yes |
| 8 Collection success          | `src/screens/CollectionSuccessScreen.tsx` | yes (shows receipt no once posted) |
| 9 New order – item entry      | `src/screens/NewOrderScreen.tsx`       | yes (grade pricing from cached product master) |
| 10 Order review               | `src/screens/OrderReviewScreen.tsx`    | yes |
| 11 Customer outstanding view  | `src/screens/OutstandingScreen.tsx`    | ageing offline; ledger history online |
| 12 Offline indicator          | `src/components/Screen.tsx` (`OfflineBadge`) | — |
| 13 Sync status                | `src/screens/SyncStatusScreen.tsx`     | — |
| Customers (search)            | `src/screens/CustomersScreen.tsx`      | yes |
| Settings (server URL, logout) | `src/screens/SettingsScreen.tsx`       | yes |

## Connecting to the Railway backend (v1.2)

The Sun Sea ERP backend runs on Railway at
`https://sunseaerp-production.up.railway.app/api`, and that address is baked into
the build as the default. On the login screen tap **Connect to server** (or
Settings → server row) to change it, then **Test connection**. The app:

1. normalises whatever is pasted (`sunseaerp-production.up.railway.app`,
   with or without `https://` and `/api`);
2. probes the API root, retrying while a sleeping Railway service wakes up,
   and shows the ERP version, environment and response time;
3. detects the **integration mode**:

| Mode | When | What syncs |
| ---- | ---- | ---------- |
| **Mobile extension** | `/api/mobile/*` exists (backend-extension applied) | Everything: routes, visits, collections with receipt/cheque photos, cheque OCR, statements |
| **Direct ERP** | plain ERP (the Railway deployment today) | Customers, invoices and products are pulled from the ERP's own endpoints. Collections post as **RECEIPT vouchers** (Cash / Bank ledger ← customer ledger, tagged `MOBILE_COLLECTION:<id>` so a retry never double-posts). Orders post as **DRAFT sales orders** with the agent as source. Routes, follow-ups, day sessions, expenses, outlets and photos stay on the phone. |

In direct mode invoice balances are reconciled to the customer's ledger balance
(oldest invoice first), because a receipt voucher reduces the ledger but not the
invoice's own payment list. Idle Railway services answer the first request
slowly or with 502/503; the HTTP client retries GETs twice and the sync screen
shows the outcome.

Backend prerequisites on Railway: `DATABASE_URL`, `JWT_ACCESS_SECRET`,
`FRONTEND_URL`, `BACKEND_URL` set; the service listens on Railway's `PORT`; the
agent's ERP user needs `customers.view`, `sales-invoices.view`,
`products.view`, `vouchers.create` and `sales-orders.create`.

## Live location on the web map (v1.3)

While the agent's day is open the app shares the phone's position with the
office, so the **Field Sales** scene of the ERP TV dashboard shows where each
agent is instead of the simulated dots.

- **What is sent**: a ping every 2 minutes or 120 m (foreground, balanced
  accuracy), plus a tagged position at *Start day*, *Check in*, *Check out*
  and *End day*. Each carries accuracy, speed, heading and battery.
- **When**: only while signed in to a live server, the day session is open and
  the *Share my location with the office* switch (Settings) is on. Nothing is
  sent in demo mode. Tracking stops at *End day* and on log-out.
- **How**: positions queue on the phone and post in batches to
  `POST /api/field/positions`; queued positions also flush after every sync.
  If the server answers 404 (module not installed) the app pauses, keeps the
  newest 50 and re-checks every 6 hours. A location pin appears in the day
  pill on the dashboard while sharing is active.
- **Server side**: install the Field GPS module from `backend-extension/`
  (`node backend-extension/scripts/apply-field-gps.js <path-to-sunsea-main>`,
  then `npx prisma migrate dev -n field_gps` and redeploy to Railway). See
  `backend-extension/README.md` → *Field GPS module*.

## What's new in v1.1

Designed from the ERP's own capabilities and field-sales best practice (see
[`../docs/RESEARCH.md`](../docs/RESEARCH.md)):

| Feature | Where |
| ------- | ----- |
| Start day / End day with GPS, attendance-style timestamps and an end-of-day summary (cash by mode, visits, orders, expenses) | More → Cash & day |
| Cash in hand, handover to office / bank deposit with slip photo | More → Cash handover |
| Follow-ups & promise-to-pay with reason codes, quick dates, reminders, reschedule, broken-promise detection | Follow-ups tab, customer → Follow-up |
| Digital receipt to the customer on WhatsApp / share sheet (works offline) | Collection success |
| Send invoice PDF on WhatsApp (ERP WhatsApp service; simulated in demo) | Customer → Invoices |
| Cheque register with post-dated cheques due | More → Cheque register |
| Customer 360: credit status (limit, exposure, overdue days, hold/blocked), invoices with overdue tags, ERP order history, activity timeline | Customer detail tabs |
| Repeat last order, frequently bought, category chips, stock on hand, minimum qty, credit check before submit | New order / review |
| Monthly targets with progress rings, pace vs month, 7-day chart, collections by mode, visit productivity, promises kept | Home, Performance |
| Field expense claims with bill photo | More → Expense claims |
| New outlet (lead) capture with GPS and shop photo | Customers → New outlet |
| Customer filters (today's route, overdue, on hold, leads) and sort by outstanding | Customers |
| App lock with device biometrics / PIN | Settings |
| Field-ready UI: 48 dp touch targets, 16 px body text, high contrast, haptics, pull-to-refresh sync, toasts, tappable sync pill | everywhere |

## Prototype / demo mode

The login screen has **Explore the demo (no server needed)**. It seeds the
on-device database with sample data (8 Chennai customers, open and settled
invoices, a route with today's and tomorrow's visits, the product catalogue,
earlier collections and a draft order) and marks the session as demo:

* every screen works exactly as it will against the ERP;
* "sync" is simulated on the device — new collections and orders receive
  receipt / order numbers after a short delay;
* cheque OCR returns a simulated result (flagged as such);
* nothing is sent to any server. *Exit demo* in Settings wipes the sample data.

## Project layout

```
src/
  api/          axios client (token, 401 handling) + typed /api/mobile calls
  auth/         AuthContext — login, bootstrap, device switch protection
  db/           WatermelonDB schema, models, database, observable hooks
  data/         actions.ts — every write the agent can make (offline-safe)
  sync/         sync.ts (attachments → push → pull → prune) + SyncProvider (auto-sync)
  navigation/   stack + tabs, typed params
  screens/      one file per wireframe screen
  components/   Screen wrapper, form + list primitives, PhotoBox
  utils/        money/date formatting, grade pricing, ageing, photo capture
  __tests__/    pure-logic unit tests (jest-expo)
```

## Run it

```bash
cd mobile
npm install
cp .env.example .env            # set EXPO_PUBLIC_API_URL to your backend, e.g. http://192.168.1.10:5000/api
npx expo prebuild               # generates android/ and ios/ with the WatermelonDB JSI plugin
npx expo run:android            # or: npx expo run:ios
```

WatermelonDB is a native module, so **Expo Go will not work** — use the dev
client that `expo run:*` builds (or an EAS development build). The server URL
can also be changed at runtime from *Settings* on the login screen.

Checks:

```bash
npm run typecheck   # tsc --noEmit
npm test            # jest
```

## How sync works

* All reads come from the local SQLite database, so every screen is instant
  and works without signal.
* Writes (`src/data/actions.ts`) only touch the local DB. Each record gets a
  UUID on the device; the server treats that id as an idempotency key, so a
  retried push never posts a collection twice.
* `SyncProvider` runs `runSync()` when the app comes to the foreground, when
  connectivity returns, every 5 minutes, and ~1.5 s after anything new is
  captured. The Sync tab shows progress and lets the agent force a full refresh.
* `runSync()` = upload pending photos → WatermelonDB `synchronize()`
  (push device changes, pull server changes) → prune route tables → stamp
  last-sync time. A collection is not pushed until its photos are uploaded, so
  the ERP always receives complete records.
* The server echoes back results on the next pull: receipt numbers, ERP order
  numbers/status, and any `FAILED` records with the reason (shown on the Sync
  tab under *Needs attention*; the office re-posts them from the ERP).
* Balances shown on the device are the ERP ledger figures from the last pull,
  adjusted optimistically for collections captured since; the next pull
  replaces them with the server's numbers.

## Config

| Setting                    | Where                                  |
| -------------------------- | -------------------------------------- |
| API base URL               | `EXPO_PUBLIC_API_URL` → `app.json` `extra.apiUrl` → Settings screen override |
| Auto-sync interval, photo size | `src/config.ts` |
| Bundle ids / permissions   | `app.json` |
