#!/usr/bin/env bash
# Install repo-local git hooks (Doctrine 8.26 v2 direct-push-to-main guard).
# Run once per clone. Idempotent.
set -eu
cd "$(git rev-parse --show-toplevel)"
git config core.hooksPath .githooks
chmod +x .githooks/pre-push
echo "OK: core.hooksPath=.githooks; pre-push armed."
