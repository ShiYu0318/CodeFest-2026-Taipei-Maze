#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
set -euo pipefail

repo_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
townpass_dir="${TOWNPASS_DIR:-$(dirname -- "$repo_dir")/TownPass}"
command_name="${1:-help}"
if [[ $# -gt 0 ]]; then shift; fi

if [[ "$command_name" == "serve" ]]; then
  exec node "$repo_dir/tools/townpass-smoke-server.mjs"
fi

if [[ "$command_name" == "help" ]]; then
  cat <<'USAGE'
Usage: bash scripts/townpass-env.sh COMMAND [arguments]
  paths       Print the separate host checkout and diagnostic URL
  doctor      Inspect the pinned Flutter toolchain
  deps        Resolve host dependencies and generate assets/JSON code
  analyze     Run the upstream Flutter analyzer
  test        Run upstream tests (may reveal inherited test failures)
  build-ios   Build a debug iOS Simulator application
  run-ios ID  Run the host on the specified simulator/device ID
  serve       Serve the bridge diagnostic page on loopback port 8765
Set TOWNPASS_DIR if the separate TownPass checkout is elsewhere.
USAGE
  exit 0
fi

if [[ ! -f "$townpass_dir/pubspec.yaml" || ! -f "$townpass_dir/.fvmrc" ]]; then
  printf 'TownPass checkout not found: %s\n' "$townpass_dir" >&2
  exit 1
fi
if ! command -v fvm >/dev/null 2>&1; then
  printf 'FVM is not on PATH. See docs/測試環境.md.\n' >&2
  exit 1
fi

# Use the existing JDK 21 for this process only; do not change global Java.
if [[ -n "${TOWNPASS_JAVA_HOME:-}" ]]; then
  export JAVA_HOME="$TOWNPASS_JAVA_HOME"
elif [[ -d /opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home ]]; then
  export JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home
fi
export PUB_HOSTED_URL=https://pub.dev
export FLUTTER_STORAGE_BASE_URL=https://storage.googleapis.com

cd -- "$townpass_dir"
case "$command_name" in
  paths)
    printf 'TownPass: %s\nWeb smoke: http://127.0.0.1:8765/\n' "$townpass_dir"
    git rev-parse HEAD
    ;;
  doctor) exec fvm flutter doctor -v ;;
  deps)
    fvm flutter pub get
    exec fvm dart run build_runner build --delete-conflicting-outputs
    ;;
  analyze) exec fvm flutter analyze ;;
  test) exec fvm flutter test ;;
  build-ios) exec fvm flutter build ios --simulator --debug ;;
  run-ios)
    if [[ $# -lt 1 ]]; then
      printf 'Specify an ID from: xcrun simctl list devices available\n' >&2
      exit 1
    fi
    exec fvm flutter run --device-id "$1"
    ;;
  *) printf 'Unknown command: %s\n' "$command_name" >&2; exit 2 ;;
esac
