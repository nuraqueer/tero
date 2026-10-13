#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if [[ "$(uname -s)" != Darwin ]]; then
  echo 'The iOS MLS build requires macOS and Xcode.' >&2
  exit 1
fi
export PATH="${HOME}/.cargo/bin:${PATH}"
command -v cargo >/dev/null || { echo 'Install Rust with rustup before building MLS.' >&2; exit 1; }
export IPHONEOS_DEPLOYMENT_TARGET=16.4
rustup target add aarch64-apple-ios
mkdir -p ios/Generated
# Host library metadata and the device archive come from the same locked source.
cargo build --manifest-path native/Cargo.toml --locked --lib
cargo run --manifest-path native/Cargo.toml --locked --features bindgen --bin sefirah-mls-bindgen -- \
  generate --library native/target/debug/libsefirah_mls.dylib \
  --language swift --out-dir ios/Generated --config native/uniffi.toml --no-format
# Supply a conventional Clang module map, independent of bindgen formatting.
cat > ios/Generated/module.modulemap <<'MAP'
module SefirahMlsFFI {
  header "SefirahMlsFFI.h"
  export *
}
MAP
cargo build --manifest-path native/Cargo.toml --locked --release --lib --target aarch64-apple-ios
cp native/target/aarch64-apple-ios/release/libsefirah_mls.a ios/Generated/
