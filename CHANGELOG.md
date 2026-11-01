# Changelog

## 1.3.0

- Fixed false “Grades changed on the other phone” errors by comparing grade values independently of Firestore map-property ordering.
- Award sheets now refresh their grade snapshot with the displayed preview instead of submitting a stale copy.
- Added a shared task list to each boy’s card: enter a title and time reward, then Complete to credit earned time and remove the task atomically.
- Task rewards use the child’s grades at completion, with the current earned amount shown on each task. Task additions, completions and removals appear in History.
- Simultaneous completion cannot credit the same task twice; retries show the current shared bank.

## 1.2.0

- Removed Cloud Functions and all command-line backend deployment requirements.
- Removed family codes, Create/Join family screens, account enrollment and allowlists.
- Every signed-in account now opens the same shared dashboard with full read/write controls.
- Replaced callable mutations with direct Firestore transactions and Firestore server-time calibration.
- Preserved exact grade math, time banks, lockouts, live synchronization, history, and retry safety.
- Reconciles closed-app elapsed time when a client reconnects; optional notifications are now open-app alerts.
- Added a short setup guide: upload files, publish rules once, sign in.

## 1.1.0

- Added Google/Gmail sign-in and email/password account creation.
- Added Create family / Join family using an in-app share code. Removed the need for manually entered parent UIDs; the first parent can use the app immediately.
- Kept the existing shared children, transactional timers, exact grade math, history, lockouts, and optional push backend.
- Bundled startup into one prebuilt app script; added readable startup recovery states and browser storage fallback.
- Updated setup instructions and regression tests for family enrollment, first-parent rules, and startup recovery.

## 1.0.0

- Complete parent-managed Screen Timers app for Reid and Evan.
- Exact grade-based awards and flat corrections, shared server-authoritative timers, and independent disciplinary lockouts.
- Transactional backend with two-parent authorization, retry idempotency, automated expiry, and immutable audit history.
- Light/dark/system themes, responsive dashboard, history filters and detail views, opt-in per-device push, and an installable offline-capable PWA shell.
- GitHub Pages static files, complete Firebase deployment assets, phone-friendly setup instructions, and executable arithmetic, service, security, and real Firestore integration tests.
