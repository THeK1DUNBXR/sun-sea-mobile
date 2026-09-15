# SunSea Collect — Collection Agent app

Field app for collection agents of SunSea ERP. Agents see the invoices assigned to them by the admin, visit customers, record collections (cash / UPI / cheque / bank transfer / card) with photo proof, signature and GPS, log visit outcomes and promise-to-pay dates, hand over cash deposits, and share receipts. The app streams the agent's precise location to the office live map, foreground and background, and works offline with a sync queue.

## Requirements
- Node 20+, Expo SDK 57 (`npx expo --version`).
- A SunSea ERP backend reachable from the phone. The login account's role must hold the `collection-agent-app.access` permission (super admins are always allowed).
- Background location and push notifications need a **development build** (`npx expo run:android` / `npx expo run:ios`, or EAS). Expo Go cannot run background location tasks.

## Setup
```bash
npm install
cp .env.example .env      # set EXPO_PUBLIC_API_URL
npx expo start            # Metro; press a / i to open a dev build
npm run typecheck
```

## Changing the server address
The backend URL doesn't have to be baked in at build time. Every screen that isn't signed in shows a **Server: `<host>`** link under the login form, and signed-in agents can reach the same screen from Profile → **Server address**. From there you can:
- see the address currently in effect,
- type a new one and **Test connection** (a plain `GET` against it, expecting the Sunsea ERP API's welcome response),
- **Save** it — if you're signed in and the address actually changed, saving signs you out first (any offline items still queued will upload to the *new* server the next time they sync), then returns you to the login screen,
- **Reset to default** to go back to the build-time default (the `EXPO_PUBLIC_API_URL` baked in at build time, or else the hosted Railway API).

The address is normalized before it's saved: no scheme is assumed to be `http://` for `localhost` and bare IPs (a local/LAN backend is almost never behind TLS) and `https://` otherwise, and it always ends in `/api`. So typing any of these all resolve the same way:
- Android emulator talking to your dev machine: `10.0.2.2:5000` → `http://10.0.2.2:5000/api`
- A phone on the same Wi-Fi as your dev machine: `<your PC's LAN IP>:5000` → `http://<your PC's LAN IP>:5000/api`
- The hosted backend: `your-domain.com` → `https://your-domain.com/api`

The saved address persists across restarts (`AsyncStorage`, key `sunsea.collect.serverUrl`) and takes effect on the very next request — including from the background location task and the offline queue flush, which run outside the app's UI. `EXPO_PUBLIC_API_URL` (see `.env.example`) still controls only the *default* shown before anything has ever been saved.

Because LAN/local testing is normally plain HTTP, `app.json` currently allows cleartext traffic on Android (`usesCleartextTraffic`) and arbitrary loads on iOS (`NSAppTransportSecurity.NSAllowsArbitraryLoads`). Tighten or remove both before a store release if the app will only ever talk to a TLS-hosted backend by then.

## How it works
- `src/api/client.ts` — axios with the Bearer token from SecureStore; a 401 signs the agent out. `baseURL` is resolved per request from `src/api/serverUrl.ts` rather than fixed at client creation, so a runtime server-address change takes effect immediately.
- `src/api/serverUrl.ts` — runtime-configurable backend base URL: get/set/validate/normalize, a connectivity test, and an in-memory cache hydrated once from `AsyncStorage` and safe to call from any JS context (including the headless background-location task).
- `src/api/agentApi.ts` — typed calls for every `/api/agent/*` endpoint (see `docs/DESIGN.md` §3.2 in the repo root).
- `src/store/auth.tsx` — login, permission gate, token hydration.
- `src/offline/queue.ts` — persistent FIFO queue for collections, visits, deposits and location batches. Each item carries a `clientRef` (UUID) so replays are idempotent on the server (the backend returns the existing record on a repeat, not an error). Flushes when the network returns, on app foreground, or from Profile → Sync now; a server-side rejection on one item (e.g. a photo that was deleted before it replayed) is set aside as "needs attention" after repeated failures instead of blocking the rest of the queue, and location batches are capped so a long stretch offline doesn't grow storage unbounded.
- `src/location/tracking.ts` — `expo-task-manager` background task. High accuracy, 15 s / 15 m, Android foreground service notification, buffered pings flushed every 30 s or 20 points to `POST /agent/locations`. The Home and Profile screens expose the tracking toggle; the preference persists and tracking resumes after login.
- `src/notifications/push.ts` — registers the Expo push token (`POST /agent/push-token`); tapping a notification opens Assignments.
- Screens live under `src/app` (Expo Router): `login`, tabs `home · assignments · history · deposits · profile`, and stacks `assignment/[id]`, `collect/[assignmentId]`, `visit/[assignmentId]`, `receipt/[recordId]`, `map`.

## Permissions declared (`app.json`)
iOS: location when-in-use + always, camera, photo library, `UIBackgroundModes: location`.
Android: fine/coarse/background location, foreground service (location), camera, post notifications.

No paid or hosted AI/map services are used: react-native-maps uses the platform provider and receipts are generated on device with `expo-print`.
