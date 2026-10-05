# Tero: notes for Claude

Read this first in every session. Keep it current: update "Where we are" and
"Next" whenever a milestone lands or a decision changes.

## What Tero is

A global, invite-only platform where queer people help each other, built for
places where being seen is dangerous. Inspired by the Tarot Club in _Lord of the
Mysteries_. Owner: the founder of Pherus ("the Fool"). Full picture:
[docs/README.md](docs/README.md) (decisions log D1–D39) and [docs/vision.md](docs/vision.md).

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
  `cd apps/edge && bunx wrangler deploy` (needs `CLOUDFLARE_API_TOKEN`).
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
- Phone app published to Expo Go (2026-10-06, branch `preview`, group
  `7655e4af-848c-4ccc-9304-39b51d16bff9`): iOS update `01a109d1-5c34-72b9-a693-55b6d4b62c82`,
  Android `01a109d1-5c34-7604-a206-94904b3a3b5c`. Includes logo, tabs, screens and the new pad.
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

## Next

1. Put `EXPO_TOKEN` in the environment settings (the founder pasted one in chat for the
   2026-10-06 publish; it should be rotated). Then build the Compose, Circle and chat screens as their milestones land.
2. After app changes, republish Expo Go: temporary `runtimeVersion: exposdk:57.0.0` in
   `apps/app/app.json`, `npx eas-cli@latest update --branch preview --platform all
--environment preview --non-interactive` (newer eas-cli needs `--environment`), then remove the runtimeVersion. Needs `EXPO_TOKEN` (robot of the
   `pherus` Expo org) in the environment.
3. M3: private chats use OpenMLS (D39, [docs/messaging-choice.md](docs/messaging-choice.md)).
   On hold: the founder said to work on other things first. Needs an EAS test build.
4. Open design items: pick a logo concept; match the You-screen tarot card to the
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
