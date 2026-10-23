#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DEPLOY_COPY:-}" ]]; then
  source_path="$(readlink -f "${BASH_SOURCE[0]}")"
  root="$(cd "$(dirname "$source_path")/.." && pwd)"
  copy="$(mktemp)"
  cp "$source_path" "$copy"
  DEPLOY_ROOT="$root" DEPLOY_COPY="$copy" exec bash "$copy"
fi
trap 'rm -f "$DEPLOY_COPY"' EXIT

root="$DEPLOY_ROOT"
deploy_dir="$root/deploy"
env_file="$deploy_dir/.env"
image_repository='ghcr.io/clericlvl2/combat-planner-v2'
health_attempts=12
health_interval=5
kept_snapshots=3

tag="${SSH_ORIGINAL_COMMAND:-}"
if [[ ! "$tag" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "refused: expected a release tag such as v1.2.3, got '${tag}'" >&2
  exit 1
fi

exec 9>"$root/.deploy.lock"
if ! flock -n 9; then
  echo 'refused: another deploy is running' >&2
  exit 1
fi

cd "$deploy_dir"

env_value() {
  sed -n "s/^$1=//p" "$env_file" | tail -n 1 | sed -e "s/^'\(.*\)'$/\1/" -e 's/^"\(.*\)"$/\1/'
}

set_app_image() {
  local line="APP_IMAGE=$1" next
  next="$(mktemp "$deploy_dir/.env.XXXXXX")"
  if grep -q '^APP_IMAGE=' "$env_file"; then
    awk -v line="$line" '/^APP_IMAGE=/ { print line; next } { print }' "$env_file" >"$next"
  else
    cat "$env_file" >"$next"
    printf '%s\n' "$line" >>"$next"
  fi
  cat "$next" >"$env_file"
  rm -f "$next"
}

health_url() {
  local url
  url="$(env_value BETTER_AUTH_URL)"
  url="${url//'${DOMAIN}'/$(env_value DOMAIN)}"
  printf '%s/api/health' "${url%/}"
}

healthy() {
  local url attempt
  url="$(health_url)"
  for ((attempt = 1; attempt <= health_attempts; attempt++)); do
    if curl -fsS --max-time 5 -o /dev/null "$url"; then
      echo "healthy: $url"
      return 0
    fi
    sleep "$health_interval"
  done
  echo "unhealthy: $url did not answer 200 within $((health_attempts * health_interval)) s" >&2
  return 1
}

snapshot_script='
const fs = require("node:fs");
const path = require("node:path");
const Database = require("better-sqlite3");
const target = process.argv[1];
const keep = Number(process.argv[2]);
const dir = path.dirname(target);
fs.mkdirSync(dir, { recursive: true });
const db = new Database(process.env.DATABASE_PATH, { readonly: true, fileMustExist: true });
db.backup(target).then(
  () => {
    db.close();
    const old = fs
      .readdirSync(dir)
      .filter((name) => /^pre-.+\.db$/.test(name))
      .map((name) => ({ name, time: fs.statSync(path.join(dir, name)).mtimeMs }))
      .sort((a, b) => b.time - a.time)
      .slice(keep);
    for (const { name } of old) fs.unlinkSync(path.join(dir, name));
  },
  (error) => {
    console.error(error.message);
    process.exit(1);
  },
);
'

started_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
previous_commit="$(git -C "$root" rev-parse HEAD)"
previous_image="$(env_value APP_IMAGE)"
new_image="$image_repository:${tag#v}"
snapshot="/data/backups/pre-$tag-$(date -u +%Y%m%dT%H%M%SZ).db"

echo "deploying $tag ($new_image) over $previous_commit ($previous_image)"

git -C "$root" fetch --tags origin
if ! git -C "$root" cat-file -e "refs/tags/$tag^{commit}:deploy/deploy.sh" 2>/dev/null; then
  echo "refused: $tag has no deploy/deploy.sh, so the next deploy could not run; deploy it by hand (deploy/README.md, Manual deploy)" >&2
  exit 1
fi
git -C "$root" checkout --detach "refs/tags/$tag"

roll_forward() {
  APP_IMAGE="$new_image" docker compose pull app || return 1
  docker compose exec -T app node -e "$snapshot_script" "$snapshot" "$kept_snapshots" || return 1
  echo "snapshot: $snapshot in the data volume"
  set_app_image "$new_image" || return 1
  docker compose up -d --force-recreate --wait || return 1
  healthy || return 1
}

roll_back() {
  git -C "$root" checkout --detach "$previous_commit" || return 1
  set_app_image "$previous_image" || return 1
  docker compose up -d --force-recreate --wait || return 1
  healthy || return 1
}

if roll_forward; then
  docker image prune -f
  echo "deployed $tag at $(git -C "$root" rev-parse HEAD)"
  exit 0
fi

echo "deploy of $tag failed; rolling back to $previous_commit ($previous_image)" >&2
if roll_back; then
  echo "rolled back to $previous_commit ($previous_image)" >&2
  exit 1
fi

cat >&2 <<EOF
rollback to $previous_commit ($previous_image) is not healthy either; the database is untouched.
Snapshot taken before the deploy, if the log above shows one: $snapshot in the data volume.
Point-in-time restore to the moment before the deploy (deploy/README.md, Restore), as deploy in $deploy_dir:
  docker compose down
  docker volume rm combat-planner_data
  docker compose run --rm --no-deps --entrypoint true app
  docker compose run --rm --no-deps litestream restore -timestamp $started_at /data/combat-planner.db
  docker compose up -d
EOF
exit 2
