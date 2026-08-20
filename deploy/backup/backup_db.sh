#!/bin/bash
# Nightly mysqldump of the votersms database, gzip-compressed, with rotation.
# Installed via votersms-backup.timer (systemd) — see deploy/backup/*.service/.timer.
set -euo pipefail

APP_DIR="/opt/votersms/python_server"
BACKUP_DIR="/var/backups/votersms"
RETENTION_DAYS=30

# .env values may carry trailing whitespace that python-dotenv strips
# automatically but plain shell parsing doesn't — trim it explicitly so
# credentials match exactly what the app itself actually uses.
_env_val() {
    grep -m1 "^$1=" "$APP_DIR/.env" | cut -d'=' -f2- | tr -d '"' | tr -d "'" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//'
}

DB_USER=$(_env_val DB_USER)
DB_PASS=$(_env_val DB_PASS)
DB_NAME=$(_env_val DB_NAME)
DB_HOST=$(_env_val DB_HOST)
DB_PORT=$(_env_val DB_PORT)

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

TIMESTAMP=$(date -u +%Y%m%d_%H%M%S)
OUT_FILE="$BACKUP_DIR/votersms_${TIMESTAMP}.sql.gz"

mysqldump --no-tablespaces \
  -u "$DB_USER" -p"$DB_PASS" -h "${DB_HOST:-localhost}" -P "${DB_PORT:-3306}" \
  --single-transaction --quick \
  "$DB_NAME" | gzip > "$OUT_FILE"

chmod 600 "$OUT_FILE"

find "$BACKUP_DIR" -name "votersms_*.sql.gz" -mtime +"$RETENTION_DAYS" -delete

echo "Backup complete: $OUT_FILE ($(du -h "$OUT_FILE" | cut -f1))"
