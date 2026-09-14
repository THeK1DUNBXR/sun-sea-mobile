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
# edit .env: EXPO_PUBLIC_API_URL is only the *initial* default (see below) —
# it's baked in at build time, e.g.
#   http://10.0.2.2:5000/api   (Android emulator -> host machine)
#   http://localhost:5000/api  (iOS simulator)
#   https://your-api.example.com/api (device / production)
npx expo start
```

Type-check: `npx tsc --noEmit`

### Changing the server address without a rebuild

The backend URL is editable at runtime — no rebuild needed to point a running app at
a different server. Reach it from the **"Server: ..."** link under the sign-in form
(works before signing in) or the **Server address** row in the **Settings** tab
(after signing in). The screen lets you type a new address, run **Test connection**
against it (shows the API version, environment, and round-trip latency, or the
error), and **Save** it — saved values persist across restarts (`AsyncStorage`).
**Reset to default** puts the build's default address back in the field.

Saving a server address different from the one you're currently signed in against
signs you out, since a session token from one backend is meaningless on another —
sign in again on the new server.

A bare host (no `http://`/`https://`) is completed automatically: `localhost`, an IP
address (`10.0.2.2`, `192.168.1.50`, ...) gets `http://` (plain HTTP, for local
testing — see the cleartext-traffic note below); anything else gets `https://`. A
missing `/api` path suffix is appended automatically. Typical values:

- **Android emulator:** `http://10.0.2.2:5000/api` (emulator's alias for the host machine)
- **Phone on the same Wi-Fi as the backend:** `http://<your PC's LAN IP>:5000/api`
- **Hosted (e.g. Railway):** `https://<your-domain>/api`

Without ever touching this screen, the app defaults to the hosted production API
(`https://sunseaerp-production.up.railway.app/api`), or to `EXPO_PUBLIC_API_URL` if
one was set at build time.

**Plain-HTTP note:** `app.json` sets Android's `usesCleartextTraffic: true` and iOS's
`NSAppTransportSecurity.NSAllowsArbitraryLoads: true` so the app can reach a
`http://` backend on a local network or emulator during development/testing. Before
a store release, tighten this back down (e.g. drop `usesCleartextTraffic` and scope
`NSAppTransportSecurity` to specific exception domains, or remove it) once testing
against plain HTTP is no longer needed.

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
- **Settings** — signed-in user, a navigable server address row (see below),
  refresh intervals, granted permissions, and logout.
- **Server address** — view/edit/test/save the backend base URL; see "Changing the
  server address without a rebuild" above. Reachable signed-out (from login) or
  signed-in (from Settings).

## API surface consumed

All requests go through the current server address (see above; already includes
`/api`):

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
  api/        axios client, runtime-configurable server URL, typed insights API
              calls, react-query hooks
  app/        expo-router screens (login, tabs: overview/agents/activity/settings)
  charts/     hand-rolled SVG charts (trend line/area, aging stacked bar, inline bar)
  store/      auth context (login/logout/hydrate + permission gate)
  ui/         design-system primitives (Card, KpiTile, Section, Skeleton, EmptyState,
              ErrorBanner, theme tokens for light/dark)
  utils/      formatters (₹ compact, percent, relative time, initials)
  types.ts    shared response/domain types
```

## Notes

- No paid or hosted AI/maps APIs are used anywhere.
- The map uses the default platform provider (no `PROVIDER_GOOGLE`, no API key).
- Designed to look correct in both light and dark mode (`useColorScheme`).
