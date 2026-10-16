#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

playwright_version="$(node -p "require('./node_modules/playwright/package.json').version")"
tag="v${playwright_version}-noble"
image="mcr.microsoft.com/playwright:${tag}"
screenshots_dir="packages/ui/__screenshots__"

docker run --rm \
  --label combat-planner=agent \
  --ipc=host \
  --user "$(id -u):$(id -g)" \
  --env HOME=/tmp \
  --env CI=1 \
  --volume "$PWD:/work" \
  --workdir /work \
  "$image" \
  node_modules/.bin/vp test --project visual --update

mkdir -p "$screenshots_dir"
rm -f "$screenshots_dir"/.docker-*
touch "$screenshots_dir/.docker-${tag}"
echo "baselines written in ${image}"
