// Central home for the app's UX copy: everything a field agent reads that
// isn't a status/outcome/payment-method label (those live in src/ui/format.ts
// next to the enums they describe). Keeping the wording here means the same
// situation — a failed sync, a permission prompt, a "you're done" moment —
// always says the same thing no matter which screen triggers it.
//
// Voice: Indian English, short sentences, verb first on anything actionable.
// Never invent a feature or a number the screen doesn't already have.

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

export const copy = {
  home: {
    nextUp(ptpDueToday: number, assignedCount: number): string {
      if (ptpDueToday > 0) return `Follow up on ${plural(ptpDueToday, 'promise')} today`;
      if (assignedCount > 0) return `Collect from ${plural(assignedCount, 'open assignment')}`;
      return 'Nothing to do right now';
    },
    outstandingLabel: 'Outstanding',
    collectedTodayLabel: 'Collected today',
    kpiOpenAssignments: 'Open assignments',
    kpiVisitsToday: 'Visits today',
    kpiCashInHand: 'Cash in hand',
    kpiPromiseToPayToday: 'Promise to pay due today',
    summaryLoadError: "Couldn't load today's numbers. Showing the last known values.",
    liveLabel: 'Live',
    notSharingLabel: 'Not sharing',
    trackingCardTitle: 'Location tracking',
    trackingOnSubtitle: 'Sharing your route with the office',
    trackingOffSubtitle: "Off — turn on before you head out",
    quickActionsTitle: 'Quick actions',
    viewAssignments: 'View assignments',
    addDeposit: 'Add deposit',
    openMap: 'Open map',
  },

  tracking: {
    permissionTitle: 'Turn on location access',
    permissionMessage: 'Turn on location access in Settings to start sharing your route with the office.',
    backgroundTitle: 'Sharing only while the app is open',
    backgroundMessage:
      'The office can only see your location while SunSea Collect is open on your phone. Choose "Allow all the time" in Settings so your route keeps sharing while the app is in the background too.',
  },

  sync: {
    allSynced: 'All caught up — everything is synced',
    syncing: 'Syncing…',
    pending(count: number): string {
      return `${plural(count, 'item')} waiting to sync`;
    },
    queueHint: "Tap Retry. If it keeps failing, contact the office.",
  },

  assignments: {
    listLoadErrorTitle: "Couldn't load assignments",
    checkConnection: 'Check your connection and try again.',
    emptyTitle: 'No assignments',
    emptySubtitle: 'Try a different filter or search.',
    searchPlaceholder: 'Search customer, invoice…',
  },

  assignmentDetail: {
    loading: 'Loading…',
    loadErrorTitle: "Couldn't load this assignment",
    recordCollection: 'Record collection',
    recordVisit: 'Record visit',
    call: 'Call',
    callCustomer: 'Call customer',
    callNoNumber: 'Call — no phone number on file',
    whatsApp: 'WhatsApp',
    whatsAppCustomer: 'Message customer on WhatsApp',
    whatsAppNoNumber: 'WhatsApp — no phone number on file',
    navigate: 'Navigate',
    openInMaps: 'Open in Maps',
    openInMapsNoAddress: 'Open in Maps — no address on file',
    noAddress: 'No address on file',
    customerLedger: 'Customer ledger',
    close: 'Close',
    instructions: 'Instructions',
    items: 'Items',
    previousVisits: 'Previous visits',
    ledgerLoadErrorTitle: "Couldn't load the ledger",
    invoicesHeading: 'Invoices',
    noInvoices: 'No invoices for this customer.',
    recentReceiptsHeading: 'Recent receipts',
    noReceipts: 'No receipts yet.',
    linkUnavailableTitle: "Can't open this",
    noPhoneApp: 'No phone app is available to place this call.',
    noWhatsApp: "WhatsApp isn't installed on this device.",
    noMapsApp: 'No maps app is available to open this address.',
  },

  deposits: {
    heading: 'Cash deposits',
    addDeposit: 'Add deposit',
    cancel: 'Cancel',
    amountLabel: 'Amount received (₹)',
    notesLabel: 'Notes (optional)',
    addProofPhoto: 'Add proof photo',
    proofPhotoAdded: 'Proof photo added',
    submitDeposit: 'Submit deposit',
    amountRequired: "Enter an amount more than ₹0.",
    loadErrorTitle: "Couldn't load deposits",
    emptyTitle: 'No deposits yet',
    emptySubtitle: 'Cash handed to the office will show up here.',
    successTitle(amount: string): string {
      return `${amount} saved`;
    },
    successSubtitle: "Saved on this phone. It will upload when you're back online.",
    done: 'Done',
  },

  collect: {
    outstandingPrefix: 'Outstanding',
    outstandingUnknownLoading: 'Loading…',
    outstandingUnknown: 'Not available offline — the amount will be checked when this syncs.',
    assignmentLoadWarning:
      "Couldn't load the invoice. You can still record the collection — it will sync and be checked once you're back online.",
    step1Title: 'Amount',
    step1Guidance: 'Enter the amount you received from the customer.',
    amountLabel: 'Amount received (₹)',
    useFullAmount: 'Use full amount',
    amountRequired: "Enter an amount more than ₹0.",
    amountOverOutstanding(outstanding: string): string {
      return `Amount can't be more than ${outstanding} outstanding.`;
    },
    step2Title: 'Payment method',
    referenceNumberLabel: 'Reference number (optional)',
    chequeNumberLabel: 'Cheque number',
    chequeNumberRequired: 'Enter the cheque number.',
    chequeDateLabel: 'Cheque date (YYYY-MM-DD)',
    bankNameLabel: 'Bank name',
    payerNameLabel: 'Payer name (optional)',
    notesLabel: 'Notes (optional)',
    step3Title: 'Proof photo',
    step3Guidance: 'Attach a photo of the cash, cheque or UPI screen.',
    takePhoto: 'Take photo',
    choosePhoto: 'Choose photo',
    step4Title: 'Signature',
    clearSignature: 'Clear signature',
    saveSignature: 'Save signature',
    signatureSaved: 'Signature saved',
    optional: 'Optional',
    gpsCapturing: 'Capturing GPS…',
    gpsUnavailable: 'Location unavailable — continuing without GPS',
    gpsAccuracyWarning(accuracyM: number): string {
      return `GPS accuracy is low, about ±${accuracyM}m. The location on this receipt may not be exact.`;
    },
    submit: 'Submit collection',
    successTitle(amount: string): string {
      return `${amount} recorded`;
    },
    successSubtitle(customerName: string): string {
      return `From ${customerName}. Saved on this phone — it will upload when you're back online.`;
    },
    backToAssignments: 'Back to assignments',
  },

  visit: {
    outcomeLabel: 'Outcome',
    promisedDateLabel: 'Promised date (YYYY-MM-DD)',
    promisedDateRequired: 'Enter the date you promised.',
    promisedDateFormat: 'Enter the date as YYYY-MM-DD.',
    promisedAmountLabel: 'Promised amount (₹, optional)',
    notesLabel: 'Notes (optional)',
    photoLabel: 'Photo (optional)',
    addPhoto: 'Add photo',
    photoAdded: 'Photo added',
    gpsCapturing: 'Capturing GPS…',
    submit: 'Submit visit',
    successTitle: 'Visit recorded',
    successSubtitle: "Saved on this phone. It will upload when you're back online.",
    backToAssignments: 'Back to assignments',
  },

  receipt: {
    loadErrorTitle: "Couldn't load this receipt",
    loadErrorSubtitle: "If this collection hasn't synced yet, it will be available once it does.",
    loading: 'Loading receipt…',
    paidStamp: 'Paid',
    receivedFrom: 'Received from',
    towardsInvoice: 'Towards invoice',
    mode: 'Mode',
    receivedBy: 'Received by',
    shareAsPdf: 'Share as PDF',
    shareOnWhatsApp: 'Share on WhatsApp',
    sharingUnavailableTitle: 'Sharing unavailable',
    sharingUnavailableMessage: "This device can't share files. The receipt is still saved on the app.",
    pdfFailedTitle: "Couldn't create the PDF",
    pdfFailedMessage: 'Something went wrong making the receipt. Please try again.',
    whatsAppUnavailableTitle: 'WhatsApp unavailable',
    whatsAppUnavailableMessage: "WhatsApp isn't installed on this device.",
    whatsAppShareText(receiptNo: string, amount: string, customerName: string): string {
      return `Receipt ${receiptNo} for ${amount} received from ${customerName}. Thank you!`;
    },
  },

  history: {
    loadErrorTitle: "Couldn't load history",
    emptyTitle: 'No activity yet',
    emptySubtitle: 'Collections, visits and deposits will show up here.',
  },

  map: {
    locating: 'Locating you…',
    loadErrorTitle: "Couldn't load assignments",
    loadErrorSubtitle: 'The map needs your assignment list to plot pins.',
  },

  profile: {
    offlineQueueTitle: 'Offline queue',
    syncNow: 'Sync now',
    nothingPending: 'Nothing pending',
    retry: 'Retry',
    remove: 'Remove',
    needsAttention: 'Needs attention',
    retrying: 'Retrying',
    pending: 'Pending',
    syncFailedHint: 'Tap Retry. If it keeps failing, contact the office.',
    removeConfirmTitle: 'Remove from sync queue?',
    removeConfirmMessage: 'This record has not synced yet and will be discarded permanently.',
    dismiss: 'Dismiss',
    logOut: 'Log out',
    logOutConfirmTitle: 'Log out?',
    logOutConfirmMessage: 'Location sharing will stop and any unsynced items will stay queued until you log back in.',
    exitDemo: 'Exit demo',
    exitDemoConfirmTitle: 'Exit demo?',
    exitDemoConfirmMessage: 'This leaves the seeded demo data behind. Nothing you entered here was sent anywhere.',
    demoBadge: 'Demo data',
    demoNote: 'Exploring seeded demo data — nothing here is sent anywhere. Exit demo to sign in to a real server.',
  },

  login: {
    tagline: 'Field collection for SunSea agents',
    emailLabel: 'Email',
    passwordLabel: 'Password',
    logIn: 'Log in',
    missingFields: 'Enter your email and password.',
    genericFailure: "Couldn't log in. Check your connection and try again.",
    footer: 'SunSea ERP · Collection Agent',
    serverLink(host: string): string {
      return `Server: ${host}`;
    },
    serverLinkA11y: 'Server address. Change which backend the app connects to.',
    orDivider: 'OR',
    exploreDemo: 'Explore the demo (no server needed)',
    exploreDemoA11y: 'Explore the demo, no sign-in needed',
    exploreDemoHint: 'Loads sample assignments, collections and deposits on this device. Nothing is sent anywhere.',
  },

  server: {
    screenTitle: 'Server address',
    profileRowLabel: 'Server address',
    currentLabel: 'Current server',
    inputLabel: 'Server address',
    inputPlaceholder: 'https://your-server.example.com/api',
    inputA11y: 'Server address',
    helperTitle: 'Examples',
    helperAndroidEmulator: 'Android emulator: http://10.0.2.2:5000/api',
    helperLanPhone: "Phone on the same Wi-Fi: http://<your PC's LAN IP>:5000/api",
    helperHosted: 'Hosted: https://<your-domain>/api',
    testButton: 'Test connection',
    testingButton: 'Testing…',
    testButtonA11y: 'Test connection to this server',
    saveButton: 'Save',
    savingButton: 'Saving…',
    saveButtonA11y: 'Save server address',
    resetButton: 'Reset to default',
    resetButtonA11y: 'Reset server address to the default',
    changeNote:
      "You're signed in. Saving a different server will sign you out — any pending offline items will upload to the new server once you sign back in.",
    reasons: {
      empty: 'Enter a server address.',
      invalid: "That doesn't look like a valid address.",
      invalidPort: 'The port must be a number between 1 and 65535.',
      invalidHost: 'Enter a valid hostname, domain, or IP address.',
    },
    test: {
      success(version: string, environment: string, latencyMs: number): string {
        return `Connected — Sunsea ERP API v${version} (${environment}), ${latencyMs}ms`;
      },
      successA11y(version: string, environment: string, latencyMs: number): string {
        return `Connected to Sunsea ERP API version ${version}, ${environment} environment, ${latencyMs} milliseconds`;
      },
      unexpectedResponse: "That address responded, but it doesn't look like the Sunsea ERP API.",
    },
    errors: {
      timeout: 'The request timed out. Check the address and that the server is running.',
      offline: "Couldn't reach that address. Check the address and your connection.",
      server: 'The server responded with an error.',
      generic: 'Something went wrong. Please try again.',
    },
  },

  imageGuard: {
    tooLargeTitle: 'Photo too large',
    tooLargeMessage(sizeMb: string): string {
      return `This photo is ${sizeMb} MB — the limit is 5 MB. Try again with a lower quality or a different photo.`;
    },
  },

  errorBoundary: {
    title: 'Something went wrong',
    subtitle: 'SunSea Collect ran into a problem showing this screen. Your offline queue and login are safe.',
    tryAgain: 'Try again',
  },
} as const;
