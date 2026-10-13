# Tero agent entry point

Read [docs/continuation.md](docs/continuation.md) first. It is the current handoff
for desktop and terminal Codex, including the next task and unfinished work.
Then read [CLAUDE.md](CLAUDE.md) for existing project conventions and product
history. Later dated corrections in the handoff supersede older status notes.
The existing CLAUDE.md is preserved rather than migrated or rewritten.

## Working context

- This is early development. Distinguish working code, experiments and planned features.
- Continue on `main`. Preserve the current uncommitted work and device accounts.
- The user prioritizes implementation and focused verification. Avoid repeated full
  suites, native rebuilds or UI checks when no relevant change justifies them.
- Use Bun. Read [apps/app/AGENTS.md](apps/app/AGENTS.md) before mobile changes.
- Use [docs/development.md](docs/development.md) to restart testing. Never reset
  the shared registry, replace its auth secret, clear app data or uninstall Tero
  to repair a connection.
- The iPhone route is TestFlight. The user has Apple Developer membership and
  explicitly does not want to enable Developer Mode. Expo Go remains a UI preview
  until a native TestFlight build exists.
- Do not claim actual chats work from the UI or synthetic encryption probes.
  The owner confirmed real chat on 14 October 2026. Native sending is enabled;
  receipt, expiry and lifecycle edge cases still need focused device evidence.

## Context files

- [docs/continuation.md](docs/continuation.md): current checkpoint and next steps.
- [docs/development.md](docs/development.md): local server and device commands.
- [docs/specs/_root/0001-sefirah/index.md](docs/specs/_root/0001-sefirah/index.md): network and governance specifications.
- [docs/tarot-design.md](docs/tarot-design.md): current first ten card designs.
