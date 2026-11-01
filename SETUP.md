# Screen Timers 1.2 — simple setup

**No Cloud Functions. No Cloud Shell. No sharing codes. No account allowlist.**

Every signed-in account opens the same shared dashboard and has full access. Google sign-in and email Create account are retained. Existing Reid/Evan documents and history at the original root paths are kept.

## 1. Replace the website files

Extract this ZIP and upload the contents of its single **screen-timers** folder to your GitHub repository root, replacing old files. Keep `index.html` and `app-bundle.js` beside each other. Wait for GitHub Pages to finish updating.

The included app bundle is already built. You do not need to install packages or run any terminal commands to use it.

## 2. Publish these Firestore rules once

Firebase Console → your existing **screen-timers** project → **Firestore Database → Rules**.

Replace the rules with the following and tap **Publish**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

These are also included verbatim in **firestore.rules**. Firebase itself requires access rules; putting the file in GitHub does not publish them. Any signed-in account can read or write app data, as requested. No account has to be approved or added to a list.

If Firestore has not been created yet, create its **(default)** database first. The app creates Reid and Evan automatically on first sync, with zero time and empty grades if those records do not already exist.

## 3. Sign in and use it

Open your published GitHub Pages website. You and your wife can each use **Continue with Google**, or **Create account** for email/password. Both accounts open the same dashboard immediately. There is no Create family or Join family step.

Since Google sign-in already worked in the previous version, you should not need to change it. If setting up from scratch: Firebase Authentication → Sign-in method → enable Google and optionally Email/Password; add your actual GitHub Pages host under Authentication → Settings → Authorized domains.

Award a minute on one phone and check the other phone. Both should show the same bank and timer state.

## What changed

- Timers, grades, lockouts, history, settings, exact fractional time, and live shared updates are retained.
- Changes use direct Firestore transactions, including safe retries. There are no calls to the missing `sync` or `family` Cloud Functions.
- The app checks Firestore server time and uses a monotonic clock between checks, rather than depending on the phone’s wall clock.
- Timers continue logically while the apps are closed. Their remaining time is computed from the saved timestamp; expired timers/lockouts are reconciled and logged when either app next opens. No unused time is lost by closing the browser.
- Optional notifications work while the app is open. Delivery while both apps are closed is not included in this server-free version.
- A refreshed app can show its last-known balance offline with a clear stale label. It refuses new time changes until reconnected.

## If you still see the old error

Close the old app tab and reopen your published website after GitHub finishes deployment. Version **1.2.0** appears at the bottom. If needed, clear this website’s cached browser data and sign in again; the shared Firestore data is not deleted.

If you see a permission error, confirm the new rules above are published in the **screen-timers** project, then tap Reconnect. No terminal or backend deployment is needed.
