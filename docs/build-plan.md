# Build plan: phase 1

How we go from designs to a first working Tero. Phase 1 is the foundation:
identity, Tero cards, private chats, Circles, the public site and the core
safety features. Spaces (voice), the wallet, partners and journeys come in
later phases (see [vision.md](vision.md#phases)).

## Repository layout

One repository, several packages.

```
apps/
  app/        Expo app: iOS, Android and the web (tero.pherus.org)
  edge/       Cloudflare Worker: API, encrypted relay, serves the web build
packages/
  crypto/     Seed, key derivation, signing, encryption (wraps audited libraries)
  protocol/   Message and API shapes shared by app and edge
  ui/         Design tokens and components (colours, fonts, cards, glass)
  i18n/       English, Kiswahili, 中文, Français
design/       Mockups and screenshot scripts
docs/         These documents
```

## Technology

| Part | Choice | Why |
|---|---|---|
| App | **Expo** with expo-router | One codebase for iOS, Android and web |
| Language | TypeScript everywhere | Shared types between app and server |
| Package manager | **Bun** (workspaces) | Fast installs and scripts across all packages |
| Server | **Cloudflare Workers** | Runs at the edge, on the one domain |
| Mailboxes and live delivery | **Durable Objects** | One object per inbox or Circle, holding only ciphertext |
| Public data | **D1** | Guides, country packs, trust scores, roles |
| Encrypted files | **R2** | Photos and bundles, already encrypted on the phone |
| Keys on the phone | Secure Enclave / Android Keystore through expo-secure-store | Keys never leave secure hardware unprotected |
| Local data | Encrypted SQLite on the phone | The vault the decoy passcode protects |
| Builds and updates | EAS Build and EAS Update | App store builds, and small fixes without a full download |

### Cryptography: we don't invent our own

All cryptography uses well-known, audited libraries.

- **Seed, recovery phrase and signing:** the `@noble` and `@scure` libraries
  (BIP-39 12-word phrases, Ed25519 signatures, key derivation).
- **End-to-end messaging:** decided: OpenMLS (D39, [messaging-choice.md](messaging-choice.md)).
  The three options compared:

  | Option | Notes |
  |---|---|
  | libsignal (Signal's own library) | The gold standard; needs a native module for Expo |
  | vodozemac (Matrix's Olm and Megolm) | Proven in Element; good group support |
  | OpenMLS (the MLS standard) | Built for large groups; younger on mobile |

## Milestones

Each milestone ends with something working that we can try.

| # | Milestone | Done when |
|---|---|---|
| M0 | **Foundations** | Repository, checks that run on every change (lint, types, tests), design tokens, four languages wired in, a Worker answering at a preview address |
| M1 | **Identity and lock** | A phone creates its seed and 12 words, signs in with its key, locks on every close, and the decoy passcode opens the basic view |
| M2 | **Tero cards** | A member makes a single-use card, a newcomer scans it, they confirm a code in person, the member approves, and the card is destroyed |
| M3 | **Private chats** | End-to-end encrypted chats through the relay, clearing by default, kept only if both agree, with screenshot alerts |
| M4 | **Circles and Gathering** | Circles as one conversation with topics, the six post types, reporting, and the moderation dashboard |
| M5 | **Public site** | tero.pherus.org with the open guides in four languages and the joining page |
| M6 | **Safety** | Duress alerts, card recovery with the 24-hour wait, social recovery, country packs with risk levels |
| M7 | **Hardening** | A review against the [threat model](threat-model.md) and an **independent security audit** before any real member joins |

## Testing with people

1. **Closed alpha:** the Pherus team only, in safe countries.
2. **Private beta:** invited members in safe countries, after the audit.
3. **High-risk countries last**, only once the duress, recovery and relay
   features have been tested and audited.

We never test unfinished safety features on people who could be harmed.

## What we need before M0

| Need | Who |
|---|---|
| Cloudflare account access, with `tero.pherus.org` pointing to it | Pherus |
| Expo account for the project | Pherus |
| Apple Developer account as an organisation (Pherus or the subsidiary) | Pherus |
| Google Play developer account as an organisation | Pherus |
| Final logo and tarot card design | Design (open) |

The logo and card design don't block M0 to M3; the app uses the current
mark until they're chosen.
