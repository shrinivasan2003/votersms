"""
Run once to create the email_replies table for 2-way email support.

Usage (from python_server/):
    python3 create_email_replies_table.py
"""
from app.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()
try:
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS email_replies (
            id                  INT AUTO_INCREMENT PRIMARY KEY,
            from_email          VARCHAR(255) NOT NULL,
            from_name           VARCHAR(255),
            subject             VARCHAR(500),
            body_text           TEXT,
            stripped_reply      TEXT,
            postmark_message_id VARCHAR(100),
            voter_id            INT          NULL,
            job_id              INT          NULL,
            customer_id         INT          NULL,
            is_read             TINYINT(1)   NOT NULL DEFAULT 0,
            received_at         DATETIME,
            created_at          TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_reply_voter   FOREIGN KEY (voter_id)   REFERENCES voters(id)   ON DELETE SET NULL,
            CONSTRAINT fk_reply_job     FOREIGN KEY (job_id)     REFERENCES email_jobs(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    """))
    db.commit()
    print("✅  email_replies table created successfully.")
except Exception as e:
    db.rollback()
    print(f"❌  Error: {e}")
finally:
    db.close()
