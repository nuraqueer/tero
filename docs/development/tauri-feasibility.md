# Tauri / TanStack / PassUI foundation: compatibility gate

Assessment: 5 November 2026. **No native prototype has been built yet.**

## Verified repository facts

- Tero currently has an Expo SDK 57 React Native app, with React `19.2.3`,
  TypeScript `~6.0.3`, a Bun `1.3.14` lockfile and direct Worker routes.
- The current Pherus PassUI repository exposes `@passui/react` for components,
  `@passui/tanstack` for TanStack integrations and `@passui/tokens` for tokens.
  It is an external library, **not** a `packages/passui` workspace inside Tero.
- At inspection, PassUI's workspace uses Bun `1.4.2` and Turborepo `2.11.10`;
  `@passui/tanstack` declares React `^19.3.0`, TanStack Router `^1.170.39`,
  Query `^5.104.0` and Tailwind CSS `^4.3.3` peer dependencies. These are
  compatibility inputs, not automatically approved Tero dependency versions.
- The existing Worker is already `tero` and serves `tero.pherus.org`. Its
  `REGISTRY`, `SEFIRAH_FALLBACK`, `CHAT_MAILBOX` and `CHAT_PUSH` classes must be
  kept available until all state and protocols have verified replacements.

## Build contract to prove

1. One root TanStack Start source tree with `src/router.tsx` and
   `src/routes/__root.tsx`, using static/SPA output for the Tauri native WebView.
   Normal TanStack Start server functions cannot run inside a phone's WebView.
2. A single `src-tauri/` Rust project targets both Android and iOS, consuming
   the exact static output built from that same React source.
3. Public web routes can be prerendered where suitable; any dynamic server
   functions require an explicitly deployed runtime. Browser peer networking
   needs a capability-compatible adapter distinct from native Rust sockets.
4. PassUI components and styles are imported from actual published exports.
   Preserve the mobile visual design; implement pages directly inside each
   TanStack `RouteComponent`. No manual substitute typography or copied UI.
5. Bun installs and locks dependencies, Turbo orchestrates builds/checks, Cargo
   builds Rust, and a supported TanStack Start compiler (Rsbuild or Vite) builds
   the frontend. Turbo does **not** replace the compiler.

## Required checks before modifying production paths

- Resolve PassUI, TanStack Start, React, Tailwind, Tauri, Rsbuild and Rust
  versions into one compatible lockfile; do not pick each latest in isolation.
- Confirm the generated TanStack Start client is usable in Tauri on Android and
  iOS; compare actual navigation, history, deep links and static asset handling.
- Verify phone keychain/keystore operations, notification registration and native
  lifecycle constraints. Preserve the current Expo test app until parity is real.
- Test the public site, member app and console with the same route tree and
  distinct authorisation boundaries. The console is not secured by hiding links.
- Run format, TypeScript, Rust checks, web build and physical device checks.

## Environment and progress

The current execution environment can clone and inspect both GitHub repositories
but has Node only; neither Bun nor Cargo/Rust toolchains are present. Therefore
it cannot validate a Bun lockfile, a Tauri binary or native Rust compilation.
Do not commit an unverified replacement scaffold that breaks the existing CI or
assert that Stage 1 is complete. The next executable action needs a toolchain-
enabled environment or CI runner, followed by the minimal compatible build.
