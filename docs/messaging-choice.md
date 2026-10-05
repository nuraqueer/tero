# Choosing the chat encryption (M3)

The one big build decision left (see [build-plan.md](build-plan.md)). Tero never
invents its own cryptography, so private chats use one of three proven libraries.

## What matters for Tero

- **Audited and proven** in real apps with many users.
- **Groups:** Circles, Spaces (their audio keys come from the group, see
  [architecture.md](architecture.md)) and chats with more than two people.
- **Healing after a break-in:** if a phone is seized and later returned, new
  messages become private again ("post-compromise security").
- **Runs on phones and in the browser.**
- **Licence** fits Tero's AGPL-3.0.

## The three options

| | libsignal | vodozemac | OpenMLS |
|---|---|---|---|
| What it is | Signal's own library | Matrix's Olm (1-to-1) and Megolm (groups) | The MLS standard (RFC 9420) |
| Proven in | Signal, WhatsApp's protocol | Element, Matrix | Webex, Wire, Discord's voice and video |
| Audit | Many, the gold standard | Least Authority, 2022 | Several reviews; younger |
| 1-to-1 chats | Best in class, post-quantum | Good | Good (a group of two) |
| Groups | Tied to Signal's own servers; not reusable as is | Megolm: no healing after a break-in | Built for groups, heals after a break-in |
| Spaces audio keys | Needs a second library | Needs a second library | Comes from the same group |
| Phones | No React Native binding; we write one | Native via Matrix's SDK; we write a binding | Native via UniFFI; working React Native examples exist |
| Browser | No official build | WebAssembly | WebAssembly |
| Licence | AGPL-3.0 | Apache-2.0 | MIT |

A fourth, pure TypeScript option (ts-mls) would run in Expo Go today, but a 2025
review found serious missing checks, so it isn't an option for Tero.

## Decision (D39): OpenMLS for every chat

The founder asked for the best option, nothing shaky from third parties and nothing
too large. So: the official `openmls` crate only, with our own thin binding made with
UniFFI (Mozilla's tool), and no third-party chat wrappers. One library instead of two
also keeps the app smaller. Building it waits until other work is done (2026-10-06).

- **One library for everything:** 1-to-1 chats (a group of two), group chats,
  Circles and the audio keys of Spaces. libsignal or vodozemac would need MLS as
  well for Spaces, so two libraries to wrap, test and audit.
- **Heals after a seized phone,** in groups too. Megolm doesn't.
- **An open standard,** with several independent implementations.
- **Fits the relay:** MLS needs a server that puts group changes in order, which
  is exactly what our Durable Objects do.

## The cost, whichever we pick

- All three are written in Rust. On phones we add a native module
  (uniffi-bindgen-react-native). **Chats then can't run in Expo Go.** Testers
  install a Tero test build from EAS instead (Android: a download link; iPhone:
  TestFlight, which needs the Apple Developer account).
- In the browser the same library runs as WebAssembly.
- The M7 audit must cover our binding and how we use the library.
