"""
Migration: Add success_count / failed_count to sms_jobs and email_jobs.

The "Success/Failed" column on the Job Statistics dashboard was hardcoded
to the literal string '0/0' in the /api/recent-jobs query — the real
counts were computed during send (message_processor.py) but only ever
logged, never persisted. This adds the columns so they can be saved and
displayed for real.

Run once from python_server/:
    python3 migrate_job_success_failed_counts.py
"""
from app.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()
try:
    alterations = [
        "ALTER TABLE sms_jobs   ADD COLUMN success_count INT NOT NULL DEFAULT 0 AFTER recipients",
        "ALTER TABLE sms_jobs   ADD COLUMN failed_count  INT NOT NULL DEFAULT 0 AFTER success_count",
        "ALTER TABLE email_jobs ADD COLUMN success_count INT NOT NULL DEFAULT 0 AFTER recipients",
        "ALTER TABLE email_jobs ADD COLUMN failed_count  INT NOT NULL DEFAULT 0 AFTER success_count",
    ]
    for sql in alterations:
        try:
            db.execute(text(sql))
            db.commit()
            print(f"✅  Applied: {sql}")
        except Exception as e:
            db.rollback()
            if "Duplicate column name" in str(e) or "already exists" in str(e).lower():
                print(f"⚠️   Already applied (skipped): {sql}")
            else:
                print(f"❌  Error: {e}")
except Exception as e:
    print(f"❌  Fatal error: {e}")
finally:
    db.close()
