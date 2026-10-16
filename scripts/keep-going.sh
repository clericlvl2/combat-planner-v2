#!/usr/bin/env bash
set -u
root="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "$root" || exit 0
run=.claude/run
marker=$run/orchestrator
progress=.claude/artifacts/2026-10-16-handoff-build-progress.md
limit=50
mkdir -p "$run"

[ -f "$marker" ] || exit 0
input=$(cat)
sid=$(jq -r '.session_id // empty' <<<"$input" 2>/dev/null)
[ -n "$sid" ] || exit 0
owner=$(cat "$marker")
if [ "$owner" = pending ]; then echo "$sid" > "$marker"; owner=$sid; fi
[ "$owner" = "$sid" ] || exit 0

bg=$(jq -r '.background_tasks // [] | length' <<<"$input" 2>/dev/null || echo 0)
[ "${bg:-0}" -gt 0 ] && exit 0

[ -f "$progress" ] || exit 0
unfinished=$(awk '/^## Пачки/{f=1;next} /^## /{f=0} f' "$progress" \
  | grep -Ec '^\| [^|]+ \| (todo|running|reported|rebased|gate|rework|restarted|merged)( |$)')
if [ "$unfinished" -eq 0 ]; then rm -f "$marker"; exit 0; fi

head=$(git rev-parse master 2>/dev/null || echo none)
last=$(cat "$run/stop-head" 2>/dev/null || true)
count=$(cat "$run/stop-count" 2>/dev/null || echo 0)
if [ "$head" = "$last" ]; then count=$((count + 1)); else count=0; fi
echo "$head" > "$run/stop-head"
echo "$count" > "$run/stop-count"
active=$(jq -r '.stop_hook_active // false' <<<"$input" 2>/dev/null)
echo "$(date -Is) sid=$sid head=${head:0:7} count=$count active=$active unfinished=$unfinished" >> "$run/keep-going.log"

if [ "$count" -ge "$limit" ]; then
  rm -f "$marker"
  printf '{"systemMessage":"keep-going: %s idle stops without a new commit on master; orchestrator released. Run /doit to resume."}\n' "$limit"
  exit 0
fi

echo "Build not finished: $unfinished batches are not guarded yet. Run /doit and do the next step. Do not edit .claude/run/orchestrator." >&2
exit 2
