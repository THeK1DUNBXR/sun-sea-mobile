# Sun Sea Insights — founder's monitoring app (prototype)

A read-only Android/iOS app for the founder, styled after the ERP's **Management
TV Dashboard** (`frontend/src/modules/dashboard/tv`): near-black board with CRT
scanlines, monospace tabular numbers, a blinking LIVE badge and clock, an
attention banner, a scrolling ticker, coloured-rail KPI cards with count-up
numbers, glowing gauges, threshold-coloured bar rows, giant pipeline tiles and
red-bordered attention panels. Dark by default with a light mode toggle. No data
entry, no login in the prototype, seeded demo data.

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

## Build

```bash
cd founder && npm install && npm run typecheck
npx expo prebuild --platform android && cd android && ./gradlew assembleRelease
```

The GitHub Actions workflow `.github/workflows/founder-apk.yml` builds and
publishes the APK to Releases (tags `insights-v…`) on every push touching
`founder/`.
