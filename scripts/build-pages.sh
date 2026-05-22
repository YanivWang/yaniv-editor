#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export VP_BASE="/yaniv-editor/"
export PAGES_BUILD=1

pnpm docs:build
pnpm build:demo

rm -rf _site
mkdir -p _site/examples
cp -r docs/.vitepress/dist/* _site/
cp -r dist-demo/* _site/examples/
touch _site/.nojekyll

echo "Pages artifact ready at _site/"
