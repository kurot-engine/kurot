#!/usr/bin/env bash
set -euo pipefail

# Exercise the published bin and generated scripts without a TypeScript preloader.
repo=$(cd "$(dirname "$0")/../.." && pwd)
temp=$(mktemp -d)
trap 'rm -rf "$temp"' EXIT
mkdir "$temp/runner"
printf '{"private":true}\n' > "$temp/runner/package.json"
(cd "$repo/packages/cli" && npm pack --silent --ignore-scripts --pack-destination "$temp")
archives=("$temp"/*.tgz)
pnpm --dir "$temp/runner" add --save-dev --strict-peer-dependencies "${archives[0]}"
cd "$temp"

for template in game empty; do
  "$temp/runner/node_modules/.bin/kurot" create "$template" --template "$template"
  (
    cd "$template"
    # Use the local archive for the CLI version that starts the scaffold's range. The
    # other dependencies install from the public registry just as they do for users.
    node --input-type=module - "${archives[0]}" "$repo/packages/cli/package.json" <<'JS'
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
const [archive, cli] = process.argv.slice(2);
const manifest = JSON.parse(readFileSync('package.json', 'utf8'));
assert.equal(manifest.devDependencies['@kurot/cli'], '^' + JSON.parse(readFileSync(cli, 'utf8')).version);
manifest.devDependencies['@kurot/cli'] = 'file:' + archive;
writeFileSync('package.json', JSON.stringify(manifest, null, 2));
JS
    pnpm install --strict-peer-dependencies
    pnpm build
    test -s bin-debug/index.html
    pnpm release
    test -s bin-release/web/*/index.html
  )
done
