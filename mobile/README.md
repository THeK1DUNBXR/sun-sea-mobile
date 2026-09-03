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
