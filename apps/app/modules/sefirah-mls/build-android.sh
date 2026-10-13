#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
sefirah_sdk="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
if [[ -z "$sefirah_sdk" ]]; then echo 'Android SDK path is required.' >&2; exit 1; fi
sefirah_ndk="${ANDROID_NDK_HOME:-}"
if [[ -z "$sefirah_ndk" ]]; then
  sefirah_ndk="$(find "$sefirah_sdk/ndk" -mindepth 1 -maxdepth 1 -type d | sort -V | tail -n 1)"
fi
sefirah_host='linux-x86_64'
if [[ "$(uname -s)" == 'Darwin' ]]; then sefirah_host='darwin-x86_64'; fi
sefirah_bin="$sefirah_ndk/toolchains/llvm/prebuilt/$sefirah_host/bin"
if [[ ! -x "$sefirah_bin/aarch64-linux-android24-clang" ]]; then echo 'Android NDK toolchain missing.' >&2; exit 1; fi
export CARGO_TARGET_AARCH64_LINUX_ANDROID_LINKER="$sefirah_bin/aarch64-linux-android24-clang"
export CC_aarch64_linux_android="$sefirah_bin/aarch64-linux-android24-clang"
export AR_aarch64_linux_android="$sefirah_bin/llvm-ar"
# Builds the library only. Does not install or change the phone application.
cargo build --manifest-path native/Cargo.toml --target aarch64-linux-android --locked "$@"
