"""
Migration v2: Add raw_payload, bounce_type, bounce_description to email_events.
Run once from python_server/:
    python3 migrate_email_events_v2.py
"""
from app.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()
try:
    alterations = [
        # Store the full Postmark JSON so no data is ever lost
        "ALTER TABLE email_events ADD COLUMN raw_payload     JSON          AFTER occurred_at",
        # Bounce-specific fields
        "ALTER TABLE email_events ADD COLUMN bounce_type        VARCHAR(60)   AFTER raw_payload",
        "ALTER TABLE email_events ADD COLUMN bounce_description TEXT          AFTER bounce_type",
    ]
    for sql in alterations:
        try:
            db.execute(text(sql))
            db.commit()
            col = sql.split("ADD COLUMN")[1].strip().split()[0]
            print(f"✅  Added column: {col}")
        except Exception as e:
            db.rollback()
            if "Duplicate column name" in str(e) or "already exists" in str(e).lower():
                col = sql.split("ADD COLUMN")[1].strip().split()[0]
                print(f"⚠️   Column already exists (skipped): {col}")
            else:
                print(f"❌  Error: {e}")
except Exception as e:
    print(f"❌  Fatal error: {e}")
finally:
    db.close()
