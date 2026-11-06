# Tero 2 engineering conventions

## Files and boundaries

- One TanStack Start `src/routes/__root.tsx`, one `src/router.tsx`; an optional
  `src/server.tsx` is only an actual Start server entry when needed.
- Each route file contains `Route = createFileRoute(...)` and `RouteComponent`.
  All its page markup, handlers and hooks live inside `RouteComponent`. Do not
  create a page-shaped component elsewhere and render only that from the route.
- Feature modules describe domain behaviour. Feature-local hooks stay there;
  cross-cutting hooks may live in `src/hooks/`. Components are reusable pieces,
  not a screen mirror. Services are typed operations and adapters, not duplicate
  business logic. Avoid `shared`, `misc` or `utils` dumping grounds.
- Imports within the frontend use `@/`; workspace libraries use their proper
  package specifiers. Use `snake_case` for Rust modules and `PascalCase` for
  React component filenames; regular TS filenames use `kebab-case` consistently.
- PassUI is an **external existing library**. Use its actual documented exports,
  typography and styling. Do not invent component APIs or duplicate CSS tokens.
  HTML controls are only direct where PassUI has no suitable equivalent.
- Public assets live in `public/`. No secrets, source maps of sensitive code,
  recovery phrases or private device exports may go there.

## Code quality

- Keep new Tero client tests in `apps/tero/tests/`, outside `src/`.
  The test runner must target that directory explicitly, and test imports point
  to the production modules rather than requiring duplicate implementation files.
- Keep Tauri-specific Rust test implementations in `apps/tero/src-tauri/tests/`;
  private unit tests may be linked from their module with a `#[path]` declaration.

- Strong TypeScript types, no unreviewed `any`; validate cross-runtime data.
- Use TanStack Query for asynchronous cached state, TanStack Form for forms and
  Table for real complex tables. Prefer derived values over effect-driven state.
- Optimistic local updates must reflect durable local commit, not peer delivery.
  Error states and rollback cannot silently discard a user's changes.
- Rust cryptographic, storage and network code must have focused protocol and
  migration tests. Avoid logging keys, private messages or contact graphs.
- Keep modules cohesive; review overly large files instead of enforcing an
  arbitrary universal line count. Do not introduce a layer without a concrete
  dependency/security/reuse reason.
- Format and lint consistently; run focused tests during work and full gates
  before a release checkpoint. Do not hide old failures by removing tests.
- No architecture claim implies runtime safety. Verify devices, backgrounding,
  network blocking, peer identities, recovery, notification and app-store rules.
