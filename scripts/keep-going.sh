#!/usr/bin/env bash
set -u
cd "$(dirname "$0")/.."
progress=.claude/artifacts/2026-10-16-handoff-build-progress.md
run=.claude/run
mkdir -p "$run"
limit=50

[ -f "$run/STOP" ] && exit 0
[ -f "$progress" ] || exit 0
grep -Eq '^\| [^|]+ \| (todo|running|reported|rebased|gate|rework|restarted|merged)' "$progress" || exit 0

head=$(git rev-parse HEAD)
last=$(cat "$run/stop-head" 2>/dev/null || true)
count=$(cat "$run/stop-count" 2>/dev/null || echo 0)
if [ "$head" = "$last" ]; then count=$((count + 1)); else count=0; fi
echo "$head" > "$run/stop-head"
echo "$count" > "$run/stop-count"
if [ "$count" -ge "$limit" ]; then
  echo "keep-going: $limit stops without a new commit on master; create $run/STOP or fix the blocker" >&2
  exit 0
fi

echo "Build not finished: the progress file has batches not yet guarded. Run /doit and continue with the next step. Stop only by creating $run/STOP." >&2
exit 2
