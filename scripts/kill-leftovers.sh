#!/usr/bin/env bash
set -u
for port in 3000 5173 6006 9222; do
  for pid in $(ss -ltnpH "sport = :$port" 2>/dev/null | grep -oE 'pid=[0-9]+' | cut -d= -f2 | sort -u); do
    kill "$pid" 2>/dev/null || true
  done
done
command -v docker >/dev/null && docker ps -q --filter label=combat-planner=agent 2>/dev/null | xargs -r docker stop >/dev/null 2>&1
exit 0
