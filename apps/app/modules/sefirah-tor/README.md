# Sefirah native Tor experiment

The Android arm64 module and new iOS module embed the Tor Project's Arti 0.47.0 library. The Rust core uses onion services for online retrieval of immutable encrypted objects. It has no direct peer IP connection, Cloudflare route, public peer directory, or remote replication upload.

Ordinary builds keep the module disabled and omit its native library. `SEFIRAH_NATIVE_BUILD=1` enables the Rust build and a separate Android application ID. The JS development screen also requires `EXPO_PUBLIC_SEFIRAH_EXPERIMENTAL=enabled`. Neither flag is an authorization mechanism. Expo Go cannot load the native library. The iOS native archive compiled in TestFlight build 12. Device route and new chat behavior checks remain deferred at the owner's request.

## Local Android build

Use the installed Rust stable toolchain with the `aarch64-linux-android` target, Android SDK and NDK, Java, and the repository's Bun installation. The build does not install toolchains. Set `ANDROID_HOME` and optionally `ANDROID_NDK_HOME`; ensure Cargo and Bun are on PATH.

From `apps/app`, generate the Android application with:

```sh
SEFIRAH_NATIVE_BUILD=1 EXPO_PUBLIC_SEFIRAH_EXPERIMENTAL=enabled bunx expo prebuild --platform android --no-install
```

From its generated `android` directory:

```sh
SEFIRAH_NATIVE_BUILD=1 EXPO_PUBLIC_SEFIRAH_EXPERIMENTAL=enabled ./gradlew :app:assembleDebug -PreactNativeArchitectures=arm64-v8a
```

The debug app needs Metro with the same environment flags. Install only on an explicitly selected device. The separate ID is `org.pherus.tero.sefirahdev`; no uninstall of the ordinary app or Expo Go is required. Generated application projects and native binaries are ignored by Git. Do not edit the generated application project to change module behavior.

## Live core harness

The build also produces `native/target/aarch64-linux-android/release/sefirah-node`. From the repository root:

```sh
ANDROID_HOME=/path/to/android-sdk SEFIRAH_TOR_BINARY=/path/to/tor bun scripts/sefirah-android-smoke.ts DEVICE_SERIAL
```

The harness uploads the executable to a temporary private shell directory on the explicitly selected device and starts a separate desktop Tor peer. It exchanges synthetic signed encrypted objects in both directions without Cloudflare. Temporary device and desktop state is removed afterwards. This checks the same Rust core used by JNI, but does not prove Expo/JNI or screen integration. It does not use real member keys or account data.

## Remaining boundaries

Own offered objects are memory only, available while the native session runs. Offers do not return a durable receipt. The device directory stores signed contact capabilities encrypted and requires a separately trusted expected DID; this does not establish independent membership. Contact import is manual. Remote replication, automatic discovery, weak network synchronization, bridges, Tor descriptor client authorization, native background execution, and audio remain separate work.

## iOS carrier binding

`build-ios.sh` generates Swift bindings with UniFFI 0.32.2 and builds a device
arm64 static archive from the locked Rust source. Generated files live under
ignored `ios/Generated`, inside the CocoaPods specification's source root. The
EAS native preinstall hook builds both MLS and this carrier before CocoaPods.
The Swift module uses the same sanitized JSON commands as Android JNI.
Bootstrap, offer and retrieval run on a concurrent utility queue; short stop and
cancel calls bypass that queue. Rust cancellation markers reject queued starts
after stop, and module destruction stops every retained handle. iOS chooses
Application Support with complete file protection and backup exclusion; no path,
account key or content key is supplied by JavaScript to the carrier.

Three host tests cover malformed/oversized input without path disclosure,
rejection of clearnet targets and stop before a queued bootstrap. These do not
exercise Tor or iOS. Apple autolinking finds the module and host Swift generation
succeeds. Builds 10 and 11 exposed Apple binding incompatibilities in
libc 0.2.190. The iOS dependency graph now pins libc 0.2.189 and enables sysinfo's
Apple App Store feature. Upstream randomness code remains intact. The complete
signed iOS archive succeeded in build 12. No new runtime check was performed.

The `forget` command removes a volatile offered object when its authoritative
native retry record is consumed or expires. Chat uses signed recipient sealed
descriptors through a separate accepted pair mailbox, rather than the manual
contact import diagnostic or the original 24 hour object API. See the latest
checkpoint in `docs/continuation.md` for exact delivery and retention boundaries.


The development screen's **Check native private route** starts a temporary node
with a synthetic identity, offers an encrypted object, retrieves it through its
own onion route, verifies it and closes the node. Cancellation closes the
temporary session. It uses no account content or signing keys. A passing device
result proves native self retrieval through Tor, not two-device chat delivery.
If the regular diagnostic node is already running, lock and unlock before this
check because the core permits only one active Tor session per app.

See [the native specification](../../../../docs/specs/_root/0001-sefirah/0005-native-tor.md).
