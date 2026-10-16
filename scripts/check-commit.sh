#!/usr/bin/env bash
set -uo pipefail

if [ "$#" -ne 1 ]; then
  echo "usage: scripts/check-commit.sh <range>" >&2
  exit 2
fi

range="$1"
root="$(git rev-parse --show-toplevel)"
size_cap=1500
subject_pattern='^(feat|fix|test|chore|docs)\((toolchain|domain|ui|api|server|web|e2e|docker)\): (.+)$'
unit_sources=("$root/.claude/plans/2026-10-16-build-combat-planner-v2.md")
for brief in "$root"/.claude/artifacts/briefs/*.md; do
  [ -e "$brief" ] && unit_sources+=("$brief")
done

failures=0
fail() {
  echo "$1 $2: $3" >&2
  failures=$((failures + 1))
}

commits="$(git rev-list --reverse "$range")" || exit 2

for commit in $commits; do
  short="$(git rev-parse --short "$commit")"
  subject="$(git log -1 --format=%s "$commit")"

  if [[ ! "$subject" =~ $subject_pattern ]]; then
    fail "$short" "$subject" "subject is not <type>(<scope>): <unit>"
    continue
  fi
  scope="${BASH_REMATCH[2]}"
  unit="${BASH_REMATCH[3]}"

  if ! grep -qF -- "$unit" "${unit_sources[@]}"; then
    fail "$short" "$subject" "unit '$unit' is not named in the plan or a brief"
  fi

  files="$(git diff-tree --no-commit-id --name-only -r "$commit")"

  while IFS= read -r file; do
    [ -z "$file" ] && continue
    case "$file" in
      docs/* | .claude/*) fail "$short" "$subject" "path outside agent scope: $file" ;;
      CLAUDE.md)
        [ "$unit" = "CLAUDE.md commands" ] || [ "$unit" = "check scripts" ] || [ "$unit" = "tests" ] || fail "$short" "$subject" "path outside agent scope: $file"
        ;;
    esac
  done <<<"$files"

  screenshot_names="$(grep -E '^packages/ui/__screenshots__/[^/]+/' <<<"$files" | cut -d/ -f4 | sort -u)"
  for name in $screenshot_names; do
    if ! grep -qE "^packages/ui/src/(.+/)?${name}/" <<<"$files"; then
      fail "$short" "$subject" "packages/ui/__screenshots__/$name/ changed without a change under packages/ui/src/**/$name/"
    fi
  done

  if [ "$scope" = "ui" ]; then
    component_count="$(grep -E '^packages/ui/src/(.+/)?[A-Z][A-Za-z0-9]*/[^/]+$' <<<"$files" |
      sed -E 's#/[^/]+$##' | sort -u | wc -l)"
    if [ "$component_count" -gt 1 ]; then
      fail "$short" "$subject" "ui commit touches $component_count component folders"
    fi
  fi

  changed="$(git show --numstat --format= "$commit" |
    awk '$3 != "pnpm-lock.yaml" && $3 !~ /(^|\/)__screenshots__\// { if ($1 != "-") total += $1 + $2 } END { print total + 0 }')"
  if [ "$changed" -gt "$size_cap" ]; then
    fail "$short" "$subject" "$changed changed lines, cap $size_cap"
  fi
done

if [ "$failures" -gt 0 ]; then
  echo "check-commit: $failures problem(s) in $range" >&2
  exit 1
fi
echo "check-commit: $(wc -w <<<"$commits") commit(s) in $range pass"
