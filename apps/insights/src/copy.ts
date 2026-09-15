// Centralised founder-facing copy for the Insights app.
//
// Every string a founder can read (labels, captions, empty states, error
// messages, accessibility labels) lives here so wording stays consistent and
// is easy to review in one place. This is plain Indian English text, not an
// i18n framework — no keys, no pluralisation library, just the strings the
// screens import directly. Parameterised copy is a small function instead of
// a template fragment, so the whole sentence stays intact for anyone reading
// this file top to bottom.

/** The permission an admin must grant in the ERP for a user to open this app.
 * Named explicitly wherever access is denied, so the message on screen is
 * something an admin can act on without guessing. */
export const REQUIRED_PERMISSION = 'insights-app.access';

export const brand = {
  name: 'SunSea Insights',
  tagline: "A founder's snapshot of sales, collections and field agents.",
  footer: 'SunSea Insights · read-only founder dashboard',
};

export const login = {
  emailLabel: 'Email',
  emailPlaceholder: 'you@company.com',
  passwordLabel: 'Password',
  passwordPlaceholder: '••••••••',
  showPassword: 'Show',
  hidePassword: 'Hide',
  showPasswordA11y: 'Show password',
  hidePasswordA11y: 'Hide password',
  signIn: 'Sign in',
  signingIn: 'Signing in',
  missingFields: 'Enter your email and password.',
  signInFailed: 'Unable to sign in. Please try again.',
  accessHint: `Founder access only — needs the "${REQUIRED_PERMISSION}" permission, or a super admin account.`,
  orDivider: 'OR',
  exploreDemo: 'Explore demo data',
  exploreDemoA11y: 'Explore demo data, no sign-in needed',
  exploreDemoHint: 'Walk through every screen with a seeded dataset. Nothing is sent anywhere.',
};

export const auth = {
  /** Shown after the server ends the session mid-use (expired or invalid
   * token, account deactivated). A real server message replaces this when
   * one is available — see getErrorMessage. */
  sessionExpiredFallback: 'Your session has expired. Please sign in again.',
  verifyAccessFailed: 'Signed in, but could not verify your account access. Please try again.',
  noSessionToken: 'Sign-in did not return a valid session. Please try again.',
  noAccess: `This account can't open Insights yet. Ask an admin to grant the "${REQUIRED_PERMISSION}" permission.`,
};

/** Fallback wording for getErrorMessage — used only when the server didn't
 * send its own message. Kept specific to the failure (offline vs timeout vs
 * permission vs server) so "Retry" always has something concrete behind it. */
export const errors = {
  timeout: 'The request timed out. Check your connection and try again.',
  offline: 'No internet connection. Check your connection and try again.',
  forbidden: `You no longer have access to Insights. Ask an admin to grant the "${REQUIRED_PERMISSION}" permission.`,
  notFound: "That couldn't be found.",
  rateLimited: 'Too many requests. Please wait a moment and try again.',
  server: 'The server ran into a problem. Please try again.',
  generic: 'Something went wrong. Please try again.',
  retry: 'Retry',
};

export const overview = {
  headline: 'Business overview',
  greetingMorning: 'Good morning',
  greetingAfternoon: 'Good afternoon',
  greetingEvening: 'Good evening',
  /** The "updated Xm ago" chip's accessible name. */
  updatedA11y: (age: string, isStale: boolean) => `Data ${isStale ? 'may be behind' : 'up to date'}, updated ${age}`,
  demoChipLabel: 'Demo data',
  demoChipA11y: 'Showing seeded demo data, not a live server',
  loadFailedFallback: 'Could not load your business overview.',
  refreshFailedFallback: 'Could not refresh your business overview.',
  /** Prefixed to the refresh-failure reason so the founder knows how old the
   * numbers on screen are, not just that a refresh failed. */
  stalePrefix: (age: string) => `Showing figures from ${age}. `,
  rangeA11y: (days: number) => `Last ${days} days`,
  sections: {
    trend: 'Sales vs collections',
    aging: 'Receivables aging',
    topDebtors: 'Top debtors',
    topDebtorsSubtitle: 'Highest outstanding balances',
    promiseToPay: 'Promise to pay',
    production: 'Production pulse',
    productionSubtitle: 'Live factory snapshot',
  },
  kpi: {
    // "MTD" is spelled out once here ("month to date"); every other MTD tile
    // on this screen relies on that expansion instead of repeating it.
    salesMtdLabel: 'Sales, month to date',
    salesMtdDelta: 'vs last month',
    salesTodayLabel: 'Sales today',
    salesTodayDelta: 'vs yesterday',
    // "Agent collections" names the source explicitly — this is money
    // collected by field agents (CollectionRecord), not the wider "receipts,
    // all channels" figure that also includes payments entered directly
    // against an invoice. Keeping the two labelled distinctly is what stops
    // the founder from double-counting or under-counting cash collected.
    agentCollectionsTodayLabel: 'Agent collections today',
    agentCollectionsMtdLabel: 'Agent collections, MTD',
    totalOutstandingLabel: 'Total outstanding',
    overdueReceivablesLabel: 'Overdue receivables',
    cashInHandLabel: 'Cash in hand',
    agentsOnlineCaption: (n: number) => `${n} agent${n === 1 ? '' : 's'} online now`,
    pendingVerificationLabel: 'Collections pending verification',
    pendingVerificationCaption: (n: number) => `${n} receipt${n === 1 ? '' : 's'} awaiting verification`,
    ptpDueTodayLabel: 'Promises due today',
    ptpOverdueLabel: 'Promises overdue',
    // The backend counts visits with a promise-to-pay due/overdue, not an
    // amount — plain count with a unit word, not a currency figure.
    ptpCount: (n: number) => `${n} promise${n === 1 ? '' : 's'}`,
  },
  empty: {
    noTrendTitle: 'No sales or collections yet',
    noTrendMessage: 'Daily sales and collection totals will show up here once invoices and collections are recorded.',
    noDebtorsTitle: 'No outstanding debtors',
    noProductionTitle: 'No production data',
    noProductionMessage: 'Factory output will show up here once the production line reports it.',
  },
  debtorRow: {
    unknownCustomer: 'Unknown customer',
    largestBalanceA11y: ', largest outstanding balance',
    overdueDaysA11y: (days: number) => `, ${days} days overdue`,
    overdueDaysVisible: (days: number) => `${days}d overdue`,
    rankA11y: (rank: number) => `Rank ${rank}`,
  },
};

export const activityScreen = {
  title: 'Activity',
  loadFailedFallback: 'Could not load recent activity.',
  refreshFailedFallback: 'Could not refresh recent activity.',
  /** No single "as of" timestamp exists for this feed, so this states the
   * honest fact — it's the last successful load — rather than inventing an age. */
  stalePrefix: 'Showing the activity already loaded. ',
  emptyTitle: 'No recent activity',
  emptyMessage: 'New invoices, collections and cash deposits will appear here as they happen.',
};

export const agentsScreen = {
  title: 'Agents',
  loadFailedFallback: 'Could not load agent data.',
  refreshFailedFallback: 'Could not refresh agent data.',
  stalePrefix: (age: string) => `Showing agent data from ${age}. `,
  liveMap: {
    title: 'Live map',
    subtitle: (reporting: number, online: number, missing: number) =>
      `${reporting} reporting · ${online} online now${missing > 0 ? ` · ${missing} without a location fix` : ''}`,
    webFallbackTitle: 'Map unavailable on web preview',
    webFallbackMessage: 'Open the app on a phone or tablet to see the live map.',
    moduleUnavailableTitle: "Live map couldn't load",
    moduleUnavailableMessage: 'The maps component is unavailable on this device. Restart the app or try again later.',
    noAgentsTitle: 'No agents reporting location',
    noAgentsMessage: 'Field agents will appear here once they start sharing location from the field app.',
    noGpsFixTitle: 'No GPS fix yet',
    noGpsFixMessage: (n: number) => `${n} agent${n === 1 ? '' : 's'} tracked, but none has reported a usable location yet.`,
    agentOnlineNow: 'Online now',
    agentLastSeen: (age: string) => `Last seen ${age}`,
    agentCollectedToday: (amount: string) => `${amount} collected today`,
    agentVisiting: (name: string) => `Visiting ${name}`,
    unnamedAgent: 'Agent',
  },
  leaderboard: {
    title: 'Leaderboard',
    subtitle: 'Ranked by month-to-date collections',
    emptyTitle: 'No agent activity yet',
    emptyMessage: 'Collections logged by field agents will show up here once they start recording visits.',
    unknownAgent: 'Unknown agent',
    visitsAndPending: (visits: number, pending: number) =>
      `${visits} visit${visits === 1 ? '' : 's'} today · ${pending} pending assignment${pending === 1 ? '' : 's'}`,
    collectedTodayCaption: (amount: string) => `${amount} today`,
  },
};

export const settingsScreen = {
  title: 'Settings',
  defaultName: 'Founder',
  superAdminBadge: 'Super admin',
  superAdminNote: 'Full access via the super admin role — every permission is granted automatically.',
  demoBadge: 'Demo data',
  demoNote: 'Exploring a seeded dataset — nothing here is sent anywhere. Log out to sign in to a real server.',
  connectionSection: 'Connection',
  serverLabel: 'Server address',
  overviewRefreshLabel: 'Business overview refreshes',
  overviewRefreshValue: 'Every 60 seconds',
  agentsRefreshLabel: 'Agent tracking refreshes',
  agentsRefreshValue: 'Every 30 seconds',
  accessSection: 'Access',
  noPermissions: 'No permissions are listed for this account.',
  logOut: 'Log out',
  exitDemo: 'Exit demo',
  footer: brand.footer,
};

export const serverScreen = {
  title: 'Server address',
  currentLabel: 'Current server',
  inputLabel: 'Server address',
  inputPlaceholder: 'https://your-api.example.com/api',
  inputA11y: 'Server address',
  helperTitle: 'Examples',
  helperAndroidEmulator: 'Android emulator: http://10.0.2.2:5000/api',
  helperLanPhone: "Phone on the same Wi-Fi: http://<your PC's LAN IP>:5000/api",
  helperHosted: 'Hosted: https://<your-domain>/api',
  testButton: 'Test connection',
  testingButton: 'Testing…',
  testButtonA11y: 'Test connection',
  saveButton: 'Save',
  savingButton: 'Saving…',
  saveButtonA11y: 'Save server address',
  resetButton: 'Reset to default',
  resetButtonA11y: 'Reset server address to the default',
  /** "Server: <host>" — the link shown under the login form and the row shown in Settings. */
  linkFromLogin: (host: string) => `Server: ${host}`,
  linkFromLoginA11y: 'Change server address',
  settingsRowA11y: (host: string) => `Server address, ${host}. Opens server settings.`,
  /** Shown once a save would point the app at a different server than the one
   * currently signed in against — saving forces a fresh sign-in there. */
  changeNote: "Saving a different server signs you out — you'll need to sign in again on the new server.",
  signedOutNotice: 'Signed out because the server address changed. Sign in again to continue.',
  reasons: {
    empty: 'Enter a server address.',
    invalid: "That doesn't look like a valid address.",
    invalidHost: "That doesn't look like a valid host name or IP address.",
    invalidPort: 'That port number looks wrong.',
  },
  test: {
    success: (version: string, environment: string, latencyMs: number) =>
      `Connected — v${version} · ${environment} · ${latencyMs}ms`,
    successA11y: (version: string, environment: string, latencyMs: number) =>
      `Connected. Version ${version}, ${environment} environment, ${latencyMs} milliseconds.`,
    unexpectedResponse: "Connected, but that doesn't look like the Sunsea ERP API.",
  },
};

export const crash = {
  title: 'Something went wrong',
  message:
    'Insights hit an unexpected problem. Your data is safe — tap Try again, and if it keeps happening, close and reopen the app.',
  retry: 'Try again',
};

export const charts = {
  aging: {
    a11yPrefix: 'Receivables aging',
    bucketLabels: {
      '0_30': '0–30 days',
      '31_60': '31–60 days',
      '61_90': '61–90 days',
      '90_plus': '90+ days',
    } as Record<string, string>,
  },
  trend: {
    salesLegend: 'Sales',
    collectionsLegend: 'Agent collections',
    a11y: (from: string, to: string, sales: string, collections: string) =>
      `Sales versus agent collections trend, ${from} to ${to}. Latest: sales ${sales}, agent collections ${collections}.`,
    a11yEmpty: 'Sales versus agent collections trend, no data yet.',
    tooltipSales: (amount: string) => `Sales ${amount}`,
    tooltipCollections: (amount: string) => `Agent collections ${amount}`,
  },
};

export const errorBanner = {
  retry: 'Retry',
};
