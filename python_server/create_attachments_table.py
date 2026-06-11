"""Run once on the server: python create_attachments_table.py"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from app.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()
try:
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS email_job_attachments (
            id           INT AUTO_INCREMENT PRIMARY KEY,
            job_id       INT          NOT NULL,
            filename     VARCHAR(255) NOT NULL,
            filepath     VARCHAR(500) NOT NULL,
            content_type VARCHAR(100) NOT NULL,
            file_size    INT          NOT NULL DEFAULT 0,
            created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_job_id (job_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """))
    db.commit()
    print("✅ email_job_attachments table created.")
except Exception as e:
    print(f"❌ Error: {e}")
finally:
    db.close()
