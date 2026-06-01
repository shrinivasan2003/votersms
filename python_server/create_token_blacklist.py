"""One-time migration: create the token_blacklist table for JWT revocation."""
from app.database import engine
from sqlalchemy import text

DDL = """
CREATE TABLE IF NOT EXISTS token_blacklist (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    jti        VARCHAR(64) NOT NULL UNIQUE,
    expires_at DATETIME    NOT NULL,
    created_at DATETIME    DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_jti (jti),
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
"""

with engine.connect() as conn:
    conn.execute(text(DDL))
    conn.commit()
    print("token_blacklist table created (or already exists).")
