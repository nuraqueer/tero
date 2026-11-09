# Source inventory and ownership boundaries

Read-only source snapshot: `ae308c6`, 21 October 2026. Counts below reflect
tracked paths in that snapshot, not runtime coverage. This file is a migration
inventory, not a claim that anything has already been converted to Tauri.

## Current entry points

- `apps/app`: Expo SDK 57 / React Native 0.86, Expo Router, Android/iOS/web.
  `src/app/` contains current pages, `src/components/` the legacy RN visual
  building blocks and `src/lib/` sessions, encrypted chat and network adapters.
- `apps/edge`: **already one Worker named `tero`**, routed only through
  `tero.pherus.org`. Direct TypeScript routing in `src/index.ts` and
  `src/worker.ts`, SQLite Durable Objects in `registry-object.ts`,
  `fallback-object.ts`, `chat-mailbox.ts`, `chat-push.ts`.
- `packages/crypto`: TypeScript BIP39/Ed25519/HKDF, encrypted vault, directory,
  sealed posts and private delivery, with compatibility tests.
- `packages/protocol`: current shared TypeScript contracts.
- `packages/i18n`: four dictionaries; non-English copy remains unreviewed.
- `packages/ui`: **legacy local** tokens, not the external PassUI library.
- `apps/app/modules/sefirah-mls/native`: real Rust OpenMLS crate and tests.
  Android Java/Kotlin and iOS Swift bridges are Expo-specific today.
- `apps/app/modules/sefirah-tor`: Rust/Arti transport experiments and native
  bridges. Do not claim this is a complete independent peer network.

## Route and design migration

| Legacy screen/source | Target route or role | Special requirement |
| --- | --- | --- |
| `(tabs)/gathering.tsx` | `src/routes/_app/gathering.tsx` | Preserve currently selected initial tab and feed presentation |
| `(tabs)/help.tsx` and `part/[part].tsx` | `src/routes/_app/help/` | Keep actual directories, jobs, stories, skills and aid; no fake completion |
| `(tabs)/circles.tsx` and `circle.tsx` | `src/routes/_app/circles/` | Contacts are real; group messaging remains planned |
| `(tabs)/messages.tsx` and `chat.tsx` | `src/routes/_app/messages/` | Preserve native encrypted message handling and UI states |
| `(tabs)/you.tsx` and `my-card.tsx` | `src/routes/_app/you/` | Preserve card identity and established visual design |
| `setup.tsx`, `restore.tsx`, `lock.tsx`, `words.tsx` | `src/routes/_auth/` | No phrase/data reset; account and decoy semantics require explicit tests |
| `cards.tsx`, `card/[id].tsx`, `scan.tsx`, `c/[token].tsx` | Invitation/card routes | Single-use, claim and approval behaviour cannot regress |
| `guides/` and `PublicHome.tsx` | `src/routes/_public/` | Improve public design while preserving expert-content disclaimers |
| `admin/` | `src/routes/_console/` | Role checks at operation boundary, not just navigation |
| `space.tsx`, `crisis.tsx`, `map.tsx`, `compose.tsx` | product backlog and explicitly labelled previews | Do not turn placeholders into apparent services |

There are 146 source paths under `apps/app/src`, 39 paths under native modules,
and 32 source paths under `apps/edge/src` in this snapshot. Existing UX and
product logic must be reviewed individually before selecting reuse versus rewrite.

## Intended dependency direction

```text
TanStack route/page
  -> feature hooks and reusable PassUI-based pieces
  -> typed service interface
  -> native Tauri commands / browser adapter
  -> Rust domain services
  -> authenticated peer transport + encrypted local storage

Worker `tero` (last-resort only)
  -> bounded encrypted transport and retained legacy API migration path
```

The Rust domain services may depend on identity, crypto, storage, networking
and governance interfaces, but must not import Tauri UI/runtime dependencies.
Transport must not manufacture authorisation; the signed membership and
revocation policy authorises operations independently of route reachability.

## Important unknowns and required proofs

1. External PassUI package exports, compatibility and styling must be inspected
   before authoring real TSX. Never invent its component names.
2. TanStack Start static client output must be proven on physical Android and
   iOS Tauri builds, and public web SSR/static behaviour must be scoped.
3. Browser peers need a WebRTC/WebTransport/WebSocket-compatible route; native
   libp2p/Arti APIs cannot simply be imported into the browser.
4. Actual persistent key/vault schema compatibility and OpenMLS snapshot
   migration need reversible tests with non-sensitive fixtures.
5. The 20 October audit reports server-readable boards and connection metadata.
   Migrating to encrypted replication requires data-classification decisions and
   reader/consent policies, not just moving those routes to Rust.
6. Tero's only Worker already has live Durable Object migrations v1-v4. Renaming
   resource bindings or deleting `apps/edge` is out of scope until a stable
   compatible replacement and migration are verified.
7. Current CI failed at formatting on `ae308c6`. Typechecks and tests were
   skipped in that run. A new build pipeline must distinguish legacy and new
   checks without hiding these failures.
