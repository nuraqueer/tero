# Running Tero development again

This guide describes the current Chromebook/Linux + USB Android + iPhone setup,
as of 13 October 2026. It is a development arrangement, not member onboarding.
Do not reset either account or recreate the registry to reconnect.

## What needs to stay running

| Component                        | Purpose                                                       | Current requirement                                      |
| -------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------- |
| Metro, port 8084                 | Supplies JavaScript to Tero Sefirah Dev on Android            | Keep its terminal open while testing Android             |
| Local Worker, port 8794          | Shared test membership, invitations, profiles and connections | Keep its terminal open for both phones                   |
| USB / ADB reverse                | Connects Android ports back to the Linux servers              | Reconnect after unplugging or restarting                 |
| Published iPhone Expo Go preview | Downloads its JavaScript from Expo                            | Does not need Metro, but still needs the shared test API |

A standalone app bundles its JavaScript and does not need Metro. The finished
Sefirah app should start networking internally after unlock. That automatic
networking and standalone messaging are not complete yet. Cloudflare fallback
will run on Cloudflare, not on a member's laptop.

## 1. Connect Android

Plug in the TECNO with a data-capable USB cable, enable USB debugging and accept
the debugging prompt. Keep both phones on the same Wi-Fi, outside guest isolation.

Run this preparation in each new terminal used below:

```bash
cd /home/laniina/pherus/tero
export PATH="$HOME/.bun/bin:$HOME/.cargo/bin:$HOME/Android/Sdk/platform-tools:$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH"
```

Check the device:

```bash
adb devices -l
```

The current physical phone is `085452525P011328`; its status must be `device`.
If it says `unauthorized`, unlock it and accept USB debugging. If another phone
is used, replace that serial in subsequent commands. Do not target an emulator.

## 2. Start the shared test API — terminal one

Use the existing ignored test configuration, secret and persisted registry:

```bash
cd /home/laniina/pherus/tero/apps/edge
bunx wrangler dev \
  --config .wrangler/sefirah-device-network/wrangler.jsonc \
  --persist-to .wrangler/sefirah-device-network/state \
  --ip 0.0.0.0 \
  --port 8794
```

Keep this terminal open. In another prepared terminal:

```bash
curl -fsS http://127.0.0.1:8794/api/health
```

Expect `{"ok":true,"service":"tero-edge"}`. The ignored `.dev.vars` beside the
test config must remain in place. Do not print it, replace its auth secret, delete
the state directory or switch to an empty persistence directory. Those are not
reconnection steps. If these files are missing, recover the development setup
before creating accounts; starting a fresh registry loses the existing test roster.

## 3. Start Metro — terminal two

```bash
cd /home/laniina/pherus/tero/apps/app
SEFIRAH_NATIVE_BUILD=1 \
EXPO_PUBLIC_SEFIRAH_EXPERIMENTAL=enabled \
EXPO_PUBLIC_API_URL=http://127.0.0.1:8794 \
EXPO_OFFLINE=1 \
bunx expo start --dev-client --localhost --port 8084
```

Keep this terminal open. Check from another terminal:

```bash
curl -fsS http://127.0.0.1:8084/status
```

Expect `packager-status:running`. If a server already owns the port and this check
passes, reuse it rather than starting a second instance.

## 4. Restore USB forwarding — terminal three

```bash
adb -s 085452525P011328 reverse tcp:8081 tcp:8084
adb -s 085452525P011328 reverse tcp:8794 tcp:8794
adb -s 085452525P011328 reverse --list
```

Open **Tero Sefirah Dev** on Android. If its development launcher appears, use
`http://127.0.0.1:8081` as the server address. Unlock normally. The Android Fool
account stays on the device; no reinstall, account setup or device reset is needed.

## 5. Reconnect iPhone Expo Go

The current preview's API address is **http://192.168.1.4:8794**, which is the
Android phone's Wi-Fi address in the tested arrangement. The phone forwards this
port over USB to the Linux Worker. Check Android's current Wi-Fi IP in its network
settings; a router can assign a different address after reconnecting.

First open **http://192.168.1.4:8794/api/health** in iPhone Safari. When it returns
the health JSON, open the existing Tero preview in Expo Go, or scan the preview
QR again from the Expo dashboard:

[Current iPhone preview](https://expo.dev/accounts/pherus/projects/tero/updates/45d175ae-f087-4e89-9fa4-6830f8b2472b)

This preview includes request indicators, the Messages interface and the first
ten dark-and-gold tarot designs (Yoru → Tarot design study in testing builds).
Message sending remains unavailable. It does not include the custom
native Tor or MLS engine. Native iPhone networking requires a development build;
Expo Go remains useful for compatible interface and API tests.

If Android's Wi-Fi IP changed, the published preview still contains the old
address. Prefer reserving `192.168.1.4` for this phone in the router, or republish
the preview with the new `EXPO_PUBLIC_API_URL`. Changing Metro's environment does
not change an already published iPhone preview. The Chromebook's old `.5` address
was not the working route; do not substitute it by assumption.

## Troubleshooting

| Symptom                                 | Check                                                                                                |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Android cannot load the app             | Metro health, USB authorization, both ADB reverse entries, development launcher URL                  |
| App opens but profiles/invitations fail | Worker health, correct existing persistence directory, API URL                                       |
| iPhone Safari cannot reach API          | Android Wi-Fi IP, shared Wi-Fi, USB connection, reverse 8794, Worker running                         |
| Address already in use                  | Check that port's health before starting another server                                              |
| Metro edits do not appear               | Reload the Android development app; iPhone published previews need a new update                      |
| New native code is missing              | JavaScript reloads cannot add native code; rebuild the same development app and install as an update |

Binding the Worker to `0.0.0.0` means it listens on all Linux interfaces. Phones
still need a reachable route to it; `0.0.0.0` is not a phone destination address.
ChromeOS Linux port forwarding was unreliable in this session, so the verified
setup uses Android USB forwarding instead.

## Stopping and coming back

Use Ctrl+C in the Worker and Metro terminals. Accounts and Worker state remain
on disk. USB forwarding may disappear after unplugging or rebooting; repeat
steps 1–5 when returning. Linux sleep also stops access to its servers.

Keep development secrets and registry state private and backed up appropriately.
Do not run `adb uninstall`, clear application storage or use the test account
reset just to fix a connection: these can remove the local account vault.

## Current native encryption checks

The Android development update includes the MLS bridge and encrypted state storage. In Yoru,
open the Sefirah development screen and tap **Check native message encryption**.
Expect **PASS: encryption, saved handshake, reopened state, inbox and replay rejection.**
This uses synthetic accounts and disposable cache state on one device. It reopens
engines during the handshake and exchange, then cleans up its test files. It does
not send a network message or access your account keys.
The published iPhone preview cannot run this native check.

From the repository root:

```bash
cargo test --manifest-path apps/app/modules/sefirah-mls/native/Cargo.toml --locked
cargo clippy --manifest-path apps/app/modules/sefirah-mls/native/Cargo.toml --all-targets --locked -- -D warnings
```

These test the MLS foundation, not real chat delivery. See the
[engine notes](../apps/app/modules/sefirah-mls/README.md) for native build details.

## Rebuild Android only when native code changes

The Sefirah Android profile includes Firebase client configuration from
`apps/app/config/google-services.sefirah.json` for project
`tero-pherus-56e478f4`. `GOOGLE_SERVICES_JSON` can override that public client
file. The private FCM sender credential is stored in EAS for
`org.pherus.tero.sefirahdev`; do not download it into this workspace. Firebase
is used for generic push notifications, not chat content or account storage.
Changing this native configuration requires prebuild and an APK update; a Metro
reload alone cannot add Firebase to an already installed binary.

Ordinary UI edits need Metro reload, not a reinstall. Native module changes need
an updated development APK. On this computer the Android project already exists:

```bash
cd /home/laniina/pherus/tero/apps/app/android
export JAVA_HOME=/opt/android-studio-for-platform/jbr
export ANDROID_HOME="$HOME/Android/Sdk"
export PATH="$JAVA_HOME/bin:$HOME/.cargo/bin:$HOME/.bun/bin:$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH"
SEFIRAH_NATIVE_BUILD=1 ./gradlew :app:assembleDebug -PreactNativeArchitectures=arm64-v8a --max-workers=2
"$ANDROID_HOME/platform-tools/adb" -s 085452525P011328 install -r app/build/outputs/apk/debug/app-debug.apk
```

This builds the existing `org.pherus.tero.sefirahdev` application and installs
over it, preserving its storage. If Android rejects the signature, stop and
recover the original signing setup; do not uninstall to bypass the error.
The SDK, NDK and Rust Android target must already be installed. If `android/`
is missing in a fresh checkout, Expo native project generation is needed first;
these reconnect instructions assume this existing development machine.
