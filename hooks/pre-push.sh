#!/usr/bin/env bash
set -euo pipefail

echo "Grammar check before push..."
if ! nix build .#checks.x86_64-linux.grammar --no-link 2>&1; then
  echo ""
  echo "Grammar check failed. Fix the errors above, then push again."
  exit 1
fi
echo "Grammar check passed."
