# Tero: notes for Claude

Latest session checkpoint: read [AGENTS.md](AGENTS.md) and
[docs/continuation.md](docs/continuation.md) first. The 13 October 2026 handoff
supersedes older status notes here, including the TestFlight direction and the
Gathering opening tab change. Existing project history below is preserved.

Read this first in every session. Keep it current: update "Where we are" and
"Next" whenever a milestone lands or a decision changes.

## What Tero is

A global, invite-only platform where queer people help each other, built for
places where being seen is dangerous. Inspired by the Tarot Club in _Lord of the
Mysteries_. Owner: the founder of Pherus ("the Fool"). Full picture:
[docs/README.md](docs/README.md) (decisions log D1–D40) and [docs/vision.md](docs/vision.md).

## Working rules

- **Only use the `main` branch.** Commit and push straight to `main`. Never create
  other branches; the founder asked for this to avoid conflicts.
- **Bun** is the package manager: `bun install`, `bun run check` (format, types, tests;
  same as CI). Add app packages with `bunx expo install <name>`.
- Run `bun run check` before every push. CI (`.github/workflows/ci.yml`) must stay green.
- Discuss big product or safety decisions with the founder before building them.
- Never write secrets into files, commits or chat. Secrets live in the environment
  settings (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`) or as Worker secrets.
- The founder prefers plain language, decisions recorded in `docs/`, and a calm,
  grown-up design (see [docs/design.md](docs/design.md)).

## Layout

| Path                | What                                                               |
| ------------------- | ------------------------------------------------------------------ |
| `apps/app`          | Expo SDK 57 + expo-router: iOS, Android, web. Screens in `src/app` |
| `apps/edge`         | Cloudflare Worker `tero`: API, Tero cards, serves the web build    |
| `packages/crypto`   | Phrase (BIP-39), keys (HKDF, Ed25519), did:key, two-slot vault     |
| `packages/protocol` | Sign-in message and API shapes                                     |
| `packages/ui`       | Colours, fonts, sizes                                              |
| `packages/i18n`     | en, sw, zh, fr (non-English text needs native review)              |
| `design/mockups`    | Screen mockups (`.dc.html`) and screenshot scripts                 |
| `docs/`             | Product, safety and build decisions                                |

## Deployment

- Worker `tero` on the Pherus Cloudflare account. **One address only: `https://tero.pherus.org`.**
  workers.dev and preview URLs are disabled in `wrangler.jsonc`; smart placement is on.
- Deploy: `cd apps/app && bunx expo export --platform web`, then
  `cd apps/edge && bunx wrangler deploy` (needs `CLOUDFLARE_API_TOKEN`). The Pherus account id
  is `153a8ed929a532d28a173e235ceda5c4`; on 2026-10-06 `CLOUDFLARE_ACCOUNT_ID` in the
  environment held something else, so pass the id inline if deploy says code 7003.
- Worker secrets/vars: `AUTH_SECRET` (signs challenges and sessions); optional
  `FOUNDER_DID` (restricts who may take the Fool's seat).
- Members and cards live in the `RegistryObject` SQLite Durable Object.
- Expo project `@pherus/tero`, id `56e478f4-7f95-45e3-9fae-e8321fcea451`; EAS profiles in
  `apps/app/eas.json`. Expo Go previews are published to the `preview` branch.
  Phones talk to `EXPO_PUBLIC_API_URL`, defaulting to tero.pherus.org.
- Mockups canvas: https://claude.ai/artifact/TpPoDJbAyYFAFGKgxdzqYd

## Where we are (2026-10-06)

Current direction (2026-10-12): Sefirah replaces the intended central network architecture. Read [the Sefirah specification](docs/specs/_root/0001-sefirah/index.md) and current [governance rules](docs/roles-and-sequences.md) before network, identity, permission, or recovery work. The older milestone notes below describe existing code, not completion of Sefirah. A separate encrypted fallback experiment is implemented but disabled by default and not connected to app screens. Local Worker restart delivery and a desktop Tor onion retrieval spike both passed. An encrypted device outbox foundation now has native and web storage adapters, restart tests, and lock/decoy cancellation, behind an explicit app development flag; existing screens do not use it. An explicit authenticated fallback client now connects the queue to the local Worker experiment, with bounded streaming, cancellation, and restart delivery verified. Membership remains central. An Android arm64 Arti module, signed private contacts, encrypted contact directory, and separate development screen are implemented; the physical Android core harness passed encrypted exchange in both directions without Cloudflare, and the separate Android development APK built, installed, and opened to the welcome screen. Native Tor invocation through Expo/JNI and phone lock lifecycle verification remain pending (see the native child specification). iOS native binding, automatic discovery, replication, nearby exchange, and governance transitions remain unbuilt. No new deployment was performed in this change.

- M0 foundations, M1 identity and lock, M2 Tero cards: done and deployed.
- Not for real members yet: nothing goes to real people before M7's security audit.
- Web vault hardened: in a browser, new passcodes must be passphrases of 10+
  characters (`PasscodePad.web.tsx`), because the device secret sits in local storage.
  Unlocking accepts any length so older web vaults still open. Phones keep 6 digits.
- The founder has claimed the Fool's seat (Sequence 0) on the web. Home shows a tarot
  card "0 · The Fool"; Tero cards show the inviter's card name under the QR code.
- Phone app on Expo Go (2026-10-06, branch `preview`, built from `e3dcce1`): iOS
  `01a10c1d-5036-71d2-947c-c710bb2e80fc`, Android `01a10c1d-5036-771e-ae3e-4cef057eb696`.
- Restore with the 12 words (`src/app/restore.tsx`): from the welcome screen (new
  device) or the lock screen ("Forgot it?"). Same words give the same address.
  12 numbered boxes; paste in any layout (`arrangePhraseWords`: "1 onion 2 tomato",
  numbered lines, commas) or type the first letters and press space
  (`completePhraseWord`).
- The Fool's seat: the hidden founder setup (long press on the welcome mark) opens only
  while `GET /api/founder` says `{open: true}`, i.e. Tero has no members. The first
  `POST /api/founder` after setup becomes Sequence 0; then the seat is closed for good.
  `FOUNDER_DID` is optional and, if set, restricts who may take the seat.

- Save the 12 words as a .txt file: "Save as a file" on the setup phrase screen and on
  "Recovery words" (home), which asks for the passcode again; the decoy passcode there
  switches to the plain view. File format `phraseFileText` (numbered lines, no digits in
  the note) pastes straight into restore. Web: Blob download; phones: share sheet.
- Card names: each Tero card draws a random Major Arcana (1–21) when made: never the
  Fool (0, the founder's alone) and never the giver's own card. The newcomer takes it on
  approval (`members.arcana`, `cards.arcana`; columns added on start for old rows). Names
  are not unique across members. Swahili arcana names are still English.
- Faster unlock on phones: the vault keeps the BIP-39 seed beside the phrase, so unlock
  skips PBKDF2 (old vaults are upgraded on their next unlock). scrypt (2^14) still runs
  in JS on Hermes, a few seconds; lowering it on phones is a founder decision.

- Phone passcode pad (`PasscodePad.tsx`): enters by itself on the sixth digit, round
  glass keys with letters (iOS 26 style), dots shake on a wrong code. On Expo Go since 2026-10-06.

- Design (2026-10-06): logo concept 1 "Sun card" is in use: drawn wordmark
  (`Wordmark.tsx`), SVG card mark, new app icons/splash/favicon (rendered from SVG with
  Playwright). Signed-in members land on five tabs under a floating glass bar
  (`app/(tabs)`, expo-router headless tabs, `GlassBar` blurs on iOS/web, solid on
  Android). You: member card with the sun art, number, name and Sequence. Suits: four suit
  cards, each opening `suit/[suit]` with its parts marked "Soon". Gathering, Circles,
  Messages: real layouts with empty states (no fake content).

- Founder feedback round (2026-10-06): phones use the system tab bar (`NativeTabs`:
  real Liquid Glass on iOS 26, SF Symbols / Material icons); the web keeps `GlassBar`,
  lower, with a capsule behind the chosen tab. You tab follows the mockup (card, list:
  Tero cards → `cards.tsx`, Recovery words, Language → `language.tsx`; address as small
  print). The app locks when closed or after 30 minutes away (`awayLockMs`), not on every
  switch (D19 updated). New phone vaults use scrypt 2^12 (web keeps 2^14). Scroll bars
  hidden.
- You tab: a round `CardAvatar` with your card name; tapping opens `my-card.tsx`, where
  the card arrives face down (`CardBack`) and turns over (respects reduce motion). Tero
  card screen: Show full screen (modal for scanning), Share image and Save image
  (`lib/card-image.ts`: react-native-view-shot + share sheet / expo-media-library add-only;
  web: Web Share with files, else download), with a warning that anyone with the image can
  try to claim the card.
- Web = Fool and council only (D40). Members have a `role` (fool, council, member;
  `members.role`, `MeResponse.role`). The Fool makes council cards (`type: 'council'`,
  Fool only, `not_allowed` otherwise): Sequence 1, card drawn from seats nobody on the
  council holds. On the web a full session renders `WebShell` (sidebar: Overview
  `admin/index.tsx`, Tero cards, Votes/Verifications/Countries/Moderators/Log "Soon", Recovery
  words, Language, card avatar, Lock); role `member` sees "Tero lives on your phone".
  Phones keep the tabs. Suits are plain light cards (no tarot frames).
- M5 public site live: `PublicHome` at `/` on the web (hero, suits, guides, partners, joining,
  safety, footer; founder long-press on the mark), `guides/` list and `guides/[slug]` pages
  (public in every state). Guide content in `src/guides/` (online safety, HRT basics, in
  four languages). Other guides stay
  "being written" until experts can write them.

- Placeholder designs (founder: "design all the other UI with placeholders"): `compose`
  (six post types), `circle`, `chat`, `space`, `part/[part]` (each suit part; Show my Tero
  card with the three changing words; Resources with "Not aware of Tero"; Journeys steps),
  `moderation` (phones; shown to the Fool and council until a moderator role exists).
  Grey `Skeleton` blocks + `SoonNote`; reached from Gathering's +, "See how a Circle/chat
  will look" links, suit rows and You. The web console collapses to a top bar under 760px.

- Founder round 3 (2026-10-06): "TERO" is now set in Cinzel (`Wordmark.tsx`; the
  founder disliked the monospace and the hand-drawn letters). Web lock is a split screen
  (dark card-back panel + white form, nothing identifying). Console: centred, 288px
  sidebar, System status panel (`GET /api/status`, Fool/council only: counts, never
  who), "Who can see what" page (`roles.tsx`). my-card on ivory. Suits rebuilt after the
  founder's Transspace structure: `lib/suits.ts` maps each suit to parts (Cups: mental
  health & HIV, someone to talk to, communities, stories; Pentacles: jobs, mutual aid,
  fundraisers; Swords: safe spaces & housing, legal & immigration, travel & mobility, show
  my Tero card; Wands: providers, gender-affirming care, general health, skills, journeys).
  `part/[part]` renders by kind (directory with trust filters, mutual aid, jobs, stories,
  skills, show card, journeys). Crisis support (`crisis.tsx`) and Map (`map.tsx`, areas
  only) sit at the top of Suits.

- Web addresses (founder, 2026-10-06): `/` public site, `/admin` the console overview
  (`app/admin/index.tsx`), `/admin/lock` the web lock, `/admin/cards|words|language|
my-card|roles` (re-exports of the shared screens). Phones keep `/lock` and the tabs.
  Web lock is plain (no tarot art: "too gamey"); the word "Tero" is now Newsreader 500,
  title case. Keep the admin side calm and professional, not game-like.

- Help, not Suits (D41, founder 2026-10-06): the Cups/Pentacles/Swords/Wands names are gone.
  Tab `(tabs)/help.tsx`, four plain areas in `lib/areas.ts` (`care`, `work`, `safety`,
  `health`; icons `AreaIcon.tsx`), i18n keys `area.*`, `part.*`, `help.*`. Tarot stays for
  member cards and Sequences only. The founder wants real features, built one by one, not
  placeholders.
- Directory is real (D42): `components/Directory.tsx` on the seven directory parts
  (`directoryParts` in `@tero/protocol`). API: `GET /api/places?part=`, `POST /api/places`,
  `PUT|DELETE /api/places/:id/vouch`, `DELETE /api/places/:id` (author, Fool or council).
  Stored in `RegistryObject` (`places`, `place_vouches`); authors and vouchers are HMAC
  pseudonyms (`pseudonym()` in `@tero/crypto`, keyed by `AUTH_SECRET`). 10 places/member/day.
- Mutual aid is real (D43): `components/MutualAid.tsx`; server `apps/edge/src/aid.ts`
  (`AidBoard`, `registry.aid`). API: `GET|POST /api/aid`, `GET|POST /api/aid/:id/replies`
  (GET for the author only), `POST /api/aid/:id/close`, `DELETE /api/aid/:id`. Posts expire
  after 30 days, 3 per member per day. Shared form pieces in `components/Form.tsx`.
- Jobs are real (D44): `components/Jobs.tsx`; server `apps/edge/src/jobs.ts` (`JobBoard`,
  `registry.jobs`). API: `GET|POST /api/jobs`, `DELETE /api/jobs/:id`. 60 days, 5/day.
- Stories are real (D45): `components/Stories.tsx`; server `apps/edge/src/stories.ts`
  (`StoryBoard`). API: `GET|POST /api/stories`, `PUT|DELETE /api/stories/:id/thanks`,
  `DELETE /api/stories/:id`. Content notes fold the story; dated by month only; 2/day.
  `built` in `app/part/[part].tsx` lists the part kinds that no longer show "Soon".
- Skills are real (D46): `components/Skills.tsx`; server `apps/edge/src/skills.ts`
  (`SkillBoard`). API: `GET|POST /api/skills`, `GET|POST /api/skills/:id/replies`,
  `DELETE /api/skills/:id`. Resources need an http(s) link and take no replies.
- Journeys are real (D47): `components/Journeys.tsx`, `lib/journeys.ts` (book model,
  templates), sealed with `sealText`/`openText` (`packages/crypto/src/box.ts`) and
  `session.journeySecret` (`deriveSecret(seed, 'journeys')`). API: `GET|PUT /api/journeys`
  (one sealed box per member, version check, `apps/edge/src/journeys.ts`).
- Web front door (founder, 2026-10-06): `/` is always the public site, in every state, and
  never inside the console sidebar (`_layout.tsx`: index guard is always on for web, placed
  after the admin screens; `publicPage` skips `WebShell`). The admin side is only at
  `/admin` (lock, then console); there is no link to it on the public site.
- Help tab (D49): `(tabs)/help.tsx` has one "Share or ask" button (opens `/part/<part>?create=1`,
  aid takes `create=request|offer`; each part component takes `create` and opens its form),
  a grid of cards for the parts, and chips for the seven place directories.
- Face ID / Touch ID / fingerprint / face unlock (D48): `lib/biometric.ts` (`.web.ts` stub;
  `biometricSupport()` names it per OS and reports `expoGo` on iPhones in Expo Go, where
  Face ID can't work), `components/BiometricRow.tsx` (switch + on/off status in You;
  `offerBiometric` asks once after a passcode unlock), lock screen leads with the
  biometric (`disableDeviceFallback`, so failure goes to Tero's passcode). Seed in
  SecureStore `WHEN_PASSCODE_SET_THIS_DEVICE_ONLY`; session keeps `openSeed` while open.
  **iPhone Face ID needs a dev build / TestFlight** (Apple Developer access needed).
- Not a game (D50): public site rebuilt plain and light (`PublicHome.tsx`), hero line
  "Queer knowledge, resources, community, & support" (`app.tagline`, `public.title`), no
  Fool card anywhere on the web (console avatar, `/admin/my-card` and greeting name removed).
  Languages: `LanguageMenu.tsx` dropdown on the web; phones' welcome screen links to the
  `language` list (now open in every state). Public headers are sticky.
- Testing member screens in a browser: the web sends the Fool to `/admin`, and a full page
  load locks. To reach `/part/...` locally, add a temporary `router.push` link on the admin
  page, export, test with Playwright (see founder setup steps), then revert before committing.

Member discovery checkpoint (2026-10-13): You now offers a permanent unique handle and editable display name, with native confirmation before a claim. Signed profiles are encrypted under a private directory key and searched on device. The Fool bootstraps the directory once; X25519 and HKDF grants wrap the key to admitted identity keys. Signed self grants acknowledge receipt, other active members forward missing grants, and session lock removes the protected provider and clears its key. The central registry stores ciphertext and keyed handle identifiers, and remains responsible for admission and uniqueness. Connection coordination exposes pair metadata to that registry; it is not independent Sefirah discovery or a private messaging protocol. Circles now lists actual members, searches names and handles, and supports requests, acceptance, decline, cancellation and removal, with a Contacts view. Following is an honest empty surface because verified professional appointment and following remain unimplemented. Groups and private chats remain unbuilt. See the member discovery child specification for exact contracts and remaining key rotation and metadata limits. Current verification: 219 tests across 30 files pass, all workspaces pass TypeScript, and targeted app lint passes. Physical Android shows both actual test members and working directory access. No personal handles were claimed or test contacts created by the agent; the users must choose their permanent handles and finish the two phone acceptance check. No production deployment or commit was performed.

## Next

Current first step: finish the human two phone profile and connection check using the latest iPhone preview, then build private messaging against the recorded OpenMLS decision. Do not treat the existing chat mockup, Following empty state or central discovery registry as completed Sefirah features.

Hino navigation and device testing (2026-10-13): the first four tabs share a capsule and You is a separate round button. Android uses efficient backdrop blur, 48 point controls and an 18 point gap above system navigation. iOS uses native `GlassView` Liquid Glass and SF Symbols where supported, 52 point controls and a 15 point bottom gap. Reduced motion and transparency are respected. The member total badge uses a member only aggregate endpoint, not live peer presence. Help removes Map and its duplicate card entry, and emphasizes crisis support and mutual aid. The physical Android confirms the split layout and the local count of one. The main capsule now minimizes to the current icon on forward scrolling and expands on reverse scrolling or tap, following the Notables threshold and smooth spring on both phones. You stays fixed. The scroll state clamps edge bounce and respects reduced motion. iPhone appearance and the new council join still need user device verification.

The founder created the Fool on the separate local Android registry. The shared test API is verified at `http://192.168.1.4:8794`, through the Android phone's Wi-Fi address and existing USB reverse forwarding. The ChromeOS host address `192.168.1.5:8794` refused LAN connections even with its forwarding switch enabled; ChromeOS localhost and the Linux guest address worked. The user verified `.4` on all devices, and independent HTTP health and closed founder seat checks also pass there. Keep Android attached by USB and preserve `apps/edge/.wrangler/sefirah-device-network/state` and its ignored auth secret. Wrangler listens on `0.0.0.0:8794`; its inspector stays on loopback. This is a local membership test route, not a new production network or native iOS Sefirah carrier.

`TERO_EXPO_GO_PREVIEW=1` selects the Expo Go SDK 57 runtime and exposes test account switching; use EAS `--input-dir .expo/ios-council-preview` so updates do not overwrite web deployment assets. The latest council test preview targets the verified `.4` API. Test account switching asks the user to save recovery words, then removes local vault keys and biometric unlock, closes transports and invalidates late sign-in results. It does not delete membership or change roles. The user chose Android Fool and a fresh iPhone council member; moderators remain unimplemented. Expo Go cannot load the native Sefirah transport. Current checks: 209 tests pass, all six workspaces pass TypeScript, and targeted lint passes for the new navigation/reset code. Expo lint is now configured, but the full app still has 13 existing errors in older card, passcode, setup and locale code. Bun is installed at `~/.bun/bin/bun` and needs that directory on PATH in this shell.

Sefirah priority: validate real private primary connectivity, then verify the device outbox on real phones and design independent membership verification and recipient key distribution before migrating existing app flows. The development fallback has small test-only quotas and expiry, not agreed retention for real member data. See the specification for unresolved product rules and verification evidence. The older feature roadmap below remains historical context.

1. Real features, one by one (founder): all six Help parts are real (directory,
   mutual aid, jobs, stories, skills, journeys). Each: protocol shape + registry table + routes +
   tests + screen, no placeholders.
2. `EXPO_TOKEN` is in the environment (robot of the `pherus` Expo org). The founder pasted
   one in chat earlier; it should be rotated. Build the Compose, Circle and chat screens as
   their milestones land.
3. After app changes, republish Expo Go: temporary `runtimeVersion: exposdk:57.0.0` in
   `apps/app/app.json`, `npx eas-cli@latest update --branch preview --platform all
--environment preview --non-interactive` (newer eas-cli needs `--environment`), then remove the runtimeVersion. Needs `EXPO_TOKEN` (robot of the
   `pherus` Expo org) in the environment.
4. M3: private chats use OpenMLS (D39, [docs/messaging-choice.md](docs/messaging-choice.md)).
   On hold: the founder said to work on other things first. Needs an EAS test build.
5. Open design items: pick a logo concept; match the You-screen tarot card to the
   founder's reference image (Pinterest is blocked here; ask for it as an attachment).

## Testing tips

- Local full stack: `apps/app`: `EXPO_OFFLINE=1 CI=1 bunx expo export --platform web`;
  `apps/edge`: put `AUTH_SECRET=<32+ chars>` in `.dev.vars` (gitignored), then
  `bunx wrangler dev --port 8787`. Re-exporting the web build breaks a running
  `wrangler dev`; restart it. Delete `.dev.vars` afterwards.
- Founder setup in a test browser: long-press the card mark on the welcome page.
- When killing processes, don't use `pkill -f`/`pgrep -f` with patterns that also match
  the shell's own command line (it kills the shell).
- `docs.expo.dev` and `api.expo.dev` were added to the network allowlist; Pinterest isn't.

Circles refinement (2026-10-13): compact contacts rows and segmented filters, own profile pinned first in Network and linked to You, self excluded from Contacts, trailing connection state icons, and pull to refresh. Profile handles now accept hyphens and show @la-niina / La niina examples. Debounced availability uses an authenticated keyed tag endpoint, never plaintext handles, and save still enforces uniqueness. No permanent test handle claimed by the agent.

Verified this refinement with 220 passing tests, all workspace type checks and lint on changed app files. Android visually confirmed compact Circles, own profile navigation to You, tighter You spacing and live availability for la-niina without claiming it. iPhone native visual verification remains with the founder.

Latest Hino preview (2026-10-13): published iOS Expo Go update group `15fbedc7-22e4-4bb0-811f-f8cb2b7558c9`, iOS update `01a132f1-6af8-76b0-b99c-cb32a629225e`, runtime `exposdk:57.0.0`. Yoru replaces the personal tab title in all locales. Circles has Spaces, Network, Contacts, Following with intrinsic underline tabs, zero horizontal padding and 8 point gaps. Rows show profile name/handle or card title/short address without Sequence. Smaller plus, Lock and identity controls, refined fingerprint and tighter gaps are present. ActiveCircles presentation is positioned above the selector, but receives an empty source until real live session discovery is implemented. Spaces is an honest unavailable audio empty state with the current Circles area. 220 tests and all workspace types pass; changed app lint passes. No new Cloudflare deployment or permanent handle claim.

Contact request refinement (2026-10-13): the founder has claimed @la-niina (La niina) and the second account @pherus (Pherus). Android visibly has a pending incoming request from Pherus, so final acceptance remains a human check. Fixed the missing visible status after row simplification: Request sent, Wants to connect and Connected labels, pending count on Contacts, requests before accepted contacts, labelled Accept, and confirmation before cancelling outgoing requests. Android Network and Contacts verified without mutating the request. 220 tests, workspace types and changed screen lint pass. No messaging work started.

Latest iPhone request indicator preview: Expo group `437984b7-bdd7-4748-b829-256fb444dace`, iOS update `01a132f9-f169-70d7-a1af-a6f5fcc2bc1d`, published to preview with SDK 57 runtime. Supersedes the previous Hino preview.

Private messaging foundation (2026-10-13, supersedes the earlier “on hold” and “no messaging work started” notes): official OpenMLS 0.9.1, RustCrypto 0.6.0 and our UniFFI export interface are implemented in `apps/app/modules/sefirah-mls/native`. Exactly two canonical account DID/key credentials, one handshake per engine, bounded private UTF-8 messages, replay/reordering controls and explicit close. Twelve Rust tests pass; strict Clippy and Rust formatting pass. Android arm64 library builds, and a standalone synthetic two-party probe passed on the physical TECNO (handshake, both directions, replay rejection, close), then was removed. This did not use the real vault, network, app bridge or second device. Workspace types pass; full app lint has existing baseline failures. No installed APK or Expo preview changed.

Next messaging work: generate/connect mobile UniFFI bindings, transactional encrypted ratchet storage and lock lifecycle, accepted-contact enforcement and key-package distribution, epoch updates, transport, authenticated receipts, expiry and real chat UI. Nothing in this slice persists MLS groups or sends app messages. The founder corrected retention to seven days for unread messages; otherwise 24 hours after both participants read them. See `docs/specs/_root/0001-sefirah/0007-private-message-engine.md`. No production readiness or post-compromise healing claim yet.


Development reconnection: read `docs/development.md` when restarting local testing. It has verified Worker/Metro commands, persistent test registry path, ADB reverse ports, Android Wi-Fi route to iPhone, diagnostics and native rebuild/update steps. Worker was restarted on 0.0.0.0:8794 and USB 8081→8084 / 8794→8794 restored. Android Wi-Fi remains 192.168.1.4. Keep the ignored registry state and auth secret; never reset accounts to fix connectivity.

MLS mobile binding (2026-10-13): Kotlin UniFFI generated bindings and a gated Android Expo module are built and installed as a preserving update. Rust `shutdown()` replaces the old exported `close()` because UniFFI reserves Kotlin close for disposal. The session-owned JS adapter closes engines on lock, decoy, replacement and unmount. Physical Android in-app synthetic bridge probe passed (JS→Kotlin→UniFFI→Rust, two-way encryption and replay rejection). 225 workspace tests plus 12 Rust tests, all workspace types, changed app lint, strict Clippy and formatting pass. Disabled Android stub compiles; iOS JS export succeeds. No native iOS binding, persistence, network message delivery or real chat UI yet. No new Expo publish or Cloudflare deployment.


MLS persistence (2026-10-13): `0008-message-state.md` supersedes the earlier “persistence unbuilt” notes. Native `PrivateChat::open` encrypts current OpenMLS provider state, pending ciphertext and inbox in one SQLite record, with FULL sync, revision conflict checks, explicit version checks and no older-snapshot fallback. Failed persistent mutations close the engine before releasing output. Full sessions derive storage key at `app/5`; native paths are no-backup HMAC namespaces. Test-only cache cleanup is separate. 21 Rust tests, 228 workspace tests, workspace types and changed app lint pass. Separate Android processes passed commit/exit/reopen/exchange; the in-app JS→Kotlin→UniFFI→Rust persistence probe passed too, and synthetic cache files were removed. Updated APK installed preserving the Fool vault; iOS JS export passes without publishing. Power-loss/forensic rollback guarantees, receipts/retention, queue consumption, native iOS, peer delivery and real chat UI remain pending. See `docs/development.md` for current restart and diagnostic steps.

Messages UI and tarot study (2026-10-13): supersedes “real chat UI pending” above. Accepted contacts open a real peer screen after a fresh authenticated connection check; Android verified Pherus in Messages and chat. Three focused access tests pass; app types and changed-file lint pass. Sending, transport, receipts and expiry enforcement remain unbuilt. The first ten Major Arcana (0–IX) have distinct symbolic fronts, shared TarotFrame and common back, ratio 1:1.70. Latest founder direction restores dark charcoal/gold and draws original ceremonial motifs from Lord of Mysteries and anime/books; pink and cream/red experiments are superseded. See `docs/tarot-design.md`; Yoru → Tarot design study is test-only. Latest published iOS preview group `45d175ae-f087-4e89-9fa4-6830f8b2472b`, iOS update `01a1340d-e0c3-7506-bbbb-30c91e10a507`, SDK 57 runtime. No native rebuild or production Cloudflare deployment for this slice.
