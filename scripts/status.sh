#!/usr/bin/env bash
set -u

root="$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null)/.."
root="$(cd "$root" && pwd)"
worktrees_dir="$(dirname "$root")/$(basename "$root").wt"
ports=(5173 3000 6006 9222)

echo "== branches"
branches="$(git -C "$root" for-each-ref --format='%(refname:short)' 'refs/heads/agent/*')"
if [ -z "$branches" ]; then
  echo "no agent/* branches"
fi
for branch in $branches; do
  batch="${branch#agent/}"
  read -r behind ahead < <(git -C "$root" rev-list --left-right --count "master...$branch" 2>/dev/null || echo "? ?")
  if git -C "$root" merge-base --is-ancestor "$branch" master 2>/dev/null; then
    merged="merged"
  else
    merged="not merged"
  fi
  worktree="$worktrees_dir/$batch"
  if [ -d "$worktree" ]; then
    dirty_count="$(git -C "$worktree" status --porcelain 2>/dev/null | wc -l)"
    if [ "$dirty_count" -gt 0 ]; then dirty="dirty ($dirty_count)"; else dirty="clean"; fi
    if [ -f "$worktree/REPORT.md" ]; then report="REPORT.md present"; else report="REPORT.md missing"; fi
    newest="$(find "$worktree" \( -name node_modules -o -name .git -o -name dist -o -name .tsbuild -o -name storybook-static \) -prune -o -type f -printf '%T@ %TY-%Tm-%Td %TH:%TM %P\n' 2>/dev/null | sort -n | tail -1 | cut -d' ' -f2-)"
  else
    dirty="no worktree"
    report="REPORT.md missing"
    newest="-"
  fi
  if compgen -G "$root/.claude/run/$batch/*.log" >/dev/null; then gate="gate log present"; else gate="no gate log"; fi
  echo "$branch: ahead $ahead, behind $behind, $merged, $dirty, $report, newest ${newest:--}, $gate"
done

echo "== listeners on agent ports"
pattern="$(printf ':%s$|' "${ports[@]}")"
pattern="${pattern%|}"
listeners="$(ss -Htlnp 2>&1 | awk -v pattern="$pattern" '$4 ~ pattern')"
if [ -n "$listeners" ]; then
  echo "$listeners"
else
  echo "none on ${ports[*]}"
fi

echo "== docker containers labelled combat-planner=agent"
if containers="$(docker ps --filter label=combat-planner=agent --format '{{.ID}} {{.Image}} {{.Status}} {{.Names}}' 2>&1)"; then
  echo "${containers:-none}"
else
  echo "docker unreachable: $(head -1 <<<"$containers")"
fi
exit 0
