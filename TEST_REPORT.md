# Screen Timers 1.0.0 — validation report

## Executed checks

**24 automated tests passed: 17 domain/service tests, 5 Firestore security-rule tests, and 2 real Firestore transaction/listener integration tests.** Production SDK bundling, required-PWA-file checks, JavaScript syntax checks, and backend module/export loading also passed.

| Area | Executed evidence |
| --- | --- |
| Grade arithmetic | Empty grades = 1×; A/B/C/D = 3/40×; 60 minutes = exactly 270 seconds; F = zero earnings; flat corrections bypass grades. |
| Immutable awards | Later grade edits preserve prior credit; stale grade edits and stale award previews are rejected. |
| Precision | 10,000 sub-microsecond test credits and 1,000 grade-adjusted repeated awards retain exact rational totals. |
| Bank independence | Both children seed at zero; separate banks/states; deductions never make a bank negative. |
| Timer lifecycle | Serialization/reopen logic, elapsed consumption, pause/resume/stop, running adjustments, deduction to zero, and fractional expiry boundaries. |
| Lockouts | Running timer stops at lockout initiation; earnings remain allowed; starting while locked fails; remaining time is extended/shortened correctly; expiry does not restart usage. |
| Concurrency | 100 concurrent service awards; real Firestore concurrent awards from two parent identities; real simultaneous running deductions; no lost updates or overspending. |
| Retries | Duplicate concurrent request IDs commit once; changed payload with a reused ID fails; repeated automated reconciliation logs one expiry. |
| Security | Authenticated allowlisted parents can read; anonymous and third-party users cannot read; even parents cannot directly write balances/history/requests/allowlist; private preferences and tokens enforce ownership and schema. |
| Audit | Server-side actor, timestamps, requested/actual amounts, immutable grades, and system-expiry attribution. |
| Real-time | Two distinct authenticated Firestore client listeners receive the same state after concurrent backend transactions. |

Security tests intentionally produce `PERMISSION_DENIED` logs for forbidden operations; these are passing denial assertions, not unexpected failures.

## Browser checks executed

The actual production sign-in screen rendered successfully. Authenticated UI workflows were exercised through a separate isolated browser test adapter using the same production UI and domain logic. The adapter had no Firebase production connection and is **not included in the ZIP**.

Verified in the browser:

- Initial zero banks, no grades, and disabled zero-balance Start buttons.
- Add multiple grades; tap an existing grade and change it.
- Award preview: A/B/C/D + 60 minutes displays exactly 4:30 and 270 exact seconds.
- Award commit, optional reason, Start, Pause, Resume, and live countdown.
- Start a lockout while running; Start becomes disabled and the bank stops; award more time during the lockout; end the lockout without auto-restarting.
- Flat deduction review and confirmation, including a request larger than the available bank, resulting in zero.
- History event filtering and expanded exact award/actor/before/after audit details.
- Responsive 390-pixel mobile viewport with stacked cards and bottom navigation, plus the desktop two-column layout.
- Light and dark appearance.
- Simulated offline banner with mutation controls disabled.
- No remaining application-origin console exceptions during the inspected final UI flows. Browser-extension telemetry errors were unrelated to the app.

## Environment and reproducibility

Local execution used Node 24.22.1. Deployment and the optional Pages workflow target Node 22. The Firebase backend imported successfully and exposed all six expected functions. The package pins its SDK/build/CLI dependencies in `package-lock.json`.

The host has Java 17. The current pinned Firebase CLI requires Java 21+, so the executed emulator tests used a separate Firebase CLI **14.21.0** with Firestore emulator **1.19.8**. That test-only CLI is not shipped. The package’s `npm run test:rules` uses its current pinned CLI and should be run with Java 21+.

Commands executed:

```text
npm test
firebase emulators:exec --only firestore --project demo-screen-timers 'node --test rules.test.js integration.test.js'
npm run build
node --check app.js
node --check firebase-client.js
node --check backend.js
node --check sw.js
```

Emulator commands used demo projects only. No live family balances, Auth accounts, Firebase configuration, IAM permissions, or deployments were changed.

## Requires live activation/device verification

These checks cannot be truthfully marked complete without the project owner’s Firebase deployment and two actual parent accounts/devices:

- Live Auth sign-in and callable endpoints in the provided project.
- Production Functions/Cloud Tasks/Scheduler deployment, service account IAM, closed-app expiry dispatch, and FCM sends.
- Actual Android/iOS installation, service-worker offline behavior over HTTPS, update delivery, and notification permission/OS delivery paths.
- The final two-phone live acceptance pass in `SETUP.md`.

The implementation, rules, backend, icons, service worker, SDK bundles, and setup guide are supplied. Firebase is not activated merely by uploading frontend files to GitHub Pages. Optional push requires the project’s public VAPID key, which was not provided.
