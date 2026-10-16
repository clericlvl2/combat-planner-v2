#!/usr/bin/env bash
set -u
root="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
wt=$(realpath -m "$root/../combat-planner-v2.wt")
for port in 3000 5173 6006 9222; do
  for pid in $(ss -ltnpH "sport = :$port" 2>/dev/null | grep -oE 'pid=[0-9]+' | cut -d= -f2 | sort -u); do
    cwd=$(readlink "/proc/$pid/cwd" 2>/dev/null || true)
    case "$cwd" in
      "$wt"/*) kill "$pid" 2>/dev/null; sleep 2; kill -0 "$pid" 2>/dev/null && kill -9 "$pid" 2>/dev/null ;;
    esac
  done
done
command -v docker >/dev/null && timeout 10 docker ps -q --filter label=combat-planner=agent 2>/dev/null | xargs -r timeout 30 docker stop >/dev/null 2>&1
exit 0
