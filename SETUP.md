# Screen Timers — activation and publishing

Use your existing **screen-timers** Firebase project. Everything below is a one-time setup unless you release an update. You can do it from your phone: use your browser’s desktop-site mode for consoles, and Google Cloud Shell for terminal commands.

## 1. Create the two parent accounts

1. Open [Firebase Console](https://console.firebase.google.com/) and select **screen-timers**.
2. In **Authentication → Sign-in method**, enable **Email/Password**. Leave email-link sign-in off unless you separately want it; this app uses passwords.
3. In **Authentication → Users → Add user**, create the first parent’s email/password, then the second parent’s. Keep passwords out of GitHub and this source code.
4. Copy the **UID** of each account. They must be distinct. These are the only two authorized parents; creating an Auth account alone never grants household access.
5. In **Authentication → Settings → Authorized domains**, add your GitHub Pages host (for example, your actual `USERNAME.github.io`, without a scheme or repository path). Add a custom domain too if you use one.

The app has no public sign-up, guest access, or child sign-in.

## 2. Create Firestore and the private allowlist

1. In **Firestore Database**, create the **(default)** database in **production mode**. Choose a suitable US location; the functions are configured for `us-central1`.
2. Create collection **config**, document **household**.
3. Add field **parentUids**, type **array**, containing exactly two **string** entries: the first parent UID and the second parent UID. No other fields are required.
4. Do not enable test-mode/open rules. The restrictive `firestore.rules` in this package must be deployed in step 4.

You create this document with your Firebase administrator’s console access. The website cannot read, edit, or create enrollment documents. An authorized first sync initializes Reid and Evan with zero balances, no grades, no running timers, and no lockouts. Repeated syncs do not overwrite existing data.

An alternative admin-only initializer is provided as `bootstrap.js`. It uses Application Default Credentials; never put a service-account key in this project. After setting up trusted ADC, its form is:

```sh
node bootstrap.js FIRST_PARENT_UID SECOND_PARENT_UID
```

Use either the console allowlist method or this script. Both retain existing child balances.

## 3. Prepare billing and the deployment terminal

The authoritative backend uses Functions (2nd gen), Cloud Tasks, Scheduler, and Firestore. Enable the **Blaze** plan on `screen-timers` and set a budget alert appropriate for you. The app is not a static-only/free-tier backend deployment.

Open [Google Cloud Console](https://console.cloud.google.com/), select `screen-timers`, and open **Cloud Shell**. Upload the delivered ZIP using Cloud Shell’s Upload menu. In the terminal:

```sh
unzip screen-timers-1.0.0.zip
cd screen-timers
node --version
npm ci
npx firebase login --no-localhost
```

Use Node.js **22** for deployment. If your Cloud Shell has another version, install/select Node 22 with its available version manager before `npm ci`. Complete Firebase login using the account that administers this project. No Firebase service-account key is needed for normal CLI deployment.

The ZIP filename above assumes you kept the supplied filename. Adjust it to your actual downloaded filename if your phone renames it.

## 4. Deploy security rules, indexes, and all six backend functions

```sh
npm test
npm run deploy:backend
```

The deploy script targets `screen-timers` explicitly. Accept the Firebase CLI’s required API-enablement and artifact-retention prompts as appropriate. The CLI may ask you to finish a one-time Google Cloud permission or service identity setup; follow its reported error rather than opening Firestore access.

The deployed exports are:

| Function | Purpose |
| --- | --- |
| `action` | Authenticated, transactional parent mutations |
| `sync` | Authorized initialization, reconciliation, and server time |
| `scheduleExpiry` | Schedule the child’s next expiry after a state change |
| `expire` | IAM-protected Cloud Tasks handler |
| `expirySafetyNet` | One-minute scheduled reconciliation |
| `notify` | Event-triggered optional push delivery |

The runtime service account is explicitly set in `backend.js` to:

`300347806510-compute@developer.gserviceaccount.com`

If deployment or task dispatch reports IAM errors, verify this service account exists for your project and grant the following roles. The commands below are admin setup commands you run in Cloud Shell; they change access only for this runtime identity. They do not grant browser users direct database access.

```sh
gcloud services enable cloudfunctions.googleapis.com run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com cloudtasks.googleapis.com cloudscheduler.googleapis.com eventarc.googleapis.com pubsub.googleapis.com fcm.googleapis.com --project=screen-timers

gcloud projects add-iam-policy-binding screen-timers --member=serviceAccount:300347806510-compute@developer.gserviceaccount.com --role=roles/datastore.user
gcloud projects add-iam-policy-binding screen-timers --member=serviceAccount:300347806510-compute@developer.gserviceaccount.com --role=roles/cloudtasks.enqueuer
gcloud projects add-iam-policy-binding screen-timers --member=serviceAccount:300347806510-compute@developer.gserviceaccount.com --role=roles/cloudfunctions.viewer
gcloud projects add-iam-policy-binding screen-timers --member=serviceAccount:300347806510-compute@developer.gserviceaccount.com --role=roles/firebasecloudmessaging.admin
gcloud iam service-accounts add-iam-policy-binding 300347806510-compute@developer.gserviceaccount.com --project=screen-timers --member=serviceAccount:300347806510-compute@developer.gserviceaccount.com --role=roles/iam.serviceAccountUser
```

The task function declares that runtime account as its invoker. Confirm that it has **Cloud Run Invoker** on the underlying `expire` Cloud Run service (Console → Cloud Run → expire → Permissions). If the CLI did not set the binding:

```sh
gcloud run services add-iam-policy-binding expire --region=us-central1 --project=screen-timers --member=serviceAccount:300347806510-compute@developer.gserviceaccount.com --role=roles/run.invoker
```

Cloud Tasks’ Google-managed service agent must retain its standard Cloud Tasks Service Agent role. Do not make `expire` public to resolve a task error. The `action` and `sync` HTTPS callable endpoints must be reachable from the web; each enforces Firebase Authentication and the private allowlist in code. Set no public browser writes in Firestore.

After deployment, confirm:

- Firestore rules show your deployed deny-by-default rules, and composite indexes finish building.
- Cloud Tasks has the `expire` queue in `us-central1`.
- Cloud Scheduler has the Firebase-created safety-net job.
- Functions logs show no permission errors when starting a short timer.

## 5. Publish to GitHub Pages — easiest phone workflow

1. Create or open your GitHub repository.
2. Extract the ZIP on your phone. Open its single `screen-timers` folder.
3. Upload **the contents of that folder** to the repository root. `index.html` must be at the root; do not upload an enclosing `screen-timers` folder into the repository.
4. Open **Repository Settings → Pages**.
5. Select **Deploy from a branch → main → / (root)** and save.
6. Wait for GitHub to finish its Pages deployment, then open the URL GitHub displays.
7. Sign in as the first parent, then open the same URL on the other parent’s phone and sign in with their own account.

All asset URLs, the manifest, the service worker, and notification links work below a GitHub Pages repository path. No base-path edit is required. HTTPS is required for installation and web push.

### Optional automated Pages workflow

A ready-to-use **github-pages.yml** is included at the source root. To use it, create `.github/workflows/pages.yml` in GitHub and paste that file’s contents. Then choose **GitHub Actions** as the Pages source. This workflow tests the domain, rebuilds SDK bundles, and publishes only the static app files. It does not deploy Firebase or require Firebase admin secrets. The only nested path needed for this optional workflow is GitHub’s required `.github/workflows/` directory; all application source stays at the repository root.

For phone-only publishing, the branch/root method above is sufficient.

## 6. Optional push setup

1. Firebase Console → **Project settings → Cloud Messaging**.
2. Ensure the **Firebase Cloud Messaging API (V1)** is enabled.
3. Under **Web Push certificates**, generate a key pair if none exists.
4. Copy only the **public VAPID key** into `vapidKey` in `config.js`. This public key belongs in the frontend; never paste a private key or service-account JSON.
5. Publish the updated `config.js` (and rebuild/upload the static files if changing other configuration). No additional app-server secret is required for FCM sends from the deployed Admin SDK.
6. On each parent’s device, open the app, go to **Settings → Notifications → Enable on this device**, and grant permission if desired.
7. Set event preferences for that device. By default, a parent is not notified about their own actions; expiry events go to both opted-in parents.

Android: use a supported browser such as Chrome and install the app when offered. iPhone/iPad: install to the Home Screen and open the installed app before requesting push. Unsupported browsers, missing configuration, and denied permission have explanatory in-app states; the shared history works without push.

The registered `sw.js` handles both app caching and Firebase background notification messages through its prebuilt `push-sdk.js`. No separate root-only messaging-worker filename is needed because the client passes this service-worker registration to FCM.

## 7. Live acceptance pass

Before relying on the family setup:

1. Confirm both initial banks are zero. Add A, B, C, D to Reid; award 60 minutes and confirm exactly 4:30. Change D to B and verify that the prior 4:30 remains.
2. Use a flat correction to add one minute to Evan. Start both timers. On the other phone, pause one while leaving the other running. Close/reopen and confirm the correct remaining balance.
3. Adjust a running bank up and down. Deduct more than remains and confirm it stops at zero. Add-back should leave it stopped.
4. Start a short lockout while a timer is running. Confirm the bank stops decreasing, earning still works, and Start remains disabled. Adjust remaining lockout in both directions. Expiry must not start the timer.
5. Make simultaneous corrections from both phones; verify neither change is lost and History records each parent accurately.
6. Leave both apps closed through a short expiry, reopen, and verify the system history entry. If enabled, check push on both actual devices.
7. Switch Light/Dark/Auto. Install the PWA. After one successful online launch, go offline and reopen; the shell/last-known bank should display a stale banner and refuse mutations. Reconnect and confirm controls recover.
8. Try an account whose UID is not on the allowlist. It must have no shared data access.

## Updates, recovery, and maintenance

- For a release, increment `VERSION` in `domain.js`, package version, and `CACHE` in `sw.js`. Regenerate SDK bundles if their dependencies or bundled configuration change. Publish all changed static files together.
- Settings has **Check for app updates**. An installed service-worker update claims clients and reloads into the new version. Pending mutation IDs survive refresh. Unsaved form entries do not.
- History and request receipts have no TTL; they are retained indefinitely. Receipts preserve retry idempotency. Do not delete them casually.
- Never edit a bank directly in the console for routine corrections; use the app so the audit record stays accurate.
- If login works but access is denied, check the two exact UIDs in `config/household`, deployed rules, Functions deployment, and project selection. Do not relax security rules.
- If countdowns render but closed-app notifications fail, check device permissions, VAPID setup, Cloud Tasks IAM, Functions logs, and Scheduler status. Time-use expiry and push delivery are separate observations.

Official references: [Firebase task queues](https://firebase.google.com/docs/functions/task-functions), [FCM web setup](https://firebase.google.com/docs/cloud-messaging/web/get-started), [FCM background delivery](https://firebase.google.com/docs/cloud-messaging/web/receive-messages), and [Apple web push](https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers).
