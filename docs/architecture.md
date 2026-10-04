# Architecture

## One domain, one codebase

- Everything lives at **`tero.pherus.org`**. No subdomains.
- **Expo** (React Native, expo-router) builds the web app, the iOS app and the Android app from one codebase.
- The admin (council) dashboard is part of the same app, behind sign-in and role checks.
- The web app runs on **Cloudflare Workers**. Phone apps ship through the App Store and Google Play.
- Fallbacks for takedowns: installable web app (PWA) and a directly downloadable Android APK.

## Core idea: encrypted relay

Sensitive data lives on people's devices. Cloudflare is a "dumb mailbox"
that stores and passes on sealed packages it cannot open.

| Where | What |
|---|---|
| **Device** | Keys, encryption and decryption, the real data, the encrypted vault |
| **Cloudflare** | Ciphertext only, plus the minimum needed to route it |

Why not torrents or P2P for people's data: peers see each other's IP
addresses, which could expose a user to an infiltrator, and phones are
rarely online as peers because iOS and Android stop background apps.

### Layers

| Layer | Purpose | Phase |
|---|---|---|
| End-to-end encryption (Signal protocol for 1-to-1, MLS for groups) | Cloudflare can't read messages | 1 |
| Sealed sender | Packages don't say who sent them | 1 |
| Encrypted Client Hello (ECH) | Network watchers see "Cloudflare", not `tero.pherus.org` | 1 |
| Signed offline bundles (public resources, country packs) | Survive takedowns and shutdowns, shareable phone to phone | 1 |
| Optional Tor route (with Snowflake bridges) | Hide Tero use in high-risk countries | 5 |
| Bluetooth / Wi-Fi mesh | Messaging during full internet shutdowns | Later research |

### Cloudflare pieces (proposed)

- **Workers**: the web app and API.
- **Durable Objects**: encrypted mailboxes and live delivery.
- **D1**: non-sensitive data (public resources, trust scores, roles).
- **R2**: encrypted media and signed bundles.

## On the device

- **Passcode every time.** Each time the app is closed or put in the
  background, it locks. The passcode unlocks the encrypted vault. This is
  separate from the passkey.
- **Decoy passcode, entered on the same lock screen.** It opens only the
  most basic, harmless information. Nothing on the screen shows that a
  decoy was used, and nobody can tell a hidden vault exists.
- **Duress alert.** Entering the decoy passcode also silently sends a
  panic alert (see below).
- **Panic wipe** and no notification previews.

### Duress alert

When the decoy passcode is entered:

1. A silent alert goes to the person's chosen emergency contacts and to
   the council for their country: "this person has been forced to open
   Tero".
2. Nothing on the device shows the alert was sent. It leaves no trace in
   sent messages.
3. The account's sensitive access is frozen on the server, and other
   signed-in devices are signed out, until the person checks in with
   their real passcode and a recovery step.
4. People who chat with the person are warned that their conversations
   may be exposed, so they can protect themselves.

Open details: who the emergency contacts are by default (the inviter?),
and how someone recovers after a false alarm.

## Ephemeral chats

- Private chats **clear automatically** by default.
- A chat is kept only if **both people agree**, and either can withdraw.
- **Screenshot alerts** like Snapchat: the other person is told when a
  screenshot is taken. This warns but can't stop it; a second phone camera
  always works.
- Platform limits: iOS can detect screenshots but not block them. Android
  14 and later can detect them, and Android can block them on chosen screens.
- **Social recovery**: the recovery key is split among people you trust
  (for example any 3 of 5), because passkey-only means a lost phone would
  otherwise lose the account.

Honest limit: if a phone has spyware or someone is forced to unlock it,
most protections stop working. We reduce risk; we don't promise zero.

## PassID

Tero signs people in with **PassID** (OAuth 2 / OpenID Connect, built on
Better Auth). Tero runs its own Better Auth on the Worker and uses PassID
as its sign-in provider (Better Auth's generic OAuth plugin). The phone
apps sign in to Tero's Better Auth through the Expo integration, not to
PassID directly.

**PassID handles sign-in only. Tero's encryption keys never touch it.**
Even if PassID were breached, old messages stay unreadable.

### PassID app registration

**Not registered yet.** This waits until PassID supports pairwise
identifiers. `tero.pherus.org` is still in development. The table is the plan.

| Field | Value | Why |
|---|---|---|
| Name | Tero | |
| Website | `https://tero.pherus.org` | |
| Logo | A square Tero logo on `tero.pherus.org` | |
| Icon | React | Expo is React (cosmetic only) |
| App type | **Web** | Better Auth on the Worker does the token exchange and can keep a secret. **Can't be changed later.** |
| Client auth | **Basic** | Secret in the Authorization header, stored as a Worker secret |
| Redirect URI | `https://tero.pherus.org/api/auth/oauth2/callback/passid` | Better Auth's generic OAuth callback, provider id `passid` |
| Sign-out redirect | `https://tero.pherus.org/signed-out` | Same single domain |
| Grant types | **Authorization code** only | Tero keeps its own sessions, so no refresh token is needed. Not client credentials. |
| Scopes | **`openid`**, **`age_over_18`**, **`age_over_21`** | Minimum data. Both age answers so each country's legal age can be applied. Not `profile`, not `email`, not `offline_access`. |
| Terms | `https://tero.pherus.org/terms` | |
| Privacy | `https://tero.pherus.org/privacy` | |
| Support | A Pherus support address for Tero | |
| License | AGPL-3.0 (add it to pherus.org/licenses) | |
| Trusted client | Yes | Pherus runs Tero |
| RP-initiated logout | **On (back-channel)** | Revoking a PassID account ends Tero sessions. It doesn't wipe device data. |

### Asked of PassID

- **Pairwise subject identifiers**: PassID should give Tero a different
  user ID than it gives other Pherus apps, so databases can't be joined to
  find the same person. The registration form doesn't show this option yet.
- PKCE on the authorization code flow, even for this confidential client.
- **More age checks**: some countries' legal age is 19 or 20. PassID
  only answers 13, 16, 18 and 21. Either PassID adds a general
  "age over N" answer, or Tero requires 21 in those countries.

## Languages

English, Swahili, Chinese (zh) and French from day one. No text written
directly into code; everything goes through translation files.
