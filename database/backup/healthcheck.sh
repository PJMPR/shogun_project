#!/usr/bin/env sh
set -eu

: "${BACKUP_ROOT:=/backups}"
: "${BACKUP_MAX_AGE_SECONDS:=172800}"

marker="$BACKUP_ROOT/.last-success"
[ -f "$marker" ] || exit 1
age="$(( $(date +%s) - $(stat -c %Y "$marker") ))"
[ "$age" -le "$BACKUP_MAX_AGE_SECONDS" ]
