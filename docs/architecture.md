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
  background, it locks. The passcode unlocks the encrypted vault and the
  keys.
- **Decoy passcode, entered on the same lock screen.** It opens only the
  most basic, harmless information. Nothing on the screen shows that a
  decoy was used, and nobody can tell a hidden vault exists.
- **Duress alert.** Entering the decoy passcode also silently sends a
  panic alert (see below).
- **Panic wipe** and no notification previews.

### Duress alert

When the decoy passcode is entered:

1. A silent alert goes to the person who brought them in (see the table
   below) and to the council for their country: "this person has been
   forced to open Tero".
2. Nothing on the device shows the alert was sent. It leaves no trace in
   sent messages.
3. The account's sensitive access is frozen on the server, and other
   linked devices are signed out.
4. People who chat with the person are warned that their conversations
   may be exposed, so they can protect themselves.

### Recovering after a duress alert or false alarm

The person reaches out to whoever brought them into Tero, who sends a
**one-time recovery passcode**:

| Brought in by | Who sends the recovery passcode |
|---|---|
| A member (Tero card) | The member who invited them |
| A moderator | The moderators |
| The council | The council |
| The Fool | The Fool |

Safety rules, because an attacker may still have the person or the phone:

- The sender confirms it's really them and that they're safe, outside the
  app (in person, or with a check agreed beforehand).
- The recovery passcode only works after a **waiting period** (for example
  24 hours), and the alert recipients can cancel it during that time.
- If the person who brought them in is gone or unreachable, the country's
  council handles it.

## Ephemeral chats

- Private chats **clear automatically** by default.
- A chat is kept only if **both people agree**, and either can withdraw.
- **Screenshot alerts** like Snapchat: the other person is told when a
  screenshot is taken. This warns but can't stop it; a second phone camera
  always works.
- Platform limits: iOS can detect screenshots but not block them. Android
  14 and later can detect them, and Android can block them on chosen screens.

Honest limit: if a phone has spyware or someone is forced to unlock it,
most protections stop working. We reduce risk; we don't promise zero.

## Voice: Spaces and calls

| Use | Who can talk | Who listens |
|---|---|---|
| **Spaces** for communities, groups, skills, learning, Discord-style hangouts | Up to **6 speakers** (host included) | Everyone else in the room |
| **Voice with a professional** (consultations, enquiries) | The two people | Nobody else |

- **End-to-end encrypted.** Audio is encrypted on the speaker's phone
  (SFrame, with group keys from MLS) before it reaches Cloudflare
  Realtime, which forwards it without being able to listen. Keys change
  whenever someone joins or leaves.
- **Voice disguise.** Speakers can change their voice. This happens on the
  phone, before encryption, so the real voice never leaves the device.
- **Not recorded** by default.
- Honest limits: everyone in the room can hear, so encryption protects
  against the server, not against a listener in the room. Voice changers
  hide a voice from people, but they aren't perfect against forensic
  analysis.

## Identity: your keys are your account

**No PassID. No usernames, emails, phone numbers or passwords.** Like a
crypto wallet, each person's account *is* a set of keys they hold.

### How it works

1. **On first launch**, the phone creates a secret **seed** (shown once as
   a recovery phrase of 12 words).
2. From that one seed, the app derives **separate keys** that can't be
   linked to each other in public:

   | Key | Used for |
   |---|---|
   | Identity key | Your Tero address (what others see and verify) |
   | Messaging keys | End-to-end encryption |
   | Wallet keys | Celo (USDT and USDC), with a new address per fundraiser |
   | Per-app keys | Signing in to other apps, a different key for each |

3. **Signing in** means proving you hold the identity key: Tero sends a
   challenge, and the phone signs it. Nothing secret is ever sent.
4. **Keys are stored in the phone's secure hardware** (Secure Enclave on
   iOS, Keystore on Android), locked behind the app passcode.
5. **More devices** are added by scanning a QR code from a device you
   already have, like Signal or WhatsApp.

### Why the keys are kept separate

If your Tero address were also your wallet address, anyone could look up
every donation you ever made on the public blockchain and link it to your
Tero identity. The same applies to using one key in many apps: it would
let those apps match you up. Separate keys from one seed give you one
backup, without one public trail.

### "Use it anywhere else"

The identity follows a published standard (a decentralised identifier such
as `did:key`), so other apps, including future Pherus apps, can let people
sign in with it. Each app gets its own key by default. A person can choose
to prove two keys are theirs when they want to.

### Recovery

- **Recovery phrase**: the 12 words restore everything.
- **Social recovery**: the seed is also split among people you trust (for
  example any 3 of 5), so losing both the phone and the phrase isn't the
  end.
- **Duress recovery**: see above.

### What we give up without PassID

| Lost | Replacement |
|---|---|
| Age check (over 18 / 21) | The inviter confirms the person is of legal age for their country when approving the Tero card, and the person declares it. Inviters are accountable through trust. |
| A central account to disable | The council can ban an identity key on Tero's servers. The key still exists, but Tero won't serve it. |

PassID can still be added later as an optional extra, but nothing depends on it.

## Languages

English, Swahili, Chinese (zh) and French from day one. No text written
directly into code; everything goes through translation files.
