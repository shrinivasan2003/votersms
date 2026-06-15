"""
Migration: encrypt existing plaintext AI API keys in customer_ai_config table.

Safe to run multiple times — already-encrypted values (prefixed with 'enc:') are skipped.

Run with:
  /opt/votersms/python_server/venv/bin/python3 migrate_ai_keys.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal
from app.utils.crypto import encrypt_field
from sqlalchemy import text

db = SessionLocal()
try:
    rows = db.execute(text("SELECT id, api_key FROM customer_ai_config")).fetchall()
    updated = 0
    skipped = 0
    for row in rows:
        if row.api_key and not row.api_key.startswith("enc:"):
            encrypted = encrypt_field(row.api_key)
            db.execute(
                text("UPDATE customer_ai_config SET api_key=:key WHERE id=:id"),
                {"key": encrypted, "id": row.id}
            )
            updated += 1
            print(f"  ✅ Encrypted key for row id={row.id}")
        else:
            skipped += 1
            print(f"  ⏭️  Skipped row id={row.id} (already encrypted or empty)")
    db.commit()
    print(f"\nDone. {updated} key(s) encrypted, {skipped} skipped.")
finally:
    db.close()
