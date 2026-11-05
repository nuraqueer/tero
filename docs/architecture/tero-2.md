# Tero 2: agreed target architecture

Status: approved direction, **not yet implemented**. Updated 5 November 2026.
This document supersedes older *proposals* where they conflict, but does not
rewrite the historical implementation record in `docs/continuation.md` or
`docs/status-audit-2026-10-20.md`.

## Product and runtime

- One repository and one Tauri v2 native project for Android and iOS.
- One responsive React interface using TanStack Start/Router and the existing
  external Pherus PassUI library. Do not vendor or recreate PassUI.
- The web output serves public information, members where browser capabilities
  support the workflows, and a separately authorised moderator/council console.
- The existing mobile experience, navigation, tarot/card visual identity and
  interaction design are the reference. Recreate the same UX using PassUI; do
  not copy React Native components or arbitrarily redesign native screens.
- Improve the public website's editorial structure and accessibility while
  retaining the Tero brand. The only application domain is `tero.pherus.org`.
- Rust owns identity, authorisation, cryptography, durable state, peer transport,
  synchronisation and network policy. TypeScript owns interface composition and
  typed adapters. Native Android/iOS integrations stay narrow.
- Bun and Turborepo orchestrate TypeScript workspaces and tasks; Cargo manages
  Rust workspaces. TanStack Start still needs a supported bundler (Rsbuild or
  Vite); Turbo is not itself a frontend bundler.

## Peer-first network

Sefirah is the network engine, not a second app. Prefer authenticated direct
peer connectivity, then approved peer relays, then alternative privacy-preserving
routes such as Tor, and finally the existing single Cloudflare Worker `tero` as
an exceptional, bounded fallback. Route selection must consider metadata leakage,
consent and blocking; it must never silently downgrade to a less private route.
The Worker is **not** the default message broker or permanent application source
of truth. The future fallback design needs explicit eligibility, quotas, expiry,
abuse prevention, and metrics without collecting private payloads.

Local-first writes must be committed durably before optimistic UI confirmation.
Peer acknowledgements, delivery and read state are distinct. Replication is
encrypted, policy-bound and optional according to data sensitivity; private
messages, personal journeys, public resources and revocation events have different
consistency and retention requirements. A phone that is backgrounded or offline
cannot be assumed to act as a continuously available network node. Browser
transport is limited by browser networking APIs. Push is a wake signal and must
not carry message content or become the authoritative data path.

## Security invariants

- Protect existing test accounts, phrases, device state, identifiers, registry
  records, mailbox data, Worker secrets and namespace bindings.
- Do not claim that existing Help boards or connection metadata are end-to-end
  encrypted: the 20 October audit documents server-readable content/metadata.
- Every record type must define its reader audience, key ownership, expiry,
  replica eligibility, revocation and reporting strategy before migration.
- Identity, community membership, verified credentials, trust, roles and
  governance authority are separate concepts.
- Group messages require MLS membership changes and recovery, not merely an MLS
  dependency. Lost-identity and stolen-device recovery require explicit policies.
- Do not expose private data to the moderator console by default. Content
  disclosed for reports requires bounded consent, reviewer access and retention.
- No app-store beta for at-risk participants before effective blocking,
  reporting, recovery, privacy disclosures and independent security review.

## Frontend rules

- `src/routes/` owns full pages. A route file declares `Route` with
  `createFileRoute` and one `RouteComponent`. No other page, helper component or
  top-level business function is declared in that route file.
- The JSX, PassUI elements, semantic tags when needed, hooks, local handlers and
  page composition belong **inside** `RouteComponent`. Do not replace a full
  page with `<SomePage />` just to move its markup elsewhere.
- `src/components/` holds genuinely reusable Tero-specific pieces composed from
  PassUI. `src/features/` owns coherent domain behaviour, including feature-local
  hooks when appropriate. `src/hooks/` holds cross-feature React hooks.
- `src/services/` exposes typed native/web operations. It must not duplicate
  Rust security or domain rules. `src/lib/` is for small shared infrastructure,
  never a dumping ground.
- Use PassUI's exported components, tokens and global typography. No second
  typography, component or style framework. Avoid raw HTML UI controls when
  PassUI has an equivalent. Preserve semantic HTML when necessary.
- Use `@/` for application source imports. Use package names for external
  libraries. No convoluted relative import chains. Prefer TanStack Query,
  Form and Table where applicable, with truthful pending/error/optimistic states.
- `public/` holds publicly served assets. Private cryptographic data never does.

## Single deployment naming

The currently deployed Worker is already `tero`, and its sole route is
`tero.pherus.org`. Do not create a second Worker or another application domain.
Newly agreed resource names use a `tero-` prefix, for example `tero-durable` and
`tero-bucket`, subject to Cloudflare resource-specific naming and migrations.
Existing `REGISTRY`, `CHAT_MAILBOX`, `CHAT_PUSH`, `SEFIRAH_FALLBACK` Durable Object
bindings and class migrations MUST NOT be deleted or renamed without a verified
data-preserving migration. The intended source organisation does not require a
separate product/backend, but the hosted fallback must remain deployable and
testable outside a Tauri binary.

## Build decision requiring proof

Prove TanStack Start's static/prerendered client output runs inside Tauri v2 on
Android and iOS. Its normal server entry cannot execute inside a mobile WebView.
For dynamic browser-only server routes, explicitly identify a deployable runtime
or move the operation into Rust/browser-compatible protocols. Do not silently
assume full SSR and server functions are available to the native client. A single
source tree does not mean the web, mobile and Worker runtimes are identical.
