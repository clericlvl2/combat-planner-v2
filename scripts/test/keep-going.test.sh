#!/usr/bin/env bash
set -u
cd "$(dirname "$0")/../.."
export CLAUDE_PROJECT_DIR=$PWD
run=.claude/run
backup=$(mktemp -d)
[ -d "$run" ] && cp -r "$run" "$backup/run"
rm -rf "$run"; mkdir -p "$run"
fail=0
t() {
  local name=$1 input=$2 want=$3
  echo "$input" | bash scripts/keep-going.sh >/tmp/kg.out 2>/tmp/kg.err
  local got=$?
  if [ "$got" = "$want" ]; then echo "ok   $name exit=$got"; else echo "FAIL $name exit=$got want=$want err=$(head -c 80 /tmp/kg.err)"; fail=1; fi
}
t no-marker '{"session_id":"A"}' 0
echo pending > "$run/orchestrator"
t claim-A '{"session_id":"A","background_tasks":[]}' 2
[ "$(cat "$run/orchestrator")" = A ] && echo "ok   marker claimed by A" || { echo "FAIL marker"; fail=1; }
t other-B '{"session_id":"B"}' 0
t A-bg '{"session_id":"A","background_tasks":[{"id":1}]}' 0
t A-idle '{"session_id":"A","stop_hook_active":true}' 2
echo 49 > "$run/stop-count"
t A-limit '{"session_id":"A"}' 0
grep -q systemMessage /tmp/kg.out && echo "ok   limit systemMessage" || { echo "FAIL limit message"; fail=1; }
[ -f "$run/orchestrator" ] && { echo "FAIL marker not released"; fail=1; } || echo "ok   marker released"
rm -rf "$run"
[ -d "$backup/run" ] && mv "$backup/run" "$run"
rm -rf "$backup"
exit $fail
