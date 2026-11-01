# SCREEN TIMERS — IMPLEMENTATION HANDOFF

## Mission
Build a COMPLETE, polished, production-ready, mobile-first private family Progressive Web App named **Screen Timers**. It is used only by two authorized parents to manage separate earned screen-time banks for **Reid** and **Evan**. Both parents see and control the same live state. Do not ship placeholders, fake functionality, or a superficial MVP. Implement, test, and document deployment. The user will publish to GitHub and provide any necessary Firebase console setup/access. Do not request a new Firebase project.

## Infrastructure
- Static frontend hosted on **GitHub Pages**; use a framework/build configuration compatible with the repository's Pages base path. Installable PWA with icons, manifest, service worker, responsive design, and offline shell.
- Existing Firebase project ID: `screen-timers`; auth domain `screen-timers.firebaseapp.com`; storage bucket `screen-timers.firebasestorage.app`; messaging sender ID `300347806510`; app ID `1:300347806510:web:5ef0c68baf2d212349a0bf`; web API key `AIzaSyAvHnUT8Xqb9WPs5RBHLs8cM7cyIKt4xW4`.
- Firebase Authentication for exactly two allowlisted parent UIDs. No public sign-up, child login, or guest access. Both parents have equal day-to-day permissions. Supply secure bootstrap instructions to establish the allowlist without publicly writable enrollment. Protect Firestore with rules checking authentication AND allowlist/household membership; do not rely on hidden UI. Do not expose service-account credentials.
- Cloud Firestore as source of truth, real-time listeners for both phones, transactions for atomic modifications and concurrency safety. No per-second Firestore writes. Consider a trusted Firebase Cloud Functions/Cloud Run backend for privileged operations and push notifications; explain any necessary Blaze billing/deployment requirements. A browser alone cannot reliably dispatch push notifications when closed.
- Notification permission is opt-in and settings are per parent/device. Support web push where technically possible, including iOS installed-PWA limitations; gracefully fall back to in-app notices when unavailable. Never claim push is universally guaranteed.

## Screen-time earning and grades
- Two permanent child profiles: Reid and Evan, each with separate bank, grades, grade multiplier, timer, lockout, and history. No bulk actions.
- Both begin with bank 0 and no grades. Empty grade list has multiplier **1.0**.
- Letter grades only, NO subjects: A=1.25, B=1.0, C=0.6, D=0.1, F=0. Grade list supports add, tap-to-change, and delete. Combined multiplier = product of every listed grade's multiplier. F forces zero new earned time.
- Grades affect **new earned awards only**; never retroactively modify banked balances or prior awards. Capture multiplier and base amount as an immutable award snapshot in history.
- Parent manually selects child and awards hours/minutes with optional reason. Quick presets: 5, 15, 30, 60 minutes plus custom duration. Show base, multiplier, and final credited amount before confirmation. Activities (chores, reading, exercise, homework, etc.) are free-text reasons, not fixed lists.
- Exact fractional seconds must not be lost. Prefer integer microseconds (or another exact integer smallest unit) and rational multiplier arithmetic (A 125/100, B 1, C 60/100, D 10/100, F 0). Define deterministic handling of sub-microsecond remainders, if any, and test precision. UI counts down to seconds; retain fractional subsecond value in storage and calculations.
- Separate **flat manual corrections**: add or deduct time without grade multiplier; optional reason. Deductions floor at zero; no debt/negative balance. Log requested and actual deducted amount if different. Either parent may correct forgotten timer usage.

## Active screen-time timer
- Per child states: STOPPED, RUNNING, PAUSED. Tap Start, Pause, Resume immediately without confirmations; Stop ends session and preserves unused balance. No maximum session duration. The timer continues while apps are closed and counts down until manually paused/stopped, a lockout begins, or the bank reaches zero.
- A running timer continuously consumes that child's bank. Implement as persisted checkpoint balance + server-authoritative started-at timestamp and state; calculate effective balance from elapsed time, clamped at zero. On state-changing actions settle elapsed consumption atomically first, then apply the action. Use authoritative backend timestamps or verified server time strategy to prevent device clock differences and stale clients causing inconsistent balances. Reconcile automatically at zero even if no client is open, especially for notifications.
- Add/deduct bank time while RUNNING without pausing. New balance takes effect immediately and countdown continues. Deducting to zero stops the timer. Each child can run independently. Simultaneous operations from parents must serialize correctly; no double spend, negative balance, lost updates, or duplicate actions. Use idempotency keys for retries.
- Pausing freezes the remaining bank; resuming restarts from it. If a timer reaches zero, it stops automatically. If time is later awarded, it does not automatically restart.
- Both parents see matching state, remaining time and control changes promptly through Firestore listeners; the displayed countdown can tick locally between sync updates. Indicate stale/offline status; do not silently queue punitive or financial-like mutations that may conflict. Disable or explicitly mark writes until confirmed by backend.

## Disciplinary lockouts
- Separate per-child lockout restricting **use** of screen time, NOT the bank balance or ability to earn more. Lockouts can be initiated for custom duration in minutes/hours/days, optional reason, with visible live countdown for both parents.
- A lockout starts immediately, auto-stops any active screen-time session, and prevents Start/Resume while active. Bank remains intact and can increase from earned awards or manual corrections during lockout.
- Add time to the **remaining** lockout (e.g. 2d10h remaining +2d =4d10h); subtract time, floor at zero; or end early. Lockout expires automatically at timestamp; do not auto-start screen-time timer. Record all changes and actor.
- Use authoritative expiry timestamps; avoid requiring open browser for expiration. Display remaining days/hours/minutes/seconds. Consider expired status derived from server time plus backend reconciliation for notifications.

## UX / visual design
- Extremely simple, polished, premium-feeling mobile-first UI. Responsive desktop displays Reid/Evan side by side; mobile stacks two prominent cards. Each card shows name, live bank time, Running/Paused/Stopped/Locked status, grade multiplier, lockout remaining, and prominent Start/Pause/Resume plus Add Time action. Easy access to Deduct, Grades, Lockout.
- Large accessible touch targets, restrained rounded cards, strong hierarchy, excellent typography, subtle purposeful animation, clear status colors, no clutter. Support Light, Dark, and Auto (system) themes, saved per parent independently. Design BOTH themes thoroughly.
- Home, History, Settings navigation. Use concise modals/sheets for awards, deductions, grade editor, and lockout changes. Keep routine actions within 1–2 taps where practical. Start/Pause/Resume instant; confirm destructive/punitive actions such as lockout start/end, large deductions, and grade deletion. Avoid double-submit. Reasons always optional.
- Show exact award preview and resulting balance before commit; indicate successful committed change, not merely optimistic UI. Provide meaningful error states and accessibility labels/keyboard support.
- History is retained indefinitely by default, newest first, filter by child and type. Every significant event records parent UID/display name, child, server timestamp, action, reason if supplied, before/after effective balances or lockout durations, grade snapshot as relevant. Log awards, flat adjustments, timer start/pause/resume/stop/expiry, grade changes, lockout start/change/end/expiry. Prevent client tampering with history; prefer trusted server-generated audit events. Avoid double-logging automated transitions.
- Notifications configurable per parent: screen time expired, lockout expired, lockout started/adjusted, time adjustments by other parent, grades changed. Deep-link to relevant child. Avoid notifying the acting parent for their own action unless specifically configured. In-app history remains canonical.

## Security and reliability
- Implement and provide deployable Firestore rules, indexes, any Cloud Functions and PWA service worker, and setup instructions. Do not treat Firebase web config as a secret; enforce authorization server-side.
- Never allow arbitrary client-written balances or audit records without validation; implement trusted mutations through backend functions or tightly validated Firestore rules. Verify authorized UID on every operation. Protect notification tokens by user.
- All balances and durations nonnegative and bounded against unreasonable values. Use explicit time zones for display, UTC timestamps for storage. Avoid client local-clock dependence for persistent truth. Implement state versioning / transactions and idempotency for near-simultaneous parent edits.
- PWA offline: cached app shell and last-known state may display with clear 'offline/stale' label; server-authoritative writes cannot be claimed successful offline. On reconnect refresh and reconcile.
- Privacy: no public child profiles or unnecessary personal information. Keep secrets out of GitHub. Ensure PWA cache updates reliably after releases.

## Initial setup / deployment
- First launch: both child banks zero, grades empty -> multiplier 1.0, no active timers/lockouts. Provide a controlled one-time seed/init flow that is idempotent and restricted to authorized parent or admin deployment.
- Document exact Firebase console steps: enable Email/Password sign-in, create only two parent accounts, obtain UIDs, configure allowlist/security, create Firestore, deploy rules/indexes/functions if needed, register GitHub Pages authorized domain, set up FCM/VAPID/web push where supported, and deploy static app.
- Provide the complete repository, clear README, configuration examples, and a GitHub Pages publishing workflow. Reuse provided project; ask for missing deployment credentials or authorized UID values only when genuinely necessary. Never hardcode passwords or service account keys.

## Acceptance tests (must actually execute as applicable)
1. Empty grades produce 1x; A+B+C+D -> 0.075x; 60m award -> exactly 4m30s. F -> zero earned; flat correction still works.
2. Change D to B after award: previous credited time unchanged; subsequent awards use new multiplier.
3. Repeated small awards preserve fractional seconds accurately without drift.
4. Both children initialize zero and are independent. Neither bank can become negative.
5. Start timer, close/reopen app, pause/resume, stop; balance reflects actual elapsed time, unused time remains. Run both timers simultaneously.
6. Adjust running timer up/down; it continues; deduction to zero stops it. Simulate forgotten timer and manual add-back.
7. Start lockout while running: timer stops, bank intact; earn during lockout; cannot start while locked; add/subtract remaining lockout; expiry does not auto-start timer.
8. Two authorized accounts on different devices/browsers observe synchronized changes; simultaneous operations don't overwrite or double-deduct.
9. Third-party/unauthenticated user cannot read or write household data or invoke mutations.
10. History entries include accurate actor/time/amount, including requested vs actual deduction, and filters work.
11. Light/Dark/Auto, responsive mobile/desktop, installable PWA, offline/stale state, browser refresh, notification permission denied, push supported/unsupported paths.
12. Production build passes; no placeholders, mock data in live screens, broken buttons, console errors, or unfinished workflows.

## Work instructions
Implement the app end-to-end, not merely a design or prototype. Make reasonable engineering decisions consistent with these rules. Test thoroughly, explain any unavoidable platform limitations, and deliver deployable files plus a concise setup guide. Do not alter agreed behavior. Ask only for genuine blockers such as Firebase access, account UIDs, or repository information. The user's workflow is phone-first and they will publish to GitHub themselves.
