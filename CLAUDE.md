# Tero: notes for Claude

Read this first in every session. Keep it current: update "Where we are" and
"Next" whenever a milestone lands or a decision changes.

## What Tero is

A global, invite-only platform where queer people help each other, built for
places where being seen is dangerous. Inspired by the Tarot Club in _Lord of the
Mysteries_. Owner: the founder of Pherus ("the Fool"). Full picture:
[docs/README.md](docs/README.md) (decisions log D1–D38) and [docs/vision.md](docs/vision.md).

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

## Where we are (2026-10-05)

- M0 foundations, M1 identity and lock, M2 Tero cards: done and deployed.
- Not for real members yet: nothing goes to real people before M7's security audit.
- Web vault hardened: in a browser, new passcodes must be passphrases of 10+
  characters (`PasscodePad.web.tsx`), because the device secret sits in local storage.
  Unlocking accepts any length so older web vaults still open. Phones keep 6 digits.
- The founder has claimed the Fool's seat (Sequence 0) on the web. Home shows a tarot
  card "0 · The Fool"; Tero cards show the inviter's card name under the QR code.
- Phone app published to Expo Go (2026-10-05, branch `preview`): iOS update
  `01a109b0-7c08-73d0-a853-c11bbbf33e0d`, Android `01a109b0-7c08-7ec0-8691-f5737507fac8`.
- Restore with the 12 words (`src/app/restore.tsx`): from the welcome screen (new
  device) or the lock screen ("Forgot it?"). Same words give the same address.
- The Fool's seat: the hidden founder setup (long press on the welcome mark) opens only
  while `GET /api/founder` says `{open: true}`, i.e. Tero has no members. The first
  `POST /api/founder` after setup becomes Sequence 0; then the seat is closed for good.
  `FOUNDER_DID` is optional and, if set, restricts who may take the seat.

## Next

1. M3: private chats. Start by comparing libsignal, vodozemac and OpenMLS
   ([docs/build-plan.md](docs/build-plan.md)).
2. Open design items: pick a logo concept; match the You-screen tarot card to the
   founder's reference image (Pinterest is blocked here; ask for it as an attachment).
