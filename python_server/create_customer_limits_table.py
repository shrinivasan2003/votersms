"""
Run once to create the customer_limits table.

Usage (from python_server/):
    python3 create_customer_limits_table.py
"""
from app.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()
try:
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS customer_limits (
            id                          INT AUTO_INCREMENT PRIMARY KEY,
            customer_id                 INT NOT NULL UNIQUE,

            -- Resource counts (at any given time)
            max_voters                  INT NOT NULL DEFAULT 10000,
            max_contact_lists           INT NOT NULL DEFAULT 20,
            max_sms_templates           INT NOT NULL DEFAULT 50,
            max_email_templates         INT NOT NULL DEFAULT 50,
            max_whatsapp_templates      INT NOT NULL DEFAULT 50,

            -- Job creation counts (total ever created)
            max_sms_jobs                INT NOT NULL DEFAULT 500,
            max_email_jobs              INT NOT NULL DEFAULT 500,
            max_whatsapp_jobs           INT NOT NULL DEFAULT 500,

            -- Monthly message volume
            max_sms_per_month           INT NOT NULL DEFAULT 50000,
            max_emails_per_month        INT NOT NULL DEFAULT 50000,
            max_whatsapp_per_month      INT NOT NULL DEFAULT 10000,

            created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

            CONSTRAINT fk_cl_customer FOREIGN KEY (customer_id)
                REFERENCES customers(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    """))
    db.commit()
    print("✅  customer_limits table created.")

    # Back-fill any existing customers that don't have a limits row yet
    db.execute(text("""
        INSERT IGNORE INTO customer_limits (customer_id)
        SELECT id FROM customers
    """))
    db.commit()
    print("✅  Back-filled limits for existing customers.")
except Exception as e:
    db.rollback()
    print(f"❌  Error: {e}")
finally:
    db.close()
