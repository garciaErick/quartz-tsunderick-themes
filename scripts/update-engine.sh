#!/usr/bin/env bash
#
# Bump the child site's engine submodule to the latest engine main and commit.
# Invoked FROM THE CHILD SITE:   bash engine/scripts/update-engine.sh
#
# Review the bump afterwards with:  git show HEAD --submodule=log
# Roll it back with:                git revert HEAD
#
# Note: this moves the engine checkout to origin/main — don't run it while
# testing WIP engine changes in engine/ (build.sh --serve is fine with those).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENGINE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SITE_ROOT="$(cd "$ENGINE_ROOT/.." && pwd)"

if [ -z "$(git -C "$ENGINE_ROOT" rev-parse --show-superproject-working-tree 2>/dev/null)" ]; then
  echo "error: this script must run from a child site via its engine submodule:" >&2
  echo "  bash engine/scripts/update-engine.sh" >&2
  exit 1
fi

git -C "$ENGINE_ROOT" fetch origin main --quiet
git -C "$ENGINE_ROOT" checkout --quiet origin/main
git -C "$SITE_ROOT" add engine

if git -C "$SITE_ROOT" diff --cached --quiet -- engine; then
  echo "engine already at latest: $(git -C "$ENGINE_ROOT" log --oneline -1)"
  exit 0
fi

new_sha=$(git -C "$ENGINE_ROOT" rev-parse --short HEAD)
echo "bumping engine -> $new_sha"
echo
echo "incoming commits:"
git -C "$SITE_ROOT" diff --cached --submodule=log -- engine
echo

git -C "$SITE_ROOT" commit -q -m "bump engine to $new_sha"
echo "committed. push to deploy:  git push"
