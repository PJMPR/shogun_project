#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

: "${BACKUP_ROOT:=/backups}"
: "${BACKUP_RETENTION_DAYS:=14}"
: "${MARIADB_HOST:=pj_mariadb}"
: "${MARIADB_PORT:=3306}"
: "${MARIADB_USER:=root}"
: "${MARIADB_PASSWORD:?MARIADB_PASSWORD is required}"
: "${POSTGRES_HOST:=pj_postgres_schedule}"
: "${POSTGRES_PORT:=5432}"
: "${POSTGRES_DB:?POSTGRES_DB is required}"
: "${POSTGRES_USER:?POSTGRES_USER is required}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}"

if ! [[ "$BACKUP_RETENTION_DAYS" =~ ^[0-9]+$ ]]; then
  echo "BACKUP_RETENTION_DAYS must be a non-negative integer" >&2
  exit 1
fi

mkdir -p "$BACKUP_ROOT/mariadb" "$BACKUP_ROOT/postgres"
lock_dir="$BACKUP_ROOT/.backup.lock"
if ! mkdir "$lock_dir" 2>/dev/null; then
  echo "Another backup is already running; skipping this invocation"
  exit 0
fi

timestamp="$(date -u +'%Y%m%dT%H%M%SZ')"
maria_final="$BACKUP_ROOT/mariadb/mariadb-all-${timestamp}.sql.gz"
postgres_final="$BACKUP_ROOT/postgres/${POSTGRES_DB}-${timestamp}.dump"
maria_tmp="${maria_final}.part"
postgres_tmp="${postgres_final}.part"

cleanup() {
  rm -f "$maria_tmp" "$postgres_tmp"
  rmdir "$lock_dir" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "[$timestamp] Creating MariaDB backup"
MYSQL_PWD="$MARIADB_PASSWORD" mariadb-dump \
  --host="$MARIADB_HOST" \
  --port="$MARIADB_PORT" \
  --user="$MARIADB_USER" \
  --all-databases \
  --single-transaction \
  --quick \
  --routines \
  --events \
  --triggers \
  --hex-blob \
  | gzip -9 > "$maria_tmp"
gzip -t "$maria_tmp"
mv "$maria_tmp" "$maria_final"
sha256sum "$maria_final" > "${maria_final}.sha256"

echo "[$timestamp] Creating PostgreSQL backup for $POSTGRES_DB"
PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
  --host="$POSTGRES_HOST" \
  --port="$POSTGRES_PORT" \
  --username="$POSTGRES_USER" \
  --dbname="$POSTGRES_DB" \
  --format=custom \
  --compress=9 \
  --no-password \
  --file="$postgres_tmp"
pg_restore --list "$postgres_tmp" >/dev/null
mv "$postgres_tmp" "$postgres_final"
sha256sum "$postgres_final" > "${postgres_final}.sha256"

touch "$BACKUP_ROOT/.last-success"

if (( BACKUP_RETENTION_DAYS > 0 )); then
  find "$BACKUP_ROOT/mariadb" "$BACKUP_ROOT/postgres" -type f \
    -mtime "+$BACKUP_RETENTION_DAYS" -delete
fi

echo "[$timestamp] Backup completed successfully"
