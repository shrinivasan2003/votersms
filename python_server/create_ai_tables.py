"""
Migration: Create Nadia AI tables and extend customer_limits.

Run once:
    cd python_server
    python create_ai_tables.py
"""
import os
from dotenv import load_dotenv
import pymysql

load_dotenv()

conn = pymysql.connect(
    host=os.getenv("DB_HOST", "localhost"),
    port=int(os.getenv("DB_PORT", 3306)),
    user=os.getenv("DB_USER", "root"),
    password=os.getenv("DB_PASS", ""),
    database=os.getenv("DB_NAME", "votersms"),
    autocommit=True,
)
cur = conn.cursor()

statements = [
    # ── 1. Per-org AI key + provider config ──────────────────────────────────
    """
    CREATE TABLE IF NOT EXISTS customer_ai_config (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        customer_id INT UNIQUE NOT NULL,
        provider    VARCHAR(64)  NOT NULL DEFAULT 'deepseek',
        api_key     VARCHAR(512) NOT NULL,
        base_url    VARCHAR(255) NOT NULL,
        model       VARCHAR(128) NOT NULL,
        is_active   TINYINT(1)   NOT NULL DEFAULT 1,
        created_at  DATETIME     NOT NULL DEFAULT NOW(),
        updated_at  DATETIME     NOT NULL DEFAULT NOW() ON UPDATE NOW(),
        CONSTRAINT fk_cac_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    )
    """,

    # ── 2. Per-generation usage log ──────────────────────────────────────────
    """
    CREATE TABLE IF NOT EXISTS ai_usage_logs (
        id                BIGINT AUTO_INCREMENT PRIMARY KEY,
        customer_id       INT     NOT NULL,
        user_id           INT,
        action            VARCHAR(64)  NOT NULL DEFAULT 'generate_email',
        provider          VARCHAR(64),
        model             VARCHAR(128),
        prompt_tokens     INT NOT NULL DEFAULT 0,
        completion_tokens INT NOT NULL DEFAULT 0,
        total_tokens      INT NOT NULL DEFAULT 0,
        created_at        DATETIME NOT NULL DEFAULT NOW(),
        INDEX idx_aul_customer_month (customer_id, created_at)
    )
    """,

]

for sql in statements:
    try:
        cur.execute(sql.strip())
        print(f"OK: {sql.strip()[:60]}…")
    except pymysql.err.OperationalError as e:
        if e.args[0] in (1060, 1061, 1068):   # duplicate column / key
            print(f"SKIP (already exists): {e.args[1]}")
        else:
            raise

# ── 3. Extend customer_limits — add columns one at a time (works on all MySQL versions)
for col, definition in [
    ("ai_monthly_limit",        "INT NOT NULL DEFAULT 50"),
    ("ai_tokens_monthly_limit", "INT NOT NULL DEFAULT 500000"),
]:
    try:
        cur.execute(f"ALTER TABLE customer_limits ADD COLUMN {col} {definition}")
        print(f"OK: Added column customer_limits.{col}")
    except pymysql.err.OperationalError as e:
        if e.args[0] == 1060:
            print(f"SKIP: customer_limits.{col} already exists")
        else:
            raise

cur.close()
conn.close()
print("\nMigration complete.")
