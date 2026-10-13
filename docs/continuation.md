# Continue Tero development

Checkpoint: 14 October 2026, Africa/Nairobi.
Workspace: `/home/laniina/pherus/tero`, branch `main`. The owner authorized a
checkpoint commit and push on 14 October; use `git log -1` for its current hash.

## Rest checkpoint: notification polish and next steps

The owner asked to save knowledge, commit and push, then rest. Do not restart
full suites, rebuilds or notification probes on continuation without a relevant
change. Preserve both device accounts, current registry and auth secret.

- Android FCM is connected. Two focused generic checks reached Expo; the second
  had ticket OK, provider receipt OK and a posted Android OS notification. The
  owner then confirmed a real notification appeared on Android. This does not
  prove all chat/push lifecycle cases. A message sent from iPhone should alert
  Android; the reverse direction needs the iPhone APNs credential.
- Owner chose **show sender's name** after being told it exposes the name to
  the provider/lock screen. Sending clients now provide their decrypted self
  display name (bounded, control characters rejected), and the alert title uses
  it. Body remains New message. Older clients still send generic titles until
  updated. Non English new text still needs native review.
- New notifications include an encrypted routing pointer scoped to recipient
  and expiry. Authenticated `/api/push/open` checks the current accepted contact
  and returns the peer. The client opens that chat after unlock/connection. The
  pointer survives mailbox consumption. Older/expired/unavailable alerts fall
  back to Messages. Raw DIDs and private message bodies do not enter push data.
  Added wake route/name columns without resetting storage. Implementation is
  recorded in `docs/specs/_root/0002-chat-notification-routing.md` as Assumed;
  do not claim its routing behavior independently verified.
- Android keyboardDidShow now requests scroll to latest after layout. Existing
  local chat history renders before handshake/pending checks, then Send readiness
  updates. Accepted contact authorization remains. Owner confirmation of both
  latest UI changes is outstanding.
- Dedicated white transparent 96 px notification icon is rendered from
  `design/assets/app-icon-notification.svg`. Applied only Expo's official Android
  notification config plugin, preserving C++ cache. APK built in **1m20s**, 501
  tasks up-to-date, log `/tmp/tero-notification-icon-build.log`. Installed using
  `adb install -r` (Success) and reopened, preserving account and chats.
- Android channel importance 4, system sound selected, POST_NOTIFICATIONS granted,
  volume 15/15 and Do Not Disturb 0. Foreground Android system banners/sound are
  enabled. Actual audible sound and new icon/tap behavior need owner confirmation.
- **iOS TestFlight build 18** is in progress, with auto submission scheduled.
  Build `b672f1cd-a179-4255-b4bc-6bc656c81477`, submission
  `116cde73-b94a-4bf3-aa0b-12a6ecd513f2`, log
  `/tmp/tero-notification-routing-ios.log`, exec session 57397. Monitor it; do
  not submit another duplicate build. Includes sender name/tap routing and JS
  chat/keyboard fixes. Build 17 is already FINISHED/submitted.
- **APNs service key remains missing.** Existing profile has push entitlement,
  but signing capability alone cannot send iOS pushes. EAS Apple login expired.
  Prepared executable `/home/laniina/tero-push`; the owner can type `~/tero-push`
  in their normal terminal, choose testflight → Push Notifications → set up a
  push key, and log in to Apple locally. No password in chat, no Developer Mode.
  It has not been run/completed by the owner yet. Service diagnostics now include
  a rejected InvalidCredentials ticket, consistent with the missing Apple key;
  do not assume every such ticket belongs to Android (Android check succeeded).
- Focused app/edge typechecks, scoped app lint and whitespace checks passed. No
  full suites or production Worker deployment were performed. Native warnings
  during builds are dependency deprecations. Keep Metro/API running for owner.
- Owner explicitly authorized commit and push on main. Checkpoint commit uses
  `[skip ci]` to honor the existing request to defer full test suites, including
  GitHub's automatic push workflows. A staged scan found no private key markers,
  credential files, device databases or APK/IPA files. Firebase client JSON is
  public configuration and is included; the FCM private sending key is only in
  EAS. The Apple login launcher is outside the repo and is not committed.
- Metro session 97061, `/tmp/tero-metro-restore.log`, localhost8084, one worker,
  EXPO_OFFLINE1. Shared API session20692, port8794, original config/state.
  USB 8081→8084 and8794→8794 restored. Both health checks passed after install.

Next: monitor build18/submission; finish human Apple push login/key setup; then
confirm actual iPhone alert delivery and notification tap/icon/sound with the
owner. Further implementation should follow the existing Help/Gathering/Circles
handoff below, preserving the original tab icons and compact Help cards.

### Real chat confirmed; unread and notification work, 14 October 2026

Latest Firebase correction (after the owner completed Google login):

**Latest Android result:** Firebase-enabled APK is now built and installed.
Finished the cached app C++ build directly with Ninja `-j1` (18 tasks; no source
changes), then Gradle packaging succeeded in 2m9s, 465 tasks up-to-date. Log
`/tmp/tero-fcm-package.log`. Installed using `adb install -r` (Success), restored
both USB reverse routes and reopened the app. APK resources contain
`google_app_id` and `gcm_defaultSenderId`. Metro 8084 and API 8794 remained healthy.
This supersedes interrupted-build notes below. No notification was injected or
full suite run; actual receipt/display still needs owner confirmation after
unlocking and enabling notifications. Apple APNs key is still unconfigured.

Owner then reported a notification error and slow loading of existing Android
chats. Metro showed the exact Expo warning: custom sound `default` not found.
SDK 57's native channel manager treats a supplied sound string as a custom
filename; omitting the field selects the system default. Removed `sound` from
the client channel options (the remote push payload's `sound: default` is a
separate supported API and remains). Local API logs show successful 204 device
registrations; this proves registration, not alert delivery. `ChatDelivery.start`
now publishes native saved history before handshake/pending checks, and starts
the Tor node afterward. Sending still waits for native established/pending
checks; fresh server accepted-contact authorization remains before chat open.
These JavaScript changes use Metro; no native rebuild/full suite was run.

Latest notification/keyboard follow-up: owner still saw no notification, and
Android keyboard opening left the message list above the latest message. Added
keyboardDidShow → next-frame scrollToEnd and set latest-position state. Added
sanitized fixed-code Expo ticket/receipt/HTTP diagnostics in ChatPush; tokens,
provider bodies and message content are never logged. App/edge typechecks and
scoped app lint passed.

Read-only local inspection found 2 device registrations, 5 completed wake jobs
matching registered owners, and no retained receipts. Android POST_NOTIFICATIONS
was granted, Messages channel importance 4 with system default sound. Android
was foregrounded, and the app notification handler explicitly suppressed its
foreground system banner/sound. Changed Android to allow system alerts even
while unlocked/foregrounded; iOS foreground behavior remains unchanged. Ran two
focused generic notification checks to the owner's Android registration only
(Fool identity, derived tag; token/secret only in process memory). Initial check
ticket accepted; after the handler change, Expo ticket OK, provider receipt OK,
and Android dumpsys notification reported 1 Tero OS notification record. This
proves that focused FCM check reached Android's notification system, not every
real-chat/background lifecycle edge. No full suite or rebuild was run. The
asynchronous question requesting one real iPhone→backgrounded Android message
may still be awaiting the owner's answer. APNs sending key still outstanding.

- Firebase login succeeded and one authenticated account was confirmed. Do not
  restart the superseded login sessions below.
- Created Firebase project `tero-pherus-56e478f4` (Tero Notifications), project
  number `185163147087`, and Android app
  `1:185163147087:android:9e3af595ad39b44cadc73a` for the existing native package
  `org.pherus.tero.sefirahdev`. No billing account was linked.
- Enabled IAM/FCM APIs and created `tero-expo-push` service account with only
  `roles/firebasecloudmessaging.admin`. Attached its service key to the native
  Android application credential record in EAS. The active private key was
  transferred only in memory, never written into the workspace.
- The first EAS upload used a string instead of its expected JSON object. Its
  GraphQL error echoed that first key; the error handler immediately deleted
  that Google key. The corrected upload succeeded. Do not reuse the rejected
  key. Error handling was tightened to suppress credential-bearing errors.
- Public Android Firebase configuration is in
  `apps/app/config/google-services.sefirah.json`; this is client configuration,
  not the service account key. Native app config uses it by default, preserving
  the optional `GOOGLE_SERVICES_JSON` environment override.
- Android prebuild finished. Relevant APK build is running in session **93011**,
  log `/tmp/tero-fcm-android-build.log`; install with `adb install -r` on success.
  App typecheck and scoped `app.config.ts` lint passed. No behavioral tests or
  full suite were run. Apple APNs service key remains separately unconfigured.
- The owner subsequently asked to kill high RAM consumers. Stopped the Gradle
  and Kotlin Java processes (about 5 GB RSS combined); available memory rose
  from about 0.9 GB to 2.7 GB. Original build 93011 was interrupted. Resumed the
  cached build with one worker, in-process Kotlin, 1280 MB heap / 768 MB metaspace
  / 192 MB code cache. Current log:
  `/tmp/tero-fcm-android-build-lowmem.log`. Do not run a second parallel build.
- Owner later reported Android app/connection stopped. API 8794 remained
  healthy and both ADB reverse routes were present; Metro 8084 had stopped.
  Stopped the build process tree to prioritize the running app (cached outputs
  retained). Restarted Metro with `EXPO_OFFLINE=1`, `--max-workers 1`, existing
  native/test flags and API `http://127.0.0.1:8794`; session **97061**, log
  `/tmp/tero-metro-restore.log`. `/status` returned `packager-status:running` and
  API health returned `ok: true`. Restored USB routes and reopened the existing
  app without clearing data. Latest notification APK is NOT finished/installed;
  low-memory build 83433 was interrupted at app CMake compilation. When
  resuming, limit native CMake parallelism too and preserve the running servers.

The owner reported **"its chating now"**. This is the first owner confirmation of
real chat between the phones. Do not keep treating the initial handshake as
blocked. It does not prove every receipt, expiry, transport or lifecycle edge.
They next requested unread indication, activity status and notifications.
They explicitly chose **Show Active now to accepted contacts**, with no exact
last-seen time, and confirmed **there is no Firebase project yet**.

Implemented:

- `ChatActivityProvider` derives per-peer unread counts and recent activity from
  authenticated native history, with no second plaintext inbox. Messages sorts
  recent chats first and shows count badges; the Messages tab shows a total.
  An in-app banner opens the peer chat for new arrivals outside that conversation.
  Opening native history establishes the baseline, so old unread items count
  without being replayed as fresh alerts on every app unlock.
- Idle preparation skips only the visible peer, rather than stopping for every
  chat screen. Other accepted conversations can receive and update their counts.
  The visible chat publishes its own native read/history updates. A jump button
  appears for unread arrivals while reading older messages. No unrelated message
  is marked read by these indicators.
- Signed short-lived presence records use Ed25519 identity signatures and a
  separate domain. `/api/chat/:peer/presence` checks membership and accepted
  connection, and the client independently verifies sender, recipient and expiry.
  Pair DO presence expires after 60 seconds; foreground heartbeats refresh it.
  Messages has a green dot and Active now, and the chat header shows activity.
  You → Messages and activity includes a hide control. No exact last-seen is
  displayed. Hides/background closures are best effort, with expiry as fallback.
- Added SDK 57 `expo-notifications`, gated dynamic loading for older binaries,
  native permission/channel/token registration, generic notification tap routing
  to Messages, app badge updates, and enable/disable/device-settings UI in You.
  Permission is requested on the first admitted native session; denied/disabled
  choices are retained in SecureStore. Push payloads contain only Tero / New
  message and `kind: chat`, with no sender DID, name or private content.
- New `ChatPush` DO stores bounded device registrations under HMAC account tags,
  generic wake jobs, retries and Expo receipt checks. It removes invalid device
  tokens and retains no message content. Device token re-registration moves it
  to the current account. Authenticated membership-gated `/api/push/device`
  registers/unregisters it. Only newly published application ciphertext requests
  a wake; native receipts and handshakes do not. Push results never mark native
  messages delivered/read. The local development binding/migration v4 was added
  without changing its registry, auth secret or experimental flag.

Packaging and remaining setup:

- App/edge types and changed app lint passed. No full tests or synthetic probes.
- Android notification APK built successfully in 21m18s and was installed with
  `adb install -r` (Success), preserving the existing account. Log:
  `/tmp/tero-unread-notifications-android.log`. JavaScript uses existing Metro.
- iOS build 16 and its submission are now FINISHED. New **build 17** includes
  these indicator/presence/notification changes:
  `a6c67736-0f6c-47bf-b35d-144e33d2b0c6`; submission
  `f97ba9c6-a9b8-4060-be46-c3e657fb1a89` scheduled. Build 17 subsequently FINISHED
  successfully; its submission is also FINISHED. Log:
  `/tmp/tero-message-indicators-ios.log`. Monitor this build, do not duplicate it.
- Existing Apple provisioning lacked aps-environment. Using the configured
  App Store Connect key only in memory, enabled PUSH_NOTIFICATIONS on the
  existing bundle and created profile `HHTZPAP857` with the existing distribution
  certificate. Updated the existing EAS profile record. No cert/key was revoked,
  no secrets were printed/saved, and existing installed builds/accounts remain.
- Actual closed-app push is **not configured yet**. EAS has no APNs service key;
  its saved Apple login expired. An `eas credentials --platform ios` flow reached
  the password prompt and was cancelled; do not request passwords in chat.
  Tried launching a regular credentials terminal through ChromeOS's
  x-terminal-emulator (garcon), but no running EAS child was observed afterwards.
  Do not assume the credential command actually opened just because launcher
  exit code was zero. Native/browser CUA inventory is empty; IAB creation reports
  browser unavailable.
- Android has no FCM credentials or google-services configuration, and no
  Firebase project. `app.config.ts` accepts `GOOGLE_SERVICES_JSON` for the native
  Android profile (`org.pherus.tero.sefirahdev`). Firebase needs a Google login,
  project/app creation, client config and an FCM service credential connected
  to EAS, then a corresponding Android rebuild.
- Firebase CLI installation via `bunx firebase-tools login:list --json` finished
  and reported zero authenticated accounts.
  Logs `/tmp/tero-firebase-cli.log`, status JSON
  `/tmp/tero-firebase-login-status.json` (never print raw JSON, it could contain
  auth account/token details). Stopped the alternative standalone download;
  `/tmp/tero-firebase` is an incomplete binary, do not run it. The current official
  CLI defaults to noninteractive mode for AI agents; its documented `--interactive`
  flag enables the normal human browser callback login. Declined Gemini and
  optional usage reporting. Session 69029 opened the wrong application because
  Linux's HTTPS default is `chatgpt.desktop`; stopped it when the owner reported
  Codex opening in the browser. No global default was changed. Started a fresh
  Firebase interactive login in exec session **11676**, using Node preload
  `/tmp/tero-firebase-browser.cjs` to route the CLI's normal URL opener directly
  to the installed `/usr/bin/google-chrome-stable`. It is waiting for the human
  Google login with callback localhost:9005. No password/code goes in chat.
  Inspect this session before starting another login.
  The earlier remote login session from 3422 is superseded. No Firebase project
  was created yet. After login, create a Spark project and native Android app,
  configure GOOGLE_SERVICES_JSON and a restricted FCM service credential in EAS;
  keep private service keys only in memory/EAS, never in repo or logs. No billing
  account is required for messaging. No production Worker deploy, commit or push.

### Chat and Help follow-up, 13 October 2026

Later owner feedback: Send remained disabled, returning from chats left a loading
spinner visible, Android's composer was too low, and iOS should follow the tab
bar's bottom clearance. The owner requested the iOS update. Source changes:

- `ChatPreparation` runs only while unlocked, admitted, foregrounded and outside
  `/chat`. It prepares one accepted conversation at a time through the existing
  native MLS and encrypted carrier, with round robin selection, a 30 second pass
  deadline and cancellation on navigation/background/lock. It never marks unseen
  messages read. The visible chat exclusively owns its engine. Both updated apps
  must be opened at least once to exchange the initial encryption key; people
  no longer need to sit inside the same conversation. Idle preparation uses the
  encrypted fallback and does not start a Tor node per contact. No push or OS
  background delivery was added.
- Established chat readiness is restored from native state at open, rather than
  waiting for a successful network poll. Temporary polling errors preserve that
  readiness. Older bridges are labelled as requiring an app update. The send
  button has an explicit busy indicator; the draft clears only after native commit.
- Native pull to refresh is now gesture controlled, independent of shared
  discovery loading, reset on blur/focus and bounded to 12 seconds. Chat opening
  has a 15 second deadline. Manual conversation refresh synchronizes without
  closing its engine or replacing the thread with a loading screen.
- Chat uses a chronological list with native pull to refresh and scrolls to the
  latest message when already near the bottom. It preserves the viewport when
  reading older messages. Input clearance shares `bottomControlOffset` with the
  tab bar: Android safe area plus 18 points, iOS 15 points from the bottom.
  Keyboard visibility switches to a small keyboard gap. Android retains
  KeyboardAvoidingView height behavior: removing it caused the live composer to
  fall behind the keyboard and was corrected immediately in Metro. Removed the extra
  below-input footer and double bottom safe area.
- Help has a compact Your posts section with real author-only reply counts and
  links to existing posts, including completed mutual aid. Gathering shows
  anonymous detail previews (never story bodies), reveals more available posts
  in batches, and reports category-specific unavailability. Help replies keep
  their drafts on failure, disable duplicate submission while pending and show
  fetch failures rather than presenting a failed reply fetch as an empty list.

Android's earlier native build completed successfully and the watcher installed
it with `adb install -r` (exit 0), preserving the account. Subsequent JavaScript
changes use the existing Metro. App types and changed-file lint passed; no
full suite or synthetic probes ran. After the owner reported continued failure,
one read-only Android UI hierarchy inspection confirmed the actual status is
waiting for the contact's encryption key, with Send disabled. This does not
prove a completed exchange. Owner was asked to update iPhone from TestFlight
and open the La niina conversation once (build 13 still requires this initial
chat opening; the new build prepares conversations while the app is open).

New iOS build attempts hit intermittent Expo GraphQL connection errors before
upload, reserving unused build numbers 14 and 15. Retry with Node's IPv4-first
DNS and a 2000ms network family attempt timeout uploaded **build 16**:
`a12f75bb-7666-4971-9387-1dd748143748`, status IN_PROGRESS. Automatic submission
`26a1d5bd-8699-4db5-97a9-4c99bf13b240` is scheduled. Log:
`/tmp/tero-chat-ui-ios-upload.log`. Do not start another build. The Android-only
keyboard behavior restoration followed this snapshot; iOS padding is unchanged.
Build 13's submission `474f3850-9d87-4e7f-93b0-a4e77f9419fa` was queried and
confirmed FINISHED. App Store Connect then independently confirmed build 13
`905d2e91-01cc-4e1d-bb64-cfc4fec36348` is VALID and IN_BETA_TESTING in the existing
Team (Expo) internal group (which has access to all builds). The owner was told
to install 0.0.0 (13) from TestFlight and open Messages → La niina once. Actual
installed iPhone version remains unconfirmed. The read-only Apple check reused
the configured EAS submission key in memory; no key or token was printed or
saved and no testers/groups were changed. Resume on the actual chat blocker,
not other feature work: owner explicitly wants one real message delivered.

### Feature implementation checkpoint, 13 October 2026

This section supersedes the earlier chat checkpoint below. The owner expanded
work to actual chats, Help UI and logic, real posts in Gathering, Circles and
Following design, and launcher/Apple icon improvements. They subsequently
required smaller Help cards and restoration of the previous tab icons. Both
changes are applied. Preserve the previous tab glyphs and tuned navigation.

**Latest working instruction:** prioritize implementation. Do not run full test
suites, repeated device probes or prolonged UI verification. Device behavior
checks are deferred until the owner explicitly requests them. Only compilation,
type checks and focused lint fixes were performed after this instruction. A
local access passcode was supplied in chat; never copy it into source, docs or
logs. No authentication bypass or account reset was added.

#### Chat implementation now in source

- Added asynchronous native MLS storage and operations on Android and Swift,
  with `asyncVersion: 1`. Each queued open registers a unique native owner;
  cancellation, blur and lock revoke that owner before later work can open state.
  The JS wrapper rejects late outputs and clears temporary key copies.
- Added the native `delivery` JSON interface (`deliveryVersion: 1`) and encrypted
  snapshot version 2. Version 1 state is read and carried forward without resetting
  groups or accounts. Old binaries fail closed on the new snapshot; do not roll
  a device back to an old messaging binary after starting these conversations.
- Native records contain random authenticated message IDs, sent text, delivery
  and read state, retry wire IDs and expiry. Control packets are MLS application
  messages from the expected peer, not service assertions. Carrier storage alone
  never changes a message to delivered or read.
- Deterministic DID ordering picks the initiator. A committed peer KeyPackage
  hash prevents a replay from silently creating another group. Joining commits
  a ready control packet with the Welcome hash, allowing restart and duplicate
  handling without discarding the ratchet.
- Native history is bounded to 256 records, the retry queue remains 32, and at
  most 16 unacknowledged outgoing messages reserve room for receipt traffic.
  Read receipts replace an unsent delivered receipt for the same message when
  possible. Exact native wire bytes are retained until verified peer delivery
  or expiry, and failed mutations still close the engine before returning output.
- Expiry is seven days unread, shortened to 24 hours after both read times.
  Expired plaintext/history and retry bytes are removed on native operations;
  there is no claim of scheduled local deletion while the app is stopped or of
  forensic erasure. Hash tombstones and the group ratchet remain for replay safety.
- Added recipient sealed, sender signed carrier descriptors in
  `packages/crypto/src/private-delivery.ts`, reusing the existing X25519/HKDF and
  padded XChaCha primitives in a separate domain. MLS still encrypts all actual
  messages and receipts. The private onion capability is also encrypted.
- Added a SQLite `ChatMailbox` Durable Object per accepted pair, with bounded
  packets, capacity, daily quotas and expiry alarms. Both current membership and
  accepted connection are checked at the HTTP boundary. Only the recipient can
  retrieve and remove incoming objects. Pair metadata remains visible to the
  transitional service, as with the existing connection registry.
- The new `/api/chat/:peer` API has bounded bodies, signed descriptors and no
  redirects/cookies in the client. The configured local LAN HTTP origin is
  allowed only in explicit testing builds; deployed origins still require HTTPS.
  The old 24 hour experimental object API is not repurposed for real chats.
- Added an encrypted carrier journal derived at `app/6`. This stores wrappers,
  not ratchets. Native pending bytes remain authoritative after restart. The
  driver offers through Tor first and automatically stores the same sealed
  wrapper as fallback when the route is unavailable or lacks acknowledgement.
  Receipt controls are also retained durably through fallback. Route labels show
  private, fallback, or mixed use. Native `forget` removes consumed/expired
  volatile offers rather than leaving unnecessary carrier copies alive.
- The composer is wired and becomes available only with the new native delivery
  contract and an established handshake. It displays queued/delivered/read from
  native records. A virtualized conversation marks incoming messages read from
  screen visibility, not simply because a chat was opened. Delivery runs only
  while that conversation is open and foregrounded; no push/background delivery,
  attachments, new Circle protocol or MLS epoch healing is claimed.

No new two phone exchange has been performed. Do not claim the new delivery
protocol works on the phones from compilation or the older MLS diagnostic PASS.
The current TestFlight build 9 cannot use these new APIs; it needs the new binary.

#### Help, Gathering, Circles and icons

Help now has compact cards, local search, real board counts, pull to refresh,
and one Share or ask sheet opening the existing working forms. Gathering fetches
real anonymous Help board posts, filters by category and links the selected post
to the top of its real board. Story bodies remain behind their existing content
notes. It separates community posts from the still unavailable Circles feed.
Ask/offer shortcuts and Compose's ask/offer choices open the actual mutual aid
forms. No fake feed, activity, people, post counts or professional badges were
seeded. Existing general posts, events, polls, Circle publishing, fundraisers,
listening and community features are not newly implemented by this slice.

Circles has clearer request filtering and incoming priority, search clearing,
contact action menus, and refined Spaces/Following presentations with working
resource routes. Following mutations and professional verification are still
unimplemented; the UI explains the verified professional boundary instead of
letting an ordinary member self assign credentials.

Launcher assets are generated from editable SVG sources by
`scripts/render-app-icons.mjs`. iOS has opaque light/dark/tinted variants;
Android has adaptive foreground/background and monochrome assets. iOS biometrics
now use native Face ID/Touch ID symbols. The owner rejected the tab icon changes;
the earlier Android glyphs and iOS SF Symbol names have been restored.

#### Connection and packaging

The shared local Worker had stopped. Restarted it with the preserved ignored
configuration, auth secret and registry state on port 8794. Added only the new
mailbox binding/migration to that development configuration. Its experimental
flag was already enabled. Metro 8084 remained running; Android Wi-Fi is still
`192.168.1.4`, and API USB reverse was restored. No `.dev.vars` or registry data
was printed, replaced or deleted. The Worker is running in exec session 20692,
with output in `/tmp/tero-shared-api.log`.

Added a real reconnection path: the unlocked session retries sign-in after a
network failure or expired token, backs off between foreground retries, and
refreshes membership on returning to the app. Identity and message state are
preserved. Ordinary API calls now have a 30 second deadline instead of hanging
indefinitely. This JavaScript correction followed the build 12 snapshot and is
included in the successful build 13 archive.

The iOS dependency failure was resolved by pinning libc to 0.2.189 for Arti and
enabling sysinfo's documented Apple App Store feature. Removed the temporary
rand_jitter vendor patch; upstream RNG code is intact. Build 11 had advanced past
the clock error but failed on sysinfo's libc 0.2.190 Apple declarations.

**Build 12 finished successfully**: `e44eac17-2faa-454f-8ff7-9d7bba9142ad`.
This verifies the full signed iOS native archive with both carrier and the new
MLS delivery/async bridges, plus Help/Gathering/Circles/icons. Automatic
submission: `ea488551-b4af-483e-871d-c16ca933770e`. A cancel attempt after the
reconnect correction reported that the build was already finished and could
not be cancelled. Do not treat that as a compile failure.
<https://expo.dev/accounts/pherus/projects/tero/builds/e44eac17-2faa-454f-8ff7-9d7bba9142ad>.

**Build 13 finished successfully**, including the reconnection correction:
`cac36449-b903-46f8-b5a9-1eabcfe1d7d3`, completed at 14:27 UTC.
Automatic Apple submission was scheduled as
`474f3850-9d87-4e7f-93b0-a4e77f9419fa`; Apple processing/availability is not
confirmed. Do not queue another build or duplicate submission.
<https://expo.dev/accounts/pherus/projects/tero/builds/cac36449-b903-46f8-b5a9-1eabcfe1d7d3>.

The preserving Android APK build is running in exec session 64197, output
`/tmp/tero-chat-features-android.log`. Install it with `adb install -r` only after
BUILD SUCCESSFUL, then leave physical behavior checks for the owner's request.
An install watcher is already running in exec session 99934. It waits for this
existing build's success, then runs only `adb install -r` on the existing TECNO;
on build failure it stops without installing. Inspect
`/tmp/tero-chat-android-install.log` before attempting another install. No UI
launch, test, data clearing or account change is part of that watcher.
No uninstall, account reset, production Worker deploy, commit or push occurred.

### Latest chat checkpoint, 13 October 2026

This section supersedes older statuses below. The owner confirmed the corrected
Gathering entry behavior and reported **PASS** on the iPhone TestFlight native
message encryption diagnostic. That verifies the installed MLS bridge's
synthetic encryption, persistence, reopened inbox and replay checks, not a real
exchange between phones. The owner selected **automatic encrypted Cloudflare
fallback, with visible route status**, when the primary Sefirah route cannot
connect. This authorizes that route policy; transport storage receipts still
must never be presented as authenticated peer delivery or read receipts.

Implemented native durable retry queue consumption and saved handshake status
(`fresh`, `offered`, `established`). `acknowledge_pending` removes exact validated
wire IDs atomically, is idempotent, preserves ratchets/inbox, and protects a
KeyPackage before joining. Android and Swift bridges advertise `queueVersion: 1`;
the JS adapter rejects older bridges for these operations. Extended the
synthetic persistence diagnostic to check queue consumption after reopening.
Focused evidence: 26 MLS Rust tests and strict Clippy pass; 10 MLS JS tests pass.
The new Android APK built and installed with `adb install -r`, preserving the
Fool account. The owner's check of the updated Android diagnostic is pending.

Added the iOS Arti carrier bridge through UniFFI, gated CocoaPods integration and
the EAS preinstall hook. Swift bootstrap, offer and get run on a utility queue;
stop/cancel bypass it. Private carrier state uses protected, backup excluded
Application Support. Added a development diagnostic for synthetic encrypted
self retrieval through an onion service. This is not two phone delivery.
Three Rust boundary tests and seven native JS ownership/cancellation tests pass.
Apple autolinking and host Swift binding generation pass.

The first carrier EAS attempt, build 10
`dbd5719b-61a3-44cb-aec2-f51af7f479e9`, failed during the Rust iOS compile:
`rand_jitter 0.6.1` calls `libc::mach_absolute_time`, but libc 0.2.190 exposes
that declaration only on macOS. Vendored the exact rand_jitter crate with its
original licenses and patched only the Apple clock binding to the same system
function. The randomness algorithm and entropy handling are unchanged. A small
Rust harness reproduced E0425 for `aarch64-apple-ios` before the patch and passed
after it. The actual signed iOS app still requires EAS verification.

Retry build 11 is `ca0c10c0-cea3-4c85-879d-809e66f8773e`, with automatic
submission `c317d2fe-e5de-4309-afe7-299ef8c26f30`. Upload succeeded in 2 seconds
using existing signing credentials and actual Node in PATH. Check these jobs
before starting another build:
<https://expo.dev/accounts/pherus/projects/tero/builds/ca0c10c0-cea3-4c85-879d-809e66f8773e>.
<https://expo.dev/accounts/pherus/projects/tero/submissions/c317d2fe-e5de-4309-afe7-299ef8c26f30>.
The last EAS check reports build 11 `IN_PROGRESS`. No actual private route
runtime result on iOS is available yet. App TypeScript, changed file ESLint and
all 17 focused JS tests pass at this checkpoint; patched carrier Rust tests
also pass (3 tests).

Real chat sending remains disabled. Next: define and implement recipient bound
authenticated KeyPackage/Welcome distribution, deterministic initiation and
restart recovery; move MLS disk operations off the JS thread with cancellation
that prevents queued opens after lock; connect primary and automatic fallback
with truthful route status; implement authenticated delivery/read receipts and
the agreed seven day unread / 24 hours after both read expiry. Existing fallback
experiment has only 24 hour storage, member scoped access and cleanup on writes;
it is not yet the real chat delivery contract. Its HTTPS/loopback origin guard
also rejects the iPhone's local `192.168.1.4` HTTP testing origin. Do not loosen
production origin validation or silently reset native state to bypass these gaps.
Primary offers are memory only, and signed private contacts still require manual
distribution. No production deploy, commit, push, account reset or uninstall.

### Terminal continuation, 13 October 2026

Later than the original checkpoint below. Implemented an iOS Expo Swift MLS
module matching the existing Android/JS contract, including serialized handles,
capacity and duplicate path checks, close on module teardown, protected state
under Application Support excluded from backups, and isolated probe cleanup.
Added Rust staticlib output, a macOS Swift generation/device archive script,
a gated CocoaPods specification and EAS preinstall hook. Generated files are
ignored. iOS native compilation and a device probe are still unverified.

Added EAS `testflight` store profile with native MLS and test diagnostics,
bundled JS, OTA disabled, and the preserved API `http://192.168.1.4:8794`.
It keeps the existing iOS bundle identifier. Gathering remains the configured
initial tab. No account reset, production deployment, commit or push occurred.

An actual noninteractive EAS build attempt accepted the profile, created the
`testflight` channel/branch and advanced remote iOS build number from 1 to 2,
then stopped with: `Credentials are not set up. Run this command again in
interactive mode.` No native build was queued and nothing was submitted.
An interactive retry advanced the remote build number to 3, restored the saved
Apple ID, and found its local session expired. It stopped at the Apple password
prompt and was cancelled without entering credentials. No password or alternate
Apple API authentication is configured in the terminal environment. The owner
must authenticate directly with Apple before the store build can proceed.
The next Apple step is owner store signing authentication, directly in a terminal:

Later correction: the owner completed Apple authentication in a separate ChromeOS
Terminal opened by the agent. EAS reused the existing company distribution
certificate and created an active App Store provisioning profile for
`tero.pherus.org`. The owner reported all credentials ready and the 25.5 MB
archive uploading. Store signing is now configured. Wait for that existing upload
and inspect the resulting `testflight` build before starting another build.
No TestFlight submission or device installation is verified yet.

```bash
cd /home/laniina/pherus/tero/apps/app
export PATH="$HOME/.bun/bin:$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH"
bunx eas-cli build --platform ios --profile testflight
```

The owner enters Apple credentials directly into EAS, never in chat. Once signing
is configured, verify the cloud native build and synthetic iOS persistence probe.
TestFlight requires a separate preserving restore of Pherus's existing recovery
identity from Expo Go, not a new membership. Do not enable real sends yet.
Handshake distribution, queue consumption, authenticated receipts, retention,
Sefirah transport and real two phone exchange remain outstanding.

Upload correction: the first signed archive and a retry timed out while EAS ran
under Bun, because the abbreviated terminal PATH omitted Node. A synthetic
metadata upload through EAS's own uploader completed under Node in 1.8 seconds
but timed out under Bun after 20 seconds. Stopped the stalled retry and included
the existing Node v24.19.0 directory in PATH. The full archive then uploaded in
13 seconds, using remote store credentials without another Apple sign in.
That attempt uses remote build number 7. Keep Bun as the package manager, but
run EAS under actual Node. Do not repeat Apple login to repair an upload timeout.
EAS accepted this build as `15d07d0a-6451-403a-83c3-9baa23a3f134`, profile
`testflight`, distribution `STORE`, status `IN_PROGRESS` at the latest check.
Logs: <https://expo.dev/accounts/pherus/projects/tero/builds/15d07d0a-6451-403a-83c3-9baa23a3f134>.
Native compile success, submission and installation remain unverified.
Later build result: build 7 failed in Xcode with `cannot find type 'PrivateChat'
because CocoaPods compiled only `SefirahMlsModule.swift`, omitting the generated
Swift source referenced outside the pod root. Moved generated Swift, header,
module map and device archive into ignored `ios/Generated` and changed the
podspec to use paths within its root. The podspec now checks all four generated
files exist. Shell syntax, whitespace and ignored output checks pass.
Started a preserving TestFlight retry with Node and existing signing credentials,
remote build number 8. Wait for that retry before starting another build.
Latest result: build 8, `f90755ad-2ae7-4cd7-8165-7ac857490895`, finished
successfully. This verifies native iOS compilation and signed archive creation,
including the corrected generated binding packaging. It does not verify runtime
encryption or device messaging. Build: <https://expo.dev/accounts/pherus/projects/tero/builds/f90755ad-2ae7-4cd7-8165-7ac857490895>.

Submitted that exact build through EAS using the restored Apple session.
Created App Store Connect app ID `6822219523` for `tero.pherus.org`. Apple rejected
the already taken store name `Tero`; EAS automatically assigned `Tero (b84257)`.
The installed app name remains as built, `Tero Sefirah Dev`. EAS created the
internal `Team (Expo)` TestFlight group and reported access enabled for the four
existing App Store team users, including the owner's Apple ID. This was EAS's
automatic group setup; no separate messages or invitations were sent by the agent.
Created and assigned an EAS submission API key with `APP_MANAGER`, choosing the
least privileged offered role rather than `ADMIN`; private key remains on EAS.
Saved the nonsecret App Store app ID in the TestFlight submit profile.

Submission `85d78227-15c7-4247-a98c-c0cc06a1eb08` completed successfully:
EAS reported `Submitted your app to Apple App Store Connect!` and Apple processing
pending. Submission: <https://expo.dev/accounts/pherus/projects/tero/submissions/85d78227-15c7-4247-a98c-c0cc06a1eb08>.
TestFlight: <https://appstoreconnect.apple.com/apps/6822219523/testflight/ios>.
Do not submit it again while Apple processes it. Next: owner installs the
TestFlight app, preserves the council recovery words from Expo Go, and restores
that same identity into Tero Sefirah Dev once the build is available. Do not
create another membership or clear the Expo Go vault. Verify Gathering opening
and the synthetic iOS persistence probe, then continue handshake, delivery,
receipts, expiry and real two phone messaging. Sending remains disabled.

### iPhone installation and opening tab correction

The owner installed the TestFlight app, restored the existing iPhone council
identity and unlocked it successfully. They reported Yoru opened first every
time. Source inspection showed SDK 57 headless Tabs overwrites its options prop
with `routeNode.initialRouteName`; the earlier prop change did not establish
layout metadata. Added the supported exported `unstable_settings` with
`initialRouteName: 'gathering'`, removing the ineffective prop.

Three regression tests exercise the installed Expo route graph and navigation
routers, loading the actual layout's exported metadata without its native UI.
The startup test failed with Yoru before the fix, then all three passed. Explicit
Yoru and chat selections remain intact. App TypeScript, changed file ESLint and
whitespace checks pass. No native code changed in this correction.

Also enabled the existing `EXPO_PUBLIC_SEFIRAH_EXPERIMENTAL` flag in the TestFlight
profile so the intended native persistence diagnostic screen is reachable;
build 8 had native MLS and testing tools but that screen's flag was missing.
Started a new iOS store build with automatic TestFlight submission using the
existing signing and App Store Connect API key. OTA remains disabled, so the
installed build 8 cannot receive this startup correction by JavaScript update.
Keep both device accounts and update through TestFlight when available.
The corrected build is number 9, ID `2928d190-3d61-4071-8915-87a8bbd5c933`.
Archive upload succeeded in 12 seconds. EAS accepted the build and scheduled
automatic submission `6aad1013-f75b-4d8a-9c57-e7b67f7c33f5` using existing
credentials. No further Apple login was required. Build:
<https://expo.dev/accounts/pherus/projects/tero/builds/2928d190-3d61-4071-8915-87a8bbd5c933>.
Submission: <https://expo.dev/accounts/pherus/projects/tero/submissions/6aad1013-f75b-4d8a-9c57-e7b67f7c33f5>.
Check those existing jobs before retrying. Compilation/submission success and
actual iPhone startup behavior for build 9 remain unverified at this checkpoint.

Focused checks for this slice: app TypeScript and changed app config ESLint pass;
11 existing message ownership and contact access tests pass; Rust host library
build with staticlib succeeds; shell syntax and diff whitespace checks pass.
Expo Apple autolinking resolves `SefirahMlsModule`. None proves an iOS compile.

The test API was confirmed healthy outside the terminal sandbox. A redundant
startup attempt exited on address already in use; the existing service remains
in use. Android is connected and still has Wi-Fi address `192.168.1.4`;
USB reverse for 8794 was restored. Sandboxed loopback cannot reach the host API,
so perform device/server diagnostics outside that sandbox before restarting.

There is substantial uncommitted development work. Do not discard it or mistake
the last commit for the current implemented state. No commit, push or production
Cloudflare deployment was performed in the latest work.

## Latest user request and exact stopping point

The user asked to continue with actual chats between Android and iPhone and make
Gathering the default opening tab. They then requested this handoff so they can
continue in terminal Codex. Pause feature work at this checkpoint.

The user confirmed Apple Developer membership, but does not want Developer Mode
enabled. Their chosen native iPhone distribution route is **TestFlight**, not an
internal development build. Apple documents that TestFlight does not require
Developer Mode: <https://developer.apple.com/documentation/xcode/enabling-developer-mode-on-a-device>.

The only app source change after the last published card preview is in
`apps/app/src/app/(tabs)/_layout.tsx`: `initialRouteName` is now `gathering`, with
the comment updated. This is configured in source, not yet verified on a cold
device launch or published in a new iPhone update. It should select Gathering
when the unlocked tabs mount, without overriding explicit navigation to a chat.

Actual message sending is still disabled. No delivery endpoint, handshake
distribution, native iOS bridge or TestFlight build was added in this latest
attempt. Preparatory research and host Swift binding generation were done only.

## What is working

### Profiles and contacts

- Android is the Fool, La niina, `@la-niina`.
- iPhone is the council member, Pherus, `@pherus`.
- Their connection is accepted. Android Messages visibly listed Pherus, and the
  real contact row opened the peer chat screen.
- Permanent unique handles accept hyphens; availability and claiming are checked
  through the authenticated API. Profiles are encrypted directory envelopes.
- Circles has Spaces, Network, Contacts and Following. Own profile is first in
  Network and opens Yoru. Requests have visible status and acceptance controls.
- Spaces and Following still have incomplete functional sources. UI alone is not
  proof that live discovery, audio or following works.

### Messaging foundation and UI

- Official OpenMLS 0.9.1 with RustCrypto 0.6.0 and our own UniFFI interface lives
  in `apps/app/modules/sefirah-mls/native`.
- Android Kotlin/JNA bridge is built and installed. Preserve the existing vault.
- Exactly two expected account identities are checked against MLS credentials.
- Persistent state, pending ciphertext and inbox are saved atomically as an
  authenticated encrypted SQLite record. Revision checks reject stale writers;
  failed persistent mutations close the engine before releasing output.
- Session storage keys are derived at `app/5`. Engines close on lock, decoy,
  account replacement and unmount. Chat routes close their engine on blur.
- A separate Android process restart probe and an in-app synthetic bridge and
  persistence probe passed. These did not exchange real member messages between
  the phones.
- `src/lib/chat-access.ts` requires a freshly accepted contact before opening
  private state. `use-conversation.ts` repeats checks on focus and foreground,
  with stale result guards. Three focused access tests pass.
- Messages lists accepted contacts with search and pull refresh. `/chat` shows
  the actual peer name, handle, card and native inbox, plus an editable draft.
- Drafts clear on leaving the chat or locking. Send remains disabled, and the UI
  explains unavailable native messaging on Expo Go.

### Hino UI and cards

- Shared floating navigation has four main tabs and a separate Yoru button,
  scroll collapse and touch to reveal. Preserve the user's tuned insets and size.
- iOS retains glass treatment; Android has its approved compact treatment.
- The first ten Major Arcana, 0 through IX, have distinct symbolic fronts and one
  shared back. Ratio is 1:1.70. Current palette is original dark charcoal and gold.
- Cream/red and pink experiments are superseded. Inspiration is Lord of Mysteries
  and anime/books, with original Tero symbols, not claimed official insignia.
- Shared `TarotFrame.tsx` governs both sides. The Fool uses a veiled eye; Emperor
  uses throne, crown and sword. Other cards use the motifs in `tarot-design.md`.
- Yoru → Tarot design study is a testing tool. The remaining cards are not designed.

## Next implementation work

Continue actual encrypted chat delivery, not more card design unless requested.

1. Prepare native iOS OpenMLS support and a store distribution EAS profile for
   TestFlight. Existing `eas.json` has development, preview and production profiles;
   no dedicated native TestFlight profile exists yet. The MLS Expo module currently
   registers Android only. `SEFIRAH_NATIVE_BUILD=1` enables Android's native module.
2. Generate Swift bindings from official UniFFI metadata, add the Expo Swift module,
   private backup-excluded state storage and build integration. Do not substitute
   a custom JS encryption protocol just to make Expo Go send messages.
3. Define and implement authenticated KeyPackage and Welcome distribution,
   deterministic simultaneous initiation and restart recovery. Preserve expected
   peer and accepted-contact checks on both ends and the service boundary.
4. Implement durable pending queue acknowledgement/consumption and authenticated
   message identifiers and receipts. Existing native methods expose `pending()`
   and `received()` but do not consume queues. Limits are 32 pending and 32 inbox
   records per conversation, and 4 MiB serialized state.
5. Connect actual transport to the composer, showing truthful queued, delivered,
   failed and read states. Keep Sefirah primary and the encrypted Cloudflare carrier
   fallback. Do not label the existing fallback experiment the complete network.
6. Enforce agreed retention: 24 hours after both people read, or delete unread
   messages after seven days. Current UI labels this as planned; no receipt or
   expiry enforcement exists yet. Never claim remote forensic deletion.
7. Build and test one real Android to iPhone exchange, reply and app restart.
   Use focused checks, not repeated broad suites. TestFlight signing and App Store
   Connect setup may require the owner's interactive authentication. Ask for the
   concrete missing step only when the build is ready; never request passwords in chat.

No iOS native compile has been performed here, because this host is Linux.
Do not claim TestFlight installation or real chat completion before it happens.

## Preparatory findings for iOS

- `eas build:list` returned an earlier finished iOS **internal development** build,
  ID `06e0871c-5645-4a37-8fbc-0a962edb8009`, app 0.0.0, build 1. This does not prove
  store signing, TestFlight submission or current MLS support.
- Host `cargo build --lib --locked` and Swift generation completed. Temporary
  output is `/tmp/tero-mls-swift/`, with `SefirahMls.swift`, `SefirahMlsFFI.h` and
  `SefirahMlsFFI.modulemap`. It is not installed or integrated into the repo.
- Existing `native/uniffi.toml` names the Swift module `SefirahMls`.
- Current Cargo crate types are `cdylib` and `rlib`. Static iOS linking/build
  packaging is not implemented. Android's generated outputs are ignored.
- SDK 57's installed Expo source confirms Swift `Data` maps from JS `Uint8Array`
  in `node_modules/expo-modules-core/ios/Core/DynamicTypes/DynamicDataType.swift`.
- Expo docs and the UniFFI Swift docs were consulted. Read SDK matching API docs
  before changing native/Expo APIs, as required by `apps/app/AGENTS.md`.

## Devices and local servers

Read `development.md` for complete copyable restart commands. Current endpoints:

| Component | Current setting |
| --- | --- |
| Shared API | `0.0.0.0:8794` in Linux |
| Persisted registry config | `apps/edge/.wrangler/sefirah-device-network/wrangler.jsonc` |
| Persisted registry state | `apps/edge/.wrangler/sefirah-device-network/state` |
| Auth secret | Existing ignored `.dev.vars` beside the test config, do not print or replace |
| Metro | localhost port 8084 |
| Android serial | `085452525P011328`, TECNO CI6, Android 13 |
| Android app | `org.pherus.tero.sefirahdev` |
| ADB reverse | phone 8081 → host 8084, phone 8794 → host 8794 |
| iPhone test API | `http://192.168.1.4:8794`, Android Wi-Fi bridge |

At handoff, API health returned `{"ok":true,"service":"tero-edge"}`, Metro
returned `packager-status:running`, and both ADB reverse entries were present.
Desktop tool sessions may stop when switching clients. Check listeners before
starting duplicates; use the documented restart commands if they have stopped.
Do not use the old Chromebook `.5` address. Recheck the Android Wi-Fi address if
the network changes. Physical phone passcodes and Tero unlock remain the user's.

Latest published iPhone **Expo Go** preview, before the Gathering default change:

- Group: `45d175ae-f087-4e89-9fa4-6830f8b2472b`.
- iOS update: `01a1340d-e0c3-7506-bbbb-30c91e10a507`.
- Runtime: `exposdk:57.0.0`, branch `preview`.
- <https://expo.dev/accounts/pherus/projects/tero/updates/45d175ae-f087-4e89-9fa4-6830f8b2472b>.

It includes Messages UI and the dark card refinements, not native iOS encryption.
TestFlight will be a separate installed app from Expo Go, so do not assume the
Expo Go vault migrates automatically or create another Fool. Plan a preserving
account restore or explicit transfer with the user when installation is ready.

## Verification already completed

- Earlier persistence milestone: 21 Rust tests and 228 workspace tests, workspace
  types, strict Clippy and formatting passed, plus physical Android probes.
- Messages UI milestone: app types, changed-file lint and three focused contact
  access tests passed; physical Android contact list and peer screen checked.
- Current dark card frame/symbols: app types, targeted lint and iOS export/publish
  succeeded. No new native APK was needed for those UI edits.
- Gathering opening-tab change: targeted lint and app types passed at this
  checkpoint. `git diff --check` passed. No cold-launch check or new preview publish.

Do not combine historical test counts into a claim that a new full suite ran.

## Terminal start

```bash
cd /home/laniina/pherus/tero
codex
```

Suggested first prompt:

> Read AGENTS.md and docs/continuation.md, then continue real encrypted chats
> between Android Fool and iPhone council. Use TestFlight for iPhone, no Developer
> Mode. Preserve both accounts and existing local registry. Gathering must open
> first. Prioritize implementation with focused checks and UI improvements alongside logic.
