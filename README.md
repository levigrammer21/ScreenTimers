# Screen Timers · 1.0.0

A private, mobile-first family PWA for two parents, Reid, and Evan. The frontend is ready to upload to **GitHub Pages from the repository root**. The complete Firebase backend, security rules, tests, and deployment instructions are included.

**Start with [SETUP.md](SETUP.md).** The existing `screen-timers` Firebase project is already configured in `config.js`. You still need to create your two parent sign-ins, authorize their UIDs, and deploy the backend. Uploading the web files alone does not deploy Firebase Functions.

## Included

- Separate live time banks, independent timers, and lockouts for Reid and Evan.
- Start, pause, resume, stop; add or deduct time while running; no automatic restart after expiry.
- Exact rational grade calculations, award preview, tap-to-change grades, and separate flat corrections.
- Server-generated audit history with child/event filters, pagination, exact amounts, actors, and award snapshots.
- Light, dark, and system appearance, saved by parent.
- Installable PWA with icons, offline app shell, last-known balances, visible stale status, and online-only mutations.
- Optional per-device FCM push with event preferences and in-app update notices.
- Firestore transactions, request idempotency, scheduled expiry tasks, and a one-minute reconciliation safety net.
- Root-level source, prebuilt Firebase SDK bundles, lockfile, deployment configuration, and executable tests.

The ZIP extracts into **one `screen-timers` folder**, with all supplied code at that folder’s root. No frontend build is required to publish the included static files. Backend code lives at the same root, as requested. Node dependencies are installed only when deploying or developing.

## Everyday use

1. Sign in as either authorized parent. Both children begin at zero with no grades (1×).
2. Tap **Add earned time**. Pick 5/15/30/60 minutes or enter hours/minutes, optionally give a reason, review the grade-adjusted credit, and confirm.
3. Start the timer when screen time begins. Pause freezes the bank; Stop ends the session and preserves unused time. Timers consume time even with both apps closed.
4. Use **Adjust time** for flat additions or deductions. These bypass grades. Deductions require review and floor at zero.
5. Use **Grades** to add letters. Tap a grade to change or delete it. A 1.25×, B 1×, C 0.6×, D 0.1×, F 0×. All letters multiply together.
6. Use **Lockout** to stop usage for a duration. Time already banked stays; new earnings are allowed. Add/subtract the remaining lockout or end it early.
7. Open **History** and expand an event for its exact audit details.

## Exact time policy

Balances are rational **microseconds**, serialized as `{n: "numerator", d: "denominator"}`. BigInt arithmetic reduces fractions after every operation. Even sub-microsecond award remainders are preserved exactly; there is no rounding or discarded remainder. Grade changes cannot alter a prior award. Stored audit snapshots retain the exact grade product and credited amount.

The large countdown rounds **up** to a whole second so positive fractional time does not display as zero. Award previews also print the exact seconds (or an exact fraction when a decimal would be too long). Timer timestamps have 1 ms resolution. Elapsed milliseconds consume precisely 1,000 microseconds each; the next expiry is scheduled at the first millisecond boundary that exhausts the bank.

Bounds: up to 24 grades per child; an earned base award up to 7 days; flat corrections, resulting banks, and remaining lockouts up to 365 days. These limits prevent runaway values while supporting long-running sessions. Reasons are optional and limited to 500 characters.

## How synchronization works

Every persistent change calls an authenticated backend. The backend validates the two-parent allowlist, settles elapsed running time using its own clock, and atomically writes the new child state, immutable audit events, and a request receipt. Reusing a request ID returns its original committed child result with fresh server time. A changed payload with the same ID is rejected.

The browser uses verified server time with a monotonic local clock between syncs. Its wall clock does not decide persisted balances. Firestore snapshots update both parent views, while a local display tick avoids per-second writes. Server clock sync runs on opening, reconnection, foregrounding, and about once per minute.

If a response is interrupted, the app retains the pending request and offers **Confirm change**. Retrying uses that same request ID, including after refresh. The app does not queue new balance or lockout changes offline. An award also verifies that the grades used for its preview have not changed before commit.

Cloud Tasks schedule zero-balance and lockout transitions. Stale tasks check the child’s version and cannot change a newer state. A scheduled reconciliation job recovers missed transitions. Expiry history is idempotent even if task delivery is duplicated. Long lockouts are rescheduled in chunks within Cloud Tasks’ scheduling horizon.

## Privacy and limits

Firestore rules deny browser writes to balances, audit history, request receipts, and enrollment. Parent preferences and device tokens are private to that UID. The web Firebase configuration is public by design; authorization is enforced on the server and in Firestore rules.

This is a parent-managed time bank; it does not integrate with Android/iOS operating-system app blocking. Parents apply the time-use rules on the children’s devices.

Cloud Functions, Cloud Tasks, Scheduler, and related infrastructure require the Firebase Blaze billing plan. Usage may incur charges. The backend is necessary for authoritative shared timers and expiry notifications while both phones are closed.

Push is optional and subject to browser/device support, permission, network, and OS delivery policies. iPhone/iPad push requires a supported installed Home Screen web app. Neither server task delivery nor push is a hard real-time alarm. Logical time expiry is authoritative at its timestamp; history reconciliation or delivery can arrive later. The minute safety net normally catches an unavailable task on its next run, subject to service availability. FCM deliveries can be retried; notification tags reduce duplicate visible notifications. History remains canonical.

Offline shell and last-known balances are cached for the signed-in parent, with controls disabled. Signing in and first-time authorization require a connection. System fonts serve as the fallback if optional Google Fonts cannot load offline.

## Development and validation

Use Node.js 22. Java 21+ is needed for the current Firebase emulator CLI.

```sh
npm ci
npm test
npm run test:rules
npm run build
```

`npm test` runs the exact arithmetic/domain and transactional service tests. `npm run test:rules` starts a demo-only Firestore emulator and runs both security rules and real Firestore transaction/listener tests. It does not write to the live `screen-timers` project. `npm run build` regenerates the bundled Firebase SDKs and validates the PWA assets. `TEST_REPORT.md` distinguishes executed checks from the live-device checks still required after activation.

No sample balances, fake parent login, demo adapter, or QA page is included in the delivered app.
