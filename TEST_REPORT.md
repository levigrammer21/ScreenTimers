# Screen Timers 1.1.0 — validation

**35 automated tests passed:** 26 domain/service/family/startup tests, 6 Firestore rules tests, and 3 real Firestore transaction/listener/enrollment integration tests.

The production build and backend import/export checks passed. This package contains seven Firebase backend exports, including the new `family` callable.

## New behavior checked

- First signed-in parent creates the family without any manually configured UID and can immediately award time.
- A second account joins by normalized family code; both parent identities can modify the same child bank.
- Wrong codes, unconnected accounts, and a third parent are refused; concurrent join attempts cannot exceed the two-parent limit.
- Enrollment retries do not reset a family. Existing two-parent configurations retain their data and membership.
- Real Firestore transactions and rules permit the first parent alone, then the second parent after joining.
- Existing exact arithmetic, immutable awards, simultaneous adjustments, timer lifecycle, lockouts, request deduplication, history, and two live listeners continue to pass.
- Startup uses a single prebuilt script. Tests execute the startup recovery handler for missing script, rejected initialization, timeout, and local-file origin.
- Denied localStorage access falls back to memory so sign-in can still render.

## Browser checks

The actual production app bundle rendered the Google sign-in button, email login, and email Create account screen successfully. No production sign-in or account creation was submitted during testing.

A separate isolated browser adapter, not included in this ZIP and with no Firebase connection, exercised the production UI and actual family/domain/service logic: simulated Google sign-in → Create family → award five minutes → switch to a separate partner identity → Join family by code. The partner view showed the same five-minute bank, with the zero-bank child’s Start button correctly disabled.

## Execution environment

Node 24.22.1 was available locally; deployment targets Node 22. Java 17 was available, so emulator checks used Firebase CLI 14.21.0 and Firestore emulator 1.19.8. The package retains its current pinned CLI; use Java 21+ to run its `npm run test:rules` command. All integration writes targeted demo projects only. Expected PERMISSION_DENIED logs are passing security assertions.

## Not yet verified on the user’s live deployment

The real Google OAuth flow, provider enablement, authorized website domain, deployed callable endpoints, production IAM, task delivery, actual push, and physical Android/iOS installation still require Firebase activation and real devices. None of the user’s live Firebase settings, accounts, or data were changed. The earlier indefinite-loading report’s precise production cause remains unconfirmed without its URL/error; this version removes the module-file chain and adds actionable startup errors.
