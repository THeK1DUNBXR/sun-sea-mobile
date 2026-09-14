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

## How it works
- `src/api/client.ts` — axios with the Bearer token from SecureStore; a 401 signs the agent out.
- `src/api/agentApi.ts` — typed calls for every `/api/agent/*` endpoint (see `docs/DESIGN.md` §3.2 in the repo root).
- `src/store/auth.tsx` — login, permission gate, token hydration.
- `src/offline/queue.ts` — persistent FIFO queue for collections, visits, deposits and location batches. Each item carries a `clientRef` (UUID) so replays are idempotent on the server. Flushes when the network returns, on app foreground, or from Profile → Sync now.
- `src/location/tracking.ts` — `expo-task-manager` background task. High accuracy, 15 s / 15 m, Android foreground service notification, buffered pings flushed every 30 s or 20 points to `POST /agent/locations`. The Home and Profile screens expose the tracking toggle; the preference persists and tracking resumes after login.
- `src/notifications/push.ts` — registers the Expo push token (`POST /agent/push-token`); tapping a notification opens Assignments.
- Screens live under `src/app` (Expo Router): `login`, tabs `home · assignments · history · deposits · profile`, and stacks `assignment/[id]`, `collect/[assignmentId]`, `visit/[assignmentId]`, `receipt/[recordId]`, `map`.

## Permissions declared (`app.json`)
iOS: location when-in-use + always, camera, photo library, `UIBackgroundModes: location`.
Android: fine/coarse/background location, foreground service (location), camera, post notifications.

No paid or hosted AI/map services are used: react-native-maps uses the platform provider and receipts are generated on device with `expo-print`.
