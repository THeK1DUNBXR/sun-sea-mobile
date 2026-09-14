# SunSea Insights

A read-only, founder-facing Expo app: sales, collections, receivables, and a live
agent map. Built against the contract in `../../docs/DESIGN.md` (§3.4, §3.3, §6).

## Stack

- Expo SDK 57, Expo Router (file-based routing, tabs), TypeScript (strict)
- `@tanstack/react-query` for data fetching/caching/auto-refresh
- `axios` for HTTP, `expo-secure-store` for the auth token
- `react-native-svg` for hand-rolled charts (no chart library, no paid services)
- `react-native-maps` for the live agent map (default OS/Google-free provider — no
  Google Maps API key configured)

## Setup

```bash
cd apps/insights
npm install
cp .env.example .env
# edit .env: EXPO_PUBLIC_API_URL should point at your backend, e.g.
#   http://10.0.2.2:5000/api   (Android emulator -> host machine)
#   http://localhost:5000/api  (iOS simulator)
#   https://your-api.example.com/api (device / production)
npx expo start
```

Type-check: `npx tsc --noEmit`

## Login & permissions

Sign in with any user account. Access is gated on:

- permission **`insights-app.access`**, or
- the account being a **super admin**

The app checks `GET /api/auth/me` after login (`data.permissions`,
`data.isSuperAdmin`/`data.profile.isSuperAdmin`/`data.user.isSuperAdmin`) and refuses
sign-in (clearing the token) if neither is present. Ask a backend admin to grant the
`insights-app.access` permission to the founder's account, or use a super admin login.

## Screens

- **Overview** — greeting + last-updated time, KPI grid (sales today/MTD vs prior
  period, collections today/MTD, outstanding, overdue, cash in hand, pending
  verification), a 7/30/90-day sales-vs-collections chart, receivables aging
  (0–30 / 31–60 / 61–90 / 90+ stacked bar), top debtors, promise-to-pay tiles, and a
  production pulse card. Pull-to-refresh + auto-refresh every 60s while the tab is
  focused.
- **Agents** — live map (`react-native-maps`, one marker per agent, green = online
  within 5 min / grey = stale, callout with last seen + today's collections + current
  task) and a leaderboard (rank, collected today/MTD, visits, pending assignments).
  Auto-refreshes every 30s while focused.
- **Activity** — recent invoices/collections/deposits feed grouped by day, with an
  icon per activity type.
- **Settings** — signed-in user, server URL, refresh intervals, granted permissions,
  and logout.

## API surface consumed

All requests go through `${EXPO_PUBLIC_API_URL}` (already includes `/api`):

- `POST /auth/login`, `GET /auth/me`
- `GET /insights/overview`
- `GET /insights/trends?days=7|30|90`
- `GET /insights/agents/live`
- `GET /insights/recent-activity?limit=30`

The client code (`src/api/insightsApi.ts`, `src/types.ts`) treats every response field
as optional and renders sensible fallbacks (`—`, empty states), since the backend is
being built concurrently against the same contract.

## Project layout

```
src/
  api/        axios client, typed insights API calls, react-query hooks
  app/        expo-router screens (login, tabs: overview/agents/activity/settings)
  charts/     hand-rolled SVG charts (trend line/area, aging stacked bar, inline bar)
  store/      auth context (login/logout/hydrate + permission gate)
  ui/         design-system primitives (Card, KpiTile, Section, Skeleton, EmptyState,
              ErrorBanner, theme tokens for light/dark)
  utils/      formatters (₹ compact/full, percent, relative time, initials)
  types.ts    shared response/domain types
```

## Notes

- No paid or hosted AI/maps APIs are used anywhere.
- The map uses the default platform provider (no `PROVIDER_GOOGLE`, no API key).
- Designed to look correct in both light and dark mode (`useColorScheme`).
