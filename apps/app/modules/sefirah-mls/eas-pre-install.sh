#!/usr/bin/env bash
set -euo pipefail
if [[ "${EAS_BUILD_PLATFORM:-}" != ios || "${SEFIRAH_NATIVE_BUILD:-}" != 1 ]]; then
  exit 0
fi
export PATH="${HOME}/.cargo/bin:${PATH}"
if ! command -v rustup >/dev/null; then
  # EAS macOS workers are disposable. Install only the toolchain needed by this build.
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --profile minimal
fi
bash "$(dirname "$0")/build-ios.sh"
bash "$(dirname "$0")/../sefirah-tor/build-ios.sh"
