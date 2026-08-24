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

# --- 0) node version sanity: warn (don't fail) when the running major differs
#         from the child's .node-version pin — native deps (sharp, esbuild)
#         are validated per release line, and a mismatch produces confusing
#         install failures far from the cause
if [ -f .node-version ]; then
  PINNED_NODE="$(tr -d '[:space:]' < .node-version)"
  PINNED_MAJOR="${PINNED_NODE#v}"; PINNED_MAJOR="${PINNED_MAJOR%%.*}"
  RUNNING_MAJOR="$(node --version 2>/dev/null || true)"
  RUNNING_MAJOR="${RUNNING_MAJOR#v}"; RUNNING_MAJOR="${RUNNING_MAJOR%%.*}"
  if [ -n "$PINNED_MAJOR" ] && [ -n "$RUNNING_MAJOR" ] && [ "$PINNED_MAJOR" != "$RUNNING_MAJOR" ]; then
    echo "warning: running node v$RUNNING_MAJOR but .node-version pins $PINNED_NODE" >&2
    echo "  native deps (sharp, esbuild) may fail to install on an unpinned node" >&2
    echo "  suggested: mise exec node@$PINNED_NODE -- bash engine/scripts/build.sh" >&2
  fi
fi

# --- 1) nuke engine-owned dirs (prevents stale-file drift between bumps)
rm -rf quartz plugins

# --- 2) extract engine files; every child-owned path is excluded
#        (./scripts and ./templates stay excluded on purpose: they run/are
#         copied from the submodule directly, never extracted into the site)
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
  --exclude='./templates' \
  --exclude='./templates/*' \
  --exclude='./node_modules' \
  --exclude='./node_modules/*' \
  --exclude='./public' \
  --exclude='./public/*' \
  --exclude='./.quartz' \
  --exclude='./.quartz/*' \
  --exclude='./.quartz-cache' \
  --exclude='./.quartz-cache/*' \
  --exclude='./.site-subpath' \
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
# Always use sharp's prebuilt binaries: if the dev machine has a system libvips
# (e.g. Arch's libvips package, detected via /usr/lib/pkgconfig/vips-cpp.pc),
# sharp's install script rejects the prebuilt and insists on building from
# source with node-gyp — which fails on machines without a build toolchain.
export SHARP_IGNORE_GLOBAL_LIBVIPS=1
STAMP=".engine-deps-stamp"
LOCK_HASH=$(sha256sum package-lock.json | cut -d' ' -f1)
if [ -f "$STAMP" ] && [ "$(cat "$STAMP")" = "$LOCK_HASH" ] && [ -d node_modules ]; then
  echo "› deps up to date, skipping npm ci"
else
  npm ci
  echo "$LOCK_HASH" > "$STAMP"
fi
npx quartz plugin install

# --- 5) build (+ optional subpath restructure)
if [ "${1:-}" = "--serve" ]; then
  # dev server serves at root (Quartz renders empty basePath under --serve),
  # so the subpath restructure deliberately does NOT apply here
  exec npx quartz build --serve
fi

npx quartz build

# --- 6) subpath output: public/* → public/<subpath>/*
#      Opt in with a .site-subpath file (single segment, e.g. "docs") in the
#      child root, for sites served under a subpath (baseUrl: domain.com/docs).
#      The deployed worker then literally owns /docs* routes.
if [ -f .site-subpath ]; then
  SUBPATH="$(tr -d '[:space:]' < .site-subpath)"
  if [ -n "$SUBPATH" ]; then
    case "$SUBPATH" in
      *[!a-zA-Z0-9-_]*)
        echo "error: .site-subpath must be a single path segment (letters, digits, -, _), got '$SUBPATH'" >&2
        exit 1
        ;;
    esac
    echo "› restructuring public/ under subpath '/$SUBPATH'"
    shopt -s dotglob nullglob
    TMP="$(mktemp -d)"
    mv public/* "$TMP"/
    mkdir -p "public/$SUBPATH"
    mv "$TMP"/* "public/$SUBPATH"/
    rmdir "$TMP"
    shopt -u dotglob nullglob
  fi
fi

# --- 7) static assets: Quartz's Static emitter globs quartz/static with
#        gitignore-awareness, and child sites gitignore quartz/ (engine-
#        extracted), which hides those files from it. Copy the merged
#        (engine stock + child overlay) files into the output directly.
OUT_STATIC="public/static"
if [ -n "${SUBPATH:-}" ]; then
  OUT_STATIC="public/$SUBPATH/static"
  # mirror the 404 to the output root so Cloudflare's
  # not_found_handling: "404-page" finds it for subpath routes
  if [ -f "public/$SUBPATH/404.html" ]; then
    cp "public/$SUBPATH/404.html" public/404.html
  fi
fi
mkdir -p "$OUT_STATIC"
cp -a quartz/static/. "$OUT_STATIC"/
