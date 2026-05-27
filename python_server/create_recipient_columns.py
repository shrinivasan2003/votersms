"""
Migration — adds list_id and voter_id columns to sms_jobs and whatsapp_jobs,
and voter_id to email_jobs (list_id already exists there).

Run from python_server/:
    python create_recipient_columns.py
"""
import os, sys
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()

DB_URL = (
    f"mysql+pymysql://"
    f"{os.getenv('DB_USER','root')}:{os.getenv('DB_PASS','')}@"
    f"{os.getenv('DB_HOST','localhost')}:{os.getenv('DB_PORT','3306')}/"
    f"{os.getenv('DB_NAME','votersms')}"
)

engine = create_engine(DB_URL, pool_pre_ping=True)
conn   = engine.connect()

def col_exists(table, col):
    row = conn.execute(text(
        "SELECT COUNT(*) FROM information_schema.COLUMNS "
        "WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=:t AND COLUMN_NAME=:c"
    ), {"t": table, "c": col}).fetchone()
    return row[0] > 0

changes = [
    ("sms_jobs",      "list_id",  "ALTER TABLE sms_jobs  ADD COLUMN list_id  INT NULL DEFAULT NULL"),
    ("sms_jobs",      "voter_id", "ALTER TABLE sms_jobs  ADD COLUMN voter_id INT NULL DEFAULT NULL"),
    ("whatsapp_jobs", "list_id",  "ALTER TABLE whatsapp_jobs ADD COLUMN list_id  INT NULL DEFAULT NULL"),
    ("whatsapp_jobs", "voter_id", "ALTER TABLE whatsapp_jobs ADD COLUMN voter_id INT NULL DEFAULT NULL"),
    ("email_jobs",    "voter_id", "ALTER TABLE email_jobs ADD COLUMN voter_id INT NULL DEFAULT NULL"),
]

try:
    for table, col, sql in changes:
        if col_exists(table, col):
            print(f"  ✓ {table}.{col} already exists")
        else:
            conn.execute(text(sql))
            print(f"  + added {table}.{col}")
    conn.commit()
    print("\n✅ Migration complete.")
except Exception as e:
    conn.rollback()
    print(f"❌ {e}")
    sys.exit(1)
finally:
    conn.close()
