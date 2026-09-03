#!/bin/bash
# Build the votersms database schema from scratch on an empty database.
#
# Why this script exists: the Alembic chain alone cannot bootstrap this
# database. Its first migration (976528942561_initial) is a *baseline* with
# an empty upgrade() — all the core CREATE TABLE statements live in its
# downgrade(). Historically the schema was created outside Alembic and the
# baseline was stamped on top, so a fresh install had no reproducible path
# until this script. 01_core_tables.sql is that DDL, extracted faithfully
# from the baseline migration.
#
# Several tables also came from standalone create_*/migrate_* scripts that
# were never folded into Alembic, and one Alembic migration
# (add_customer_id_to_contact_lists) depends on a table created by one of
# them — hence the interleaved order below. Do not reorder without checking
# those dependencies.
#
# Usage (from python_server/, venv active, .env configured):
#   bash ../deploy/fresh_install/install.sh
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

[[ -f .env ]] || { echo "ERROR: run this from python_server/ with .env present"; exit 1; }
[[ -n "${VIRTUAL_ENV:-}" ]] || { echo "ERROR: activate the venv first"; exit 1; }

envval() {
    grep -m1 "^$1=" .env | cut -d'=' -f2- | tr -d '"' | tr -d "'" \
        | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//'
}
DB_USER=$(envval DB_USER); DB_PASS=$(envval DB_PASS); DB_NAME=$(envval DB_NAME)

step() { echo; echo "── $* ──"; }

step "1/4  Core tables (from Alembic baseline DDL)"
mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < "$HERE/01_core_tables.sql"
echo "core tables created"

step "2/4  Alembic up to the contact_lists dependency"
alembic upgrade c3d4e5f6a7b8

step "3/4  contact_lists, then the rest of Alembic"
python create_lists_tables.py
alembic upgrade head

step "4/4  Standalone scripts (dependency order)"
# customer_limits must precede create_ai_tables (which alters it);
# email analytics tables must precede their v2 -> v3 column migrations.
for s in create_customer_limits_table.py \
         create_ai_tables.py \
         create_email_analytics_tables.py \
         migrate_email_events_v2.py \
         migrate_email_events_v3.py \
         migrate_job_success_failed_counts.py \
         create_recipient_columns.py \
         create_attachments_table.py \
         create_template_attachments_table.py \
         create_email_replies_table.py \
         create_token_blacklist.py; do
    echo "  → $s"
    python "$s"
done

# Deliberately excluded: migrate_ai_keys.py, backfill_audit_log.py,
# backfill_bot_suspected_v3_1.py — data migrations that no-op on an empty DB.

echo
echo "Done. Tables created:"
mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$DB_NAME';"
