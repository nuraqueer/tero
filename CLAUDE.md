# Tero: notes for Claude

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

- M0 foundations, M1 identity and lock, M2 Tero cards: done and deployed.
- Not for real members yet: nothing goes to real people before M7's security audit.
- Web vault hardened: in a browser, new passcodes must be passphrases of 10+
  characters (`PasscodePad.web.tsx`), because the device secret sits in local storage.
  Unlocking accepts any length so older web vaults still open. Phones keep 6 digits.
- The founder has claimed the Fool's seat (Sequence 0) on the web. Home shows a tarot
  card "0 · The Fool"; Tero cards show the inviter's card name under the QR code.
- Phone app on Expo Go (2026-10-06, branch `preview`, built from `13ada17`): iOS
  `01a10c18-0a18-7d5a-bf0b-1d58d3984a3a`, Android `01a10c18-0a18-7a95-8d18-eb566b871fb3`.
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
- Face ID / fingerprint unlock (D48): `lib/biometric.ts` (`.web.ts` stub), settings screen
  `app/biometric.tsx` (You → "Face ID or fingerprint": one switch), lock screen asks
  automatically when on (`unlockWithBiometric`, round icon button). `LocalAuthentication`
  confirms the owner (device passcode fallback allowed); seed in SecureStore
  `WHEN_PASSCODE_SET_THIS_DEVICE_ONLY` (`requireAuthentication` failed in Expo Go). The open
  session keeps the seed in memory (`openSeed`, cleared on lock) so turning it on needs no
  passcode. Turned off by `finishSetup` (new or restored vault).
- Not a game (D50): public site rebuilt plain and light (`PublicHome.tsx`), hero line
  "Queer knowledge, resources, community, & support" (`app.tagline`, `public.title`), no
  Fool card anywhere on the web (console avatar, `/admin/my-card` and greeting name removed).
  Languages: `LanguageMenu.tsx` dropdown on the web; phones' welcome screen links to the
  `language` list (now open in every state). Public headers are sticky.
- Testing member screens in a browser: the web sends the Fool to `/admin`, and a full page
  load locks. To reach `/part/...` locally, add a temporary `router.push` link on the admin
  page, export, test with Playwright (see founder setup steps), then revert before committing.

## Next

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
