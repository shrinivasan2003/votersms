"""
One-time migration script — creates contact_lists and list_members tables,
and adds list_id column to email_jobs.

Run from python_server/ directory:
    python create_lists_tables.py
"""
import os
import sys
from dotenv import load_dotenv

load_dotenv()

# Use the same connection setup as app/database.py
from sqlalchemy import create_engine, text

DB_URL = (
    f"mysql+pymysql://"
    f"{os.getenv('DB_USER', 'root')}:{os.getenv('DB_PASS', '')}@"
    f"{os.getenv('DB_HOST', 'localhost')}:{os.getenv('DB_PORT', '3306')}/"
    f"{os.getenv('DB_NAME', 'votersms')}"
)

try:
    engine = create_engine(DB_URL, pool_pre_ping=True)
    conn = engine.connect()
except Exception as e:
    print(f"❌ Could not connect to database: {e}")
    sys.exit(1)

try:
    # 1. contact_lists table
    conn.execute(text("""
    CREATE TABLE IF NOT EXISTS contact_lists (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        name        VARCHAR(255)             NOT NULL,
        description TEXT,
        status      ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
        created_at  TIMESTAMP                DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    """))
    print("✓ contact_lists table ready.")

    # 2. list_members table
    conn.execute(text("""
    CREATE TABLE IF NOT EXISTS list_members (
        id       INT AUTO_INCREMENT PRIMARY KEY,
        list_id  INT NOT NULL,
        voter_id INT NOT NULL,
        added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_list_voter (list_id, voter_id),
        CONSTRAINT fk_lm_list FOREIGN KEY (list_id)
            REFERENCES contact_lists(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    """))
    print("✓ list_members table ready.")

    # 3. Add list_id column to email_jobs if not present
    result = conn.execute(text("""
        SELECT COUNT(*) FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME   = 'email_jobs'
          AND COLUMN_NAME  = 'list_id'
    """))
    if result.fetchone()[0] == 0:
        conn.execute(text("ALTER TABLE email_jobs ADD COLUMN list_id INT NULL DEFAULT NULL"))
        print("✓ Added list_id column to email_jobs.")
    else:
        print("✓ list_id column already exists in email_jobs.")

    conn.commit()
    print("\n✅ Migration complete! You can now use contact lists in email jobs.")

except Exception as e:
    print(f"❌ Migration failed: {e}")
    conn.rollback()
    sys.exit(1)
finally:
    conn.close()
