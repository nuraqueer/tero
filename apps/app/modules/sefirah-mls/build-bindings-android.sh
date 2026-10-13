#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
bash build-android.sh
# Output is generated and ignored; remove stale namespaces after config changes.
rm -rf bindings/kotlin
cargo run --manifest-path native/Cargo.toml --locked --features bindgen --bin sefirah-mls-bindgen -- \
  generate --library native/target/aarch64-linux-android/debug/libsefirah_mls.so \
  --language kotlin --out-dir bindings/kotlin --config native/uniffi.toml --no-format
mkdir -p android/src/main/jniLibs/arm64-v8a
cp native/target/aarch64-linux-android/debug/libsefirah_mls.so android/src/main/jniLibs/arm64-v8a/
