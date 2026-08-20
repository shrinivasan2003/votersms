"""
Migration v3: Add is_bot_suspected to email_events.

Flags opens/clicks that are very likely automated (corporate mail-gateway
link/pixel scanners such as Microsoft Defender ATP Safe Links, Proofpoint
URL Defense, Mimecast, etc.) rather than genuine recipient engagement, so
analytics summaries can exclude them from headline open/click counts.

Run once from python_server/:
    python3 migrate_email_events_v3.py
"""
from app.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()
try:
    alterations = [
        "ALTER TABLE email_events ADD COLUMN is_bot_suspected TINYINT(1) NOT NULL DEFAULT 0 AFTER read_seconds",
        "ALTER TABLE email_events ADD INDEX idx_ee_bot (is_bot_suspected)",
    ]
    for sql in alterations:
        try:
            db.execute(text(sql))
            db.commit()
            print(f"✅  Applied: {sql}")
        except Exception as e:
            db.rollback()
            if "Duplicate column name" in str(e) or "duplicate key name" in str(e).lower() or "already exists" in str(e).lower():
                print(f"⚠️   Already applied (skipped): {sql}")
            else:
                print(f"❌  Error: {e}")
except Exception as e:
    print(f"❌  Fatal error: {e}")
finally:
    db.close()
