# Sun Sea ERP — Mobile (Sales Executive / Collection Agent)

A spin-off mobile app for the field team of **Sun Sea ERP**. Sales executives
plan their route, visit customers, collect payments against invoices (cash,
cheque with OCR, UPI, NEFT), photograph receipts and cheques, and book new sale
orders — fully offline — and everything lands in the existing web ERP as if it
had been entered there.

This repository contains two deliverables:

| Folder | What it is |
| ------ | ---------- |
| [`mobile/`](mobile) | The React Native (Expo SDK 57) + WatermelonDB app. Offline-first, auto-sync. |
| [`backend-extension/`](backend-extension) | A drop-in `/api/mobile` module for the existing `sunsea-main/backend` (Express + Prisma): sync endpoints, collection posting into invoices + ledgers, order creation, photo storage, cheque OCR, route/visit planning for the office. |

The web application itself is **not** changed beyond applying the extension
(new tables, one new permission module, one router mount). Field data appears
in the web app's existing screens: Sales Invoices (payments), Accounts →
Receivable / Vouchers (RECEIPT vouchers), Customers (outstanding), Draft
Orders / Sales Orders.

## How data flows

```
 ┌──────────────── mobile (offline-first) ────────────────┐        ┌──────── Sun Sea ERP backend ────────┐
 │ WatermelonDB (SQLite)                                   │        │ /api/mobile (backend-extension)      │
 │  customers · invoices · products · routes  ◀── pull ────┼────────┼── receivable ledger balances          │
 │  visits · collections · orders · photos    ── push ────▶│        │  ├ sales_invoices.payments += …       │
 │                                                         │        │  ├ sales_invoice_payments             │
 │  auto-sync: foreground, network back, 5 min, on change  │        │  ├ RECEIPT vouchers (cash/bank ↔ cust)│
 └─────────────────────────────────────────────────────────┘        │  ├ customers.outstandingAmount        │
                                                                    │  └ sales_orders (salesOrderService)   │
                                                                    │ socket.io events → web screens refresh│
                                                                    └───────────────────────────────────────┘
```

## Two apps

| App | Folder | For | APK releases |
| --- | ------ | --- | ------------ |
| **Sun Sea Field** | `mobile/` | Sales executives / collection agents — enter collections, orders, visits, follow-ups, expenses, new outlets (offline-first) | tags `apk-v…` |
| **Sun Sea Insights** | `founder/` | The founder — read-only monitoring of sales, collections, receivables, field team, plant and everything needing a decision | tags `insights-v…` |

## Try the prototype without a server

Install the latest APK from [Releases](https://github.com/THeK1DUNBXR/sun-sea-mobile/releases)
and tap **Explore the demo (no server needed)** on the login screen. The app
loads sample customers, invoices, a route plan and products onto the device and
simulates sync, so the whole flow (route → visit → collection → payment → sync
status, new order, outstanding ageing) can be walked through offline.

## Quick start

1. **Backend** — apply the extension to your `sunsea-main/backend` checkout and migrate:
   ```bash
   node sun-sea-mobile/backend-extension/scripts/apply-schema.js sunsea-main/backend
   cd sunsea-main/backend && npm install @anthropic-ai/sdk && npx prisma migrate dev --name mobile_app && npm run dev
   ```
   Then, in the web app, create a role (e.g. *Sales Executive*) with
   `mobile-app.view` + `mobile-app.create`, assign it to the field users, and
   (optionally) set up routes via the `/api/mobile/admin/*` endpoints.
   Details: [backend-extension/README.md](backend-extension/README.md).

2. **Mobile** — build the dev client and point it at the backend:
   ```bash
   cd sun-sea-mobile/mobile && npm install
   echo 'EXPO_PUBLIC_API_URL=http://<backend-host>:5000/api' > .env
   npx expo prebuild && npx expo run:android   # or run:ios
   ```
   Details: [mobile/README.md](mobile/README.md).

## What the prototype covers (v1.1)

Beyond the wireframe's 13 screens, v1.1 adds the working practices that
field-sales and collections teams rely on, each grounded in what the Sun Sea ERP
already records: day start/end and cash-in-hand control, cash handover and bank
deposit, promise-to-pay follow-ups with reminders, digital receipts on WhatsApp,
invoice PDF sharing, a post-dated cheque register, a customer 360 with credit
status and order history, repeat/frequent orders with stock and minimum-quantity
checks, targets and performance, expense claims, new-outlet capture, and an app
lock. Details and sources: [docs/RESEARCH.md](docs/RESEARCH.md).

## Documentation

* [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — design decisions, sync protocol, posting rules, security model.
* [docs/API.md](docs/API.md) — `/api/mobile` endpoint and wire-format reference.
* [docs/SCREENS.md](docs/SCREENS.md) — wireframe → screen mapping with behaviour notes.

## Status / verification

* `backend-extension` compiles cleanly (`tsc --noEmit`) against the current `sunsea-main/backend`; Prisma schema validates after `apply-schema.js`.
* `mobile` passes `npm run typecheck` and `npm test`.
* Native builds (`expo run:*`) and end-to-end sync against a live database were **not** run in this environment — see the checklist in `docs/ARCHITECTURE.md` → *Before first rollout*.
