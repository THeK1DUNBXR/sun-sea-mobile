# Sun Sea Insights — founder's monitoring app (prototype)

A read-only Android/iOS app for the founder, styled after the ERP's **Management
TV Dashboard** (`frontend/src/modules/dashboard/tv`): near-black board with CRT
scanlines, monospace tabular numbers, a blinking LIVE badge and clock, an
attention banner, a scrolling ticker, coloured-rail KPI cards with count-up
numbers, glowing gauges, threshold-coloured bar rows, giant pipeline tiles and
red-bordered attention panels. Dark by default with a light mode toggle. No data
entry. Signs in to the Railway-hosted ERP for live figures, or runs on a seeded
demo dataset.

| Tab | What it shows |
| --- | ------------- |
| **Overview** | Today / this month / last 30 days: invoiced sales, collections, orders, receivables (with DSO); 14-day sales vs collections; field collections vs target and pace; the top items needing attention; cash position (bank + cash, cheques and post-dated cheques, cash still with agents); plant output today |
| **Sales** | Invoiced per day, order pipeline (draft → MD approval → confirmed → production → dispatched → invoiced), sales by category, top products, top customers, dormant customers |
| **Receivables** | Total outstanding, overdue, DSO, collected MTD; ageing buckets; collections by mode; top debtors with limit / hold / blocked flags; at-risk customers |
| **Field team** | Collected today, visits vs plan, MTD vs target, cash with agents; agents ranked by achievement with sync and attendance flags; agent drill-down with today's route |
| **Operations** | Production plan progress per line, finished goods below minimum, raw materials vs reorder level, dispatch queue (gate / store approvals), open purchase orders, expenses vs budget by category, top products by volume |
| **Needs attention** | Orders awaiting MD approval, credit breaches, unconfirmed cash handovers, promises due, post-dated cheques, stock-outs, dispatch and purchase delays — each with severity, age and amount |

Every figure maps to an ERP source (sales orders, sales invoices, vouchers,
production plans, finished-goods and raw-material stock, purchase orders, goods
dispatches, expenses) or to the field-app sync tables (visits, collections,
follow-ups, day sessions, handovers). Connecting it to the live ERP means adding
one read-only aggregation endpoint per tab; the prototype ships with a seeded
dataset (`src/data/demo.ts`) so it can be evaluated without a server.

## Live data: how it is fetched (v0.5)

v0.5 rebuilt the live-data path after the first field test:

- **Regular refresh.** Figures re-pull every 60 s while the app is on screen,
  immediately when you come back to the app after 45 s away, and on pull-down
  on any scene. The status line under the header shows what is happening
  (`PULLING LIVE FIGURES · 7/14 FEEDS`, `UPDATED 12s AGO`, or which feeds
  failed); the header badge shows the age of the figures (`LIVE · 40s`).
- **One feed per endpoint, three at a time.** Fourteen ERP endpoints used to be
  hit in parallel the moment you signed in, which an idle Railway service and
  its small Postgres pool answered with timeouts. Feeds now run three at a
  time in priority order, paged lists follow their `totalPages`, and the
  heavy customer-master call (the ERP computes a ledger balance per customer
  inside it) moved last with a small page. Customers now come from the
  receivable summaries instead, which cover every customer in one call.
- **No silent zeros.** A failing feed keeps its last good response (per-feed
  cache on the phone) and is listed in Settings → *Data feeds* with the
  server's reason (`No permission…`, `Endpoint not on this server`, a
  timeout). Only when every feed fails does the app report the server as
  unreachable. Demo figures are never shown under the LIVE badge: the first
  live load starts from zeros.
- **Local calendar days.** Daily buckets were keyed in UTC, so in India every
  figure landed on the previous day (today's sales showed under yesterday).
  Day keys now use the phone's local date; the ERP's date-only columns keep
  their printed date.
- **Contract fixes** found by reading the ERP source: supplier names on
  purchase orders (`supplier.supplierName`), raw-material stock pagination
  (the ERP defaults to 20 rows), sales-order page cap (500), voucher list
  filters (`startDate`, `limit`).

The ERP account used must hold `customers.view`, `sales-invoices.view`,
`sales-orders.view`, `products.view`, `purchaseOrders.view`,
`production_orders.view` (dispatches), `finished_goods_stocks.view` and
`raw_material_stocks.view`; a feed without its permission shows as FAILED with
"No permission" and the rest of the app keeps working.

## Live data from the Railway backend (v0.3, v0.4)

v0.4 fixes the first-run flow: a fresh install now opens on the **Sign in**
screen (previously it dropped straight into demo data with no way to reach
Settings). Every scene's header carries a LIVE/DEMO badge and a gear that opens
Settings; signing out returns to the sign-in screen.

The app ships pointed at `https://sunseaerp-production.up.railway.app/api`. On
first launch it offers **Sign in** (an ERP user with dashboard, accounts, sales
and inventory view rights) or **Explore demo data**. In live mode it reads:

| Scene | Endpoints |
| ----- | --------- |
| Overview | `/dashboard/tv-summary`, `/dashboard/accounts-summary?period=month`, invoices + RECEIPT vouchers for the 14-day series |
| Sales | `/sales-invoices` (60 days), `/sales-orders` (pipeline by status), `/products`, `/customers` |
| Receivables | `/accounts/receivable` summaries (ledger balances), invoice ageing, RECEIPT vouchers by mode |
| Field team | `/mobile/admin/team` — only when the mobile extension is installed; otherwise the scene explains why it is empty |
| Plant | TV summary production lines, `/finished-goods-stocks`, `/raw-material-stocks`, `/goods-dispatches`, `/purchase-orders`, `/expenses` |
| Attention | TV alerts + accounts alerts + orders awaiting approval, overdue POs, dispatches at gate, blocked / 90-day customers |

The last live dataset is cached on the phone so the app opens instantly and
offline; pull-down on any scene, the 60 s auto-refresh or Settings → *Refresh now* reloads. Settings also
switches between live and demo data and changes the server (Test connection
shows version, environment, latency and whether the mobile extension exists).
Requests retry while a sleeping Railway service wakes.

## Build

```bash
cd founder && npm install && npm run typecheck
npx expo prebuild --platform android && cd android && ./gradlew assembleRelease
```

The GitHub Actions workflow `.github/workflows/founder-apk.yml` builds and
publishes the APK to Releases (tags `insights-v…`) on every push touching
`founder/`.
