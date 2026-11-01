# Screen Timers 1.1 — quick setup

This version adds **Continue with Google**, **Create account**, and an in-app **Create family / Join family** flow. You do not need to create parent accounts in the console or copy UIDs anymore.

## 1. Enable sign-in in your existing Firebase project

Open [Firebase Console](https://console.firebase.google.com/), select **screen-timers**, then:

1. **Authentication → Sign-in method → Google → Enable.** Choose your project’s support email and save.
2. Enable **Email/Password** too if you want the email Create account option.
3. **Authentication → Settings → Authorized domains → Add domain.** Add your actual GitHub Pages host, such as `YOURNAME.github.io`, without `https://` or a repository path. Add your custom domain if you use one.

Signing in with Google creates the account automatically the first time. The separate Create account option is for email/password.

## 2. Deploy the Firebase backend and rules

If you have not created Firestore yet, create its **(default)** database in production mode. Keep using the existing **screen-timers** project.

The shared authoritative timers still use the included Firebase Functions backend, Cloud Tasks, and Scheduler. This requires the **Blaze** plan and may incur usage charges. This release simplifies account setup; it does not remove the backend or its deployment requirement.

From your phone, use Google Cloud Shell. Upload and extract this ZIP, open its `screen-timers` folder, use Node 22, then run:

```sh
npm ci
npx firebase login --no-localhost
npm run deploy:backend
```

This deploys the updated `firestore.rules`, indexes, and seven functions, including the new **family** function. Updating GitHub alone does not deploy Firebase. Detailed deployment and IAM troubleshooting are in **DEPLOYMENT_DETAILS.md**.

Do **not** manually create `config/household` or enter UIDs for a new setup. Create family does this automatically. Existing configured families and balances are preserved.

## 3. Upload the updated website

Extract the ZIP and upload the **contents** of its `screen-timers` folder to your GitHub repository root, replacing the old files. `index.html` and **app-bundle.js** must sit together at the root.

In GitHub **Settings → Pages**, publish `main` and `/ (root)`, or use the included optional `github-pages.yml` as `.github/workflows/pages.yml` with GitHub Actions selected as the Pages source.

Open the published HTTPS website, rather than `index.html` from your phone’s file manager. The app bundles its runtime into one script so it no longer relies on separately uploaded Firebase SDK modules at startup.

## 4. Connect you and your wife

1. You tap **Continue with Google** and select your Gmail account, or choose **Create account** to register with email/password.
2. Tap **Create our family** once. Reid and Evan start at zero if no existing data exists.
3. Your family code appears on Home while waiting for your partner, and in **Settings**.
4. Your wife signs in using her own Google account or creates her own email account.
5. She pastes your code under **Join our family**.

You now share the same Reid/Evan time banks, timers, grades, lockouts, and history. Both parents have the same everyday controls. Your first account can use the app immediately, before the second account joins.

Existing 1.0 accounts still work. If an existing family already contains two different accounts, sign in with those original accounts rather than creating additional parent identities. Creating another Auth account does not reset the family or overwrite its balances.

## 5. Install, verify, and optional notifications

On Android Chrome, use **Install app**. On iPhone/iPad, use Share → Add to Home Screen. Open both parent accounts, award a minute, and confirm that both phones see the same balance and timer changes.

For optional push, add the public Firebase VAPID key in `config.js`, run `npm run build` to update the bundle, upload the resulting files, and enable notifications on each device in Settings. Full instructions and delivery limitations are in **DEPLOYMENT_DETAILS.md**. Shared in-app data works without notification permission.

## If startup still fails

The initial screen now has recovery messages for a missing app bundle, initialization errors, slow initialization, and downloaded-file URLs. If you get an error, its exact text will help identify the deployment issue.

After replacing files, close old app tabs, reopen the published website, and refresh. If an older installed copy persists, clear this website’s cached site data in the browser, then sign in again. Clearing local browser data does not delete the family’s Firestore data, though you should confirm any pending change before clearing it.

The live Google OAuth flow cannot be verified until Google is enabled and your actual website domain is authorized in your Firebase project. No live Firebase settings or accounts were changed during this build.

Official references: [Google sign-in](https://firebase.google.com/docs/auth/web/google-signin) and [Firebase account creation](https://firebase.google.com/docs/auth/web/start).
