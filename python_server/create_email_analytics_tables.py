"""
Migration: Create email_job_messages and email_events tables
Run once:  python create_email_analytics_tables.py
"""
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()

DB_URL = (
    f"mysql+pymysql://"
    f"{os.getenv('DB_USER','root')}:{os.getenv('DB_PASS','')}@"
    f"{os.getenv('DB_HOST','localhost')}:{os.getenv('DB_PORT','3306')}/"
    f"{os.getenv('DB_NAME','votersms')}"
)

engine = create_engine(DB_URL)

DDL = [
    # One row per individual email sent inside a job (links Postmark MessageID → job + voter)
    """
    CREATE TABLE IF NOT EXISTS email_job_messages (
        id               INT AUTO_INCREMENT PRIMARY KEY,
        job_id           INT NOT NULL,
        voter_id         INT,
        postmark_message_id VARCHAR(100) NOT NULL,
        recipient_email  VARCHAR(255) NOT NULL,
        sent_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_pmid (postmark_message_id),
        INDEX idx_ejm_job (job_id),
        INDEX idx_ejm_pmid (postmark_message_id)
    )
    """,
    # One row per Postmark webhook event (open / click / bounce / spam / delivery)
    """
    CREATE TABLE IF NOT EXISTS email_events (
        id                   INT AUTO_INCREMENT PRIMARY KEY,
        postmark_message_id  VARCHAR(100) NOT NULL,
        job_id               INT,
        recipient_email      VARCHAR(255),
        event_type           VARCHAR(30) NOT NULL,
        is_first_event       TINYINT(1) DEFAULT 0,
        click_url            TEXT,
        platform             VARCHAR(60),
        client_name          VARCHAR(100),
        os_name              VARCHAR(100),
        read_seconds         INT,
        occurred_at          DATETIME,
        created_at           DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_ee_pmid  (postmark_message_id),
        INDEX idx_ee_job   (job_id),
        INDEX idx_ee_type  (event_type)
    )
    """,
]

with engine.connect() as conn:
    for ddl in DDL:
        conn.execute(text(ddl))
    conn.commit()

print("✅  email_job_messages and email_events tables created (or already exist).")
