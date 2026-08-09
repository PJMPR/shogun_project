#!/usr/bin/env bash
set -Eeuo pipefail

: "${BACKUP_INTERVAL_SECONDS:=86400}"
: "${BACKUP_RUN_ON_STARTUP:=true}"

if ! [[ "$BACKUP_INTERVAL_SECONDS" =~ ^[1-9][0-9]*$ ]]; then
  echo "BACKUP_INTERVAL_SECONDS must be a positive integer" >&2
  exit 1
fi

echo "Database backup service started; interval=${BACKUP_INTERVAL_SECONDS}s"

if [[ "${BACKUP_RUN_ON_STARTUP,,}" == "true" ]]; then
  /app/backup.sh || echo "Initial backup failed; the service will retry after the configured interval" >&2
fi

while true; do
  sleep "$BACKUP_INTERVAL_SECONDS" &
  wait $!
  /app/backup.sh || echo "Scheduled backup failed; the service remains running" >&2
done
