#!/bin/bash
# Nightly mysqldump of the votersms database, gzip-compressed, with rotation.
# Installed via votersms-backup.timer (systemd) — see deploy/backup/*.service/.timer.
set -euo pipefail

APP_DIR="/opt/votersms/python_server"
BACKUP_DIR="/var/backups/votersms"
RETENTION_DAYS=30

DB_USER=$(grep -m1 '^DB_USER=' "$APP_DIR/.env" | cut -d'=' -f2- | tr -d '"' | tr -d "'")
DB_PASS=$(grep -m1 '^DB_PASS=' "$APP_DIR/.env" | cut -d'=' -f2- | tr -d '"' | tr -d "'")
DB_NAME=$(grep -m1 '^DB_NAME=' "$APP_DIR/.env" | cut -d'=' -f2- | tr -d '"' | tr -d "'")
DB_HOST=$(grep -m1 '^DB_HOST=' "$APP_DIR/.env" | cut -d'=' -f2- | tr -d '"' | tr -d "'")
DB_PORT=$(grep -m1 '^DB_PORT=' "$APP_DIR/.env" | cut -d'=' -f2- | tr -d '"' | tr -d "'")

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
