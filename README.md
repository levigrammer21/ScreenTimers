# Screen Timers · 1.3.0

A polished shared screen-time dashboard for Reid and Evan. **Anyone signed in opens the same dashboard with full controls.** Google sign-in and email account creation are included.

**Start with SETUP.md.** Upload the supplied files to GitHub Pages and paste the included rules into Firebase once. No sharing codes, enrollment, Cloud Functions, Cloud Tasks, Scheduler, admin credentials, Cloud Shell, or command-line deployment is required.

## Features

- Shared per-boy tasks: add a task name and base reward; Complete credits earned time and removes the task in one transaction.

- Separate time banks for Reid and Evan; both begin at zero with no grades if no prior data exists.
- Instant Start/Pause/Resume/Stop. Independent timers continue logically while apps are closed and preserve unused time.
- Grade-adjusted awards with exact previews and optional reasons; tap-to-change grades. A=1.25×, B=1×, C=0.6×, D=0.1×, F=0×; all listed grades multiply.
- Separate flat time additions/deductions. Running adjustments settle elapsed consumption first; deductions floor at zero.
- Per-child lockouts, live remaining time, extensions/subtractions, early ending, and earning during lockout.
- Shared live Firestore views, atomic transactions, idempotent retries, and no per-second database writes.
- History with actors, exact amounts, award snapshots, requested/actual deductions, filters, and older-history pagination.
- Light, Dark, and Auto themes, an installable PWA, a cached offline shell, clear stale status, and online-only mutations.
- Optional alerts while the app is open, plus in-app activity notices. Closed-app push is not included.
- A single prebuilt app bundle and readable startup recovery messages.

All supplied source is at the root of one `screen-timers` folder. The source and the prebuilt runtime are included; no build step is required for ordinary phone-based publishing.

## Exact calculations and timers

Balances use rational microseconds: `{n: "numerator", d: "denominator"}`. BigInt calculations preserve even sub-microsecond remainders. Prior awards retain their grade and multiplier snapshots. Grade changes affect only new awards. The countdown rounds positive fractional time up to a whole displayed second, while exact award/history values remain available.

Up to 24 grades are supported per child. Base earned awards are limited to 7 days, and banks, flat corrections, and remaining lockouts to 365 days. Reasons are optional, up to 500 characters. Sessions have no separate duration cap; more time can be added while running.

The direct Firestore adapter calibrates against a Firestore server timestamp and tracks elapsed time with a monotonic browser clock. State changes settle elapsed time atomically. Closing both apps does not stop elapsed consumption. On return, expiry is reconciled at its logical timestamp and logged once, even if both parents reopen together. Adding time after expiry never restarts the timer automatically.

## Access and shared data

As requested, published rules permit **all signed-in accounts** to read and write all app data. They block signed-out requests. There is no private-family membership or account approval process. The interface applies validation and records history; it is a trusted shared app, with no server-side anti-tampering system.

Shared profiles remain at `children/reid` and `children/evan`. History and retry receipts remain at `history` and `requests`. Existing data at those paths is retained. Personal UI preferences are stored by UID for convenience, but the deliberately simple rules grant signed-in accounts full project data access.

This app manages the time bank; it does not integrate with operating-system app blocking on a child’s device.

## Notifications, offline behavior, and costs

No backend is needed or included. Closed-app push is consequently not provided. Optional browser notifications can be shown while this app is running, subject to browser permission/support. Canonical history remains in Firestore. Expiry while all apps are closed is recorded when an app next connects, using the original logical expiry time.

The PWA caches its shell and stores a last-known view for offline display. Mutations use online Firestore transactions and cannot silently queue bank changes offline. Firebase Authentication and Firestore remain cloud services with their own quotas and usage terms; this app does not require enabling Cloud Functions or a billing plan for those functions. It can use the normal Firestore project limits rather than a function-based deployment.

## Developer checks (optional)

The files are ready to upload without these commands. For future source changes, use Node 22:

```
npm ci
npm test
npm run build
```

The optional emulator regression suite is `npm run test:rules` with Java 21+ for the pinned current CLI. It uses demo projects only. App source changes must be rebuilt into `app-bundle.js`; changing config.js also requires rebuilding. For a release, update the version in domain.js/package.json, the bundle query in index.html, and the service-worker cache version.

The supplied `github-pages.yml` is optional. If using GitHub Actions, paste it into `.github/workflows/pages.yml`. Branch/root Pages publishing requires no workflow file. No backend workflow is present or needed.

See TEST_REPORT.md for executed tests and the remaining real-device checks. SPECIFICATION.md contains the original handoff with current amendments marked at the top.

## Tasks

Tap **+ Add task** under Reid or Evan. Enter a title such as “Burn trash” and a base reward such as 15 minutes. Both parents see the same list. Tap **Complete** once: the app applies that child’s current grade multiplier, adds the exact earned time, records it in History, and removes the task. It does not start the timer automatically. The row shows the current earned reward, including any grade adjustment. The small × button removes a task without giving time and asks for confirmation.

If both parents tap Complete together, only one transaction credits the task. If a task’s reward cannot be applied (for example, it would exceed the bank limit), the task stays on the list. Completion uses the grades at that moment, so grade edits after task creation affect its reward.

The false grade-change error is fixed for existing saved grades; no grade deletion or data reset is needed. Update both devices to 1.3.0.
