#!/usr/bin/env bash
#
# Compose this engine (a git submodule of a child site) with the child's
# content and build it.
#
# Invoked FROM THE CHILD SITE:   bash engine/scripts/build.sh [--serve]
#
# Engine-owned files are (re)extracted at the site root on every run:
#   quartz/, plugins/, quartz.ts, package*.json, tsconfig.json, ...
# Child-owned (never overwritten by the engine):
#   content/             markdown
#   quartz.config.yaml   site config (baseUrl, fonts, colors, plugin toggles)
#   static/              branding → overlaid onto quartz/static/
#   styles/custom.scss   optional, APPENDED after the engine's house styles
#   site-plugins/        optional extra plugins → overlaid onto plugins/
#   .node-version        build node version
#
# Output: ./public at the site root (what gets deployed).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENGINE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SITE_ROOT="$(cd "$ENGINE_ROOT/.." && pwd)"

# --- guards: must run as the engine submodule of a child site
if [ -z "$(git -C "$ENGINE_ROOT" rev-parse --show-superproject-working-tree 2>/dev/null)" ]; then
  echo "error: this script composes a child site and must run through its engine submodule:" >&2
  echo "  bash engine/scripts/build.sh" >&2
  echo "to develop the engine itself, use: npx quartz build --serve" >&2
  exit 1
fi
if [ ! -f "$SITE_ROOT/quartz.config.yaml" ]; then
  echo "error: no quartz.config.yaml in $SITE_ROOT — not a child site" >&2
  exit 1
fi

cd "$SITE_ROOT"

# --- 1) nuke engine-owned dirs (prevents stale-file drift between bumps)
rm -rf quartz plugins

# --- 2) extract engine files; every child-owned path is excluded
#        (./scripts stays excluded on purpose: scripts run from the submodule,
#         they are never copied into the site)
tar -C "$ENGINE_ROOT" -cf - \
  --exclude='./content' \
  --exclude='./content/*' \
  --exclude='./quartz.config.yaml' \
  --exclude='./README.md' \
  --exclude='./LICENSE.txt' \
  --exclude='./CODE_OF_CONDUCT.md' \
  --exclude='./docs' \
  --exclude='./docs/*' \
  --exclude='./.github' \
  --exclude='./.github/*' \
  --exclude='./.git' \
  --exclude='./.git/*' \
  --exclude='./.gitmodules' \
  --exclude='./.gitignore' \
  --exclude='./.gitattributes' \
  --exclude='./.node-version' \
  --exclude='./static' \
  --exclude='./static/*' \
  --exclude='./styles' \
  --exclude='./styles/*' \
  --exclude='./site-plugins' \
  --exclude='./site-plugins/*' \
  --exclude='./scripts' \
  --exclude='./scripts/*' \
  --exclude='./node_modules' \
  --exclude='./node_modules/*' \
  --exclude='./public' \
  --exclude='./public/*' \
  --exclude='./.quartz' \
  --exclude='./.quartz/*' \
  --exclude='./.quartz-cache' \
  --exclude='./.quartz-cache/*' \
  . | tar -C "$SITE_ROOT" -xf -

# --- 3) child overlays
if [ -d static ]; then
  cp -a static/. quartz/static/
fi
if [ -d site-plugins ]; then
  cp -a site-plugins/. plugins/
fi
if [ -f styles/custom.scss ]; then
  printf '\n/* ===== child-site styles (appended by engine/scripts/build.sh) ===== */\n' >> quartz/styles/custom.scss
  cat styles/custom.scss >> quartz/styles/custom.scss
fi

# --- 4) install (skipped when the lockfile hash matches the last install)
STAMP=".engine-deps-stamp"
LOCK_HASH=$(sha256sum package-lock.json | cut -d' ' -f1)
if [ -f "$STAMP" ] && [ "$(cat "$STAMP")" = "$LOCK_HASH" ] && [ -d node_modules ]; then
  echo "› deps up to date, skipping npm ci"
else
  npm ci
  echo "$LOCK_HASH" > "$STAMP"
fi
npx quartz plugin install

# --- 5) build
if [ "${1:-}" = "--serve" ]; then
  exec npx quartz build --serve
else
  npx quartz build
fi
