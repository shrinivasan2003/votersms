"""
Migration: create email_template_attachments table
Run with: /opt/votersms/python_server/venv/bin/python3 create_template_attachments_table.py
"""
from app.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()
try:
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS email_template_attachments (
            id           INT AUTO_INCREMENT PRIMARY KEY,
            template_id  INT NOT NULL,
            filename     VARCHAR(255) NOT NULL,
            filepath     VARCHAR(500) NOT NULL,
            content_type VARCHAR(100) NOT NULL,
            file_size    INT NOT NULL DEFAULT 0,
            created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_template_id (template_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """))
    db.commit()
    print("✅ email_template_attachments table created.")
finally:
    db.close()
