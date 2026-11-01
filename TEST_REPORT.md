# Screen Timers 1.2.0 — validation

**29 automated tests passed:** 20 domain/service/startup tests, 3 access-rule tests, and 6 real direct-Firestore integration tests. The production app bundle build and source syntax checks passed.

## Executed direct-Firestore checks

The production `createDirectStore` adapter was run against the Firestore emulator through authenticated client SDK contexts, with the actual supplied access rules. No Admin SDK bypass was used for app operations.

- Two accounts initialize and share the same zero banks automatically, without an enrollment/configuration document.
- Firestore server-time calibration agrees across both client contexts.
- Two live client listeners receive the same state after concurrent direct transactions, without a lost update.
- A third/newly created account can open the same shared data and make a change immediately, as requested.
- A duplicate concurrent request commits once.
- Simultaneous deductions floor at zero and log accurate requested versus actual deductions.
- Closed-app elapsed-time logic reconciles after reopening, stops at zero without automatic restart, and logs one expiry when both parents reconnect.
- Signed-in users have full read/write access; signed-out reads/writes are denied.

The retained pure-domain tests cover exact grade products, 60 minutes × A/B/C/D = exactly 4m30s, immutable award snapshots, fractional remainders, grade-change races, independent children, timer transitions, running corrections, lockouts, and validation. Transaction-service tests cover 100 concurrent operations, idempotency, rollback, and history. Startup tests cover missing script, failed initialization, timeout, local-file URLs, and denied browser storage.

## Execution environment

Node 24.22.1 was available locally; deployment/build guidance targets Node 22. The host has Java 17, so the executed emulator suite used Firebase CLI 14.21.0 and Firestore emulator 1.19.8. The package’s current pinned CLI requires Java 21+ for optional local emulator use. Expected PERMISSION_DENIED logs are passing signed-out denial tests.

## Remaining live checks

The app has not changed the user’s actual Firebase rules or hosting files. The new rules must be pasted and published in the Firebase console, and the new static files uploaded. Actual Google OAuth, physical Android/iOS installation, offline service-worker behavior over HTTPS, and browser notification permission should be checked on the real devices. The existing Google sign-in flow is retained.

There are no Cloud Functions, family codes, account allowlists, privileged backend handlers, or closed-app push in this release. The app is a trusted shared client with all signed-in accounts having full read/write access.

## Browser verification

The production 1.2 bundle rendered its Google/email sign-in screen. An isolated test adapter (not delivered) opened the signed-in dashboard immediately, with no enrollment screen or sharing-code card. Awarding time and starting the timer worked in the UI; Settings showed appearance, open-app alerts, installation and account options, with no invitation controls. Real direct-Firestore integration uses the production adapter separately as described above.
