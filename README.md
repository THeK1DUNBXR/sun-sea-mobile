# sun-sea-mobile

Mobile apps for SunSea ERP (backend & web live in the `SunSea-Erp` repo).

| App | Path | Audience |
|---|---|---|
| Collection Agent | `apps/collection-agent` | Field collection agents: assigned invoices, record collections/visits/deposits, live GPS tracking, offline sync |
| Insights | `apps/insights` | Founder / MD: read-only business pulse (sales, collections, receivables, agents live map) |

Both are Expo (React Native + TypeScript) apps. See `docs/DESIGN.md` for the full system design and API contract.

## Quick start
```bash
cd apps/collection-agent   # or apps/insights
npm install
cp .env.example .env       # set EXPO_PUBLIC_API_URL=https://<backend-host>/api
npx expo start
```
Background location and push notifications need a development build (`npx expo run:android` / `run:ios` or EAS), not Expo Go.
