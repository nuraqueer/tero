# Tero 2 migration map and staged delivery

Status: planning and source inventory, not evidence of a working Tauri build.
Baseline: `main` at `ae308c6` (21 October 2026). Preserve the current Expo app
and hosted test state until its replacement is independently verified.

## Stages and acceptance gates

| Stage | Work | Exit evidence |
| --- | --- | --- |
| 0. Source and architecture | Freeze ownership, inventory components, protocols, data contracts, native bridges, CI and product decisions | Reviewed map, target module boundaries and preservation constraints |
| 1. Tauri feasibility | One native project, TanStack Start static client, PassUI, Bun/Turbo/Cargo, browser adapter, Android/iOS builds | Static app works on Android, iOS and web; app-store signing route identified |
| 2. Identity and storage | Versioned Rust identity/vault/storage adapters, phrase import and migration tests | Existing test identities restore without destructive migration |
| 3. Peer networking | Direct authenticated connection, peer discovery, relay, alternative route, transport policy | Two physical phones on separate networks exchange protected traffic without Cloudflare |
| 4. Sync and chat | Durable local journal, encrypted replication, OpenMLS compatibility, retries, receipts, notifications | Restart/offline/retry/expiry and truthful acknowledgment evidence |
| 5. Product UI | Reimplement current app design in PassUI; Help, Gathering, Circles, journeys, user and public/console routes | Representative parity checklist and accessible web experience |
| 6. Safety and governance | Reporting, blocking, revocation, professional verification, contribution evidence and last-resort Worker policy | Enforced permission, abuse and fallback tests |
| 7. Hardening | Dependency/security review, device/battery performance, backup/restore and release checks | Independent findings addressed and bounded invited beta approved |

Stages can overlap, but every stage must preserve the live test accounts and
data. Do not call a route, feature or platform ready because its code builds.
Record implemented, physically confirmed and unverified status separately.

## Existing source ownership

| Existing source | Target | Handling |
| --- | --- | --- |
| `apps/app/src/app/` Expo Router screens | `src/routes/` TanStack Start | Reimplement route layout in PassUI; preserve screen UX, don't mechanically copy React Native JSX |
| `apps/app/src/components/` | `src/components/` or inline route JSX | Inventory reuse; keep only genuinely reusable components |
| `apps/app/src/lib/` | `src/features/`, `src/hooks/`, `src/services/`, `src/lib/`, Rust crates | Classify by ownership; move durable domain/security rules to Rust |
| `apps/app/src/guides/` | public content source | Preserve reviewed text, provenance and translation status |
| `apps/app/modules/sefirah-mls/native/` | Rust crypto/messaging ownership | Reuse OpenMLS implementation after compatibility and migration tests |
| `apps/app/modules/sefirah-mls/{android,ios}/` | `src-tauri` platform integration | Adapt carefully; do not assume Expo modules work in Tauri |
| `apps/app/modules/sefirah-tor/` | Rust network and platform integration | Preserve Arti experiments, distinguish native tests from live discovery |
| `packages/crypto/` | Rust crypto/identity and compatibility tests | Preserve existing seed/phrase/vault wire formats; do not silently replace keys |
| `packages/protocol/` | typed protocol contracts | Define canonical schema/serialization and generated bindings where feasible |
| `packages/i18n/` | external workspace library | Preserve dictionaries; native review still needed |
| `packages/ui/` | obsolete after verified PassUI parity | Retain until existing visuals have equivalents; no local duplicate design system |
| `apps/edge/` | single `tero` Worker implementation | Preserve deployment and Durable Object classes; reduce ordinary server dependence gradually |
| `design/` and application images | `public/` for public assets, docs for editable sources | Keep only web-safe assets public; preserve source SVGs and screenshots |
| existing tests | beside relevant unit or integration tests | Preserve and expand, don't delete to make a new suite pass |

## Data and deployment preservation

The Tauri native identity derivation now uses the existing `tero/key-derivation/v1`
purpose-separated HKDF scheme. This is compatibility groundwork, **not an
account migration**. Expo's `tero.vault` and `tero.device` live in its existing
device secure-storage namespace. The new Tauri app identifier has a different
platform storage identity, so it must not assume it can read the old Keychain or
Keystore entries. A verified, consent-based transfer or recovery flow is needed
before Tauri can open native MLS sessions. Do not copy raw device secrets to JS,
delete the old installation, or replace a vault as part of setup.

The current Worker configuration already uses name `tero`, one custom domain,
and four Durable Object classes. Its registry, journals, notification state and
mailboxes may contain live test data. Never clear, drop, rename or rebind them as
a cleanup operation. No destructive account reset, secret rotation, uninstall or
local database removal without a tested migration and owner review.

Keep the Expo app and existing EAS/TestFlight distribution working until Tauri
passes both device and key/data compatibility gates. Do not switch production
routes or push experimental builds to the store merely to satisfy a stage label.

## Immediate build plan

1. Confirm latest compatible Tauri v2, TanStack Start, PassUI, Bun/Turbo and Rust
   versions and their build constraints.
2. Build a minimal TanStack Start static client and bind it to a single Tauri
   project. Keep its UI small but based on genuine PassUI exports.
3. Validate web build and Android/iOS package generation, especially the iOS
   Mac/Xcode signing requirement and native background transport limits.
4. Define Rust command contracts and a browser adapter; don't duplicate domain
   security rules in TypeScript.
5. Add automated format, type, unit, static build, Rust and platform gates as
   applicable. Keep current CI running until replacement checks exist.

Do not claim Stage 1 completed from a scaffold alone. Device testing is required.
