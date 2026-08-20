"""
One-off backfill: re-evaluate is_bot_suspected on existing email_events rows
after narrowing BOT_WINDOW_SECONDS from 10s to 3s (see email_webhooks.py).

The original 10s window flagged some genuinely-fast human opens/clicks
(e.g. someone watching for a test email and opening it within 5-10s) as
bot-suspected. This re-runs the *current* detection logic against every
existing 'open'/'click' row and corrects any that no longer qualify.

Run once from python_server/:
    python3 backfill_bot_suspected_v3_1.py
"""
from app.database import SessionLocal
from sqlalchemy import text
from app.api.email_webhooks import _is_bot_suspected

db = SessionLocal()
try:
    rows = db.execute(text("""
        SELECT ee.id, ejm.sent_at, ee.occurred_at, ee.client_name, ee.platform, ee.is_bot_suspected
        FROM email_events ee
        JOIN email_job_messages ejm ON ee.postmark_message_id = ejm.postmark_message_id
        WHERE ee.event_type IN ('open', 'click')
    """)).fetchall()

    changed = 0
    for row in rows:
        occurred_str = row.occurred_at.strftime("%Y-%m-%d %H:%M:%S") if row.occurred_at else None
        recomputed = _is_bot_suspected(row.sent_at, occurred_str, row.client_name, row.platform)
        if recomputed != row.is_bot_suspected:
            db.execute(
                text("UPDATE email_events SET is_bot_suspected = :v WHERE id = :id"),
                {"v": recomputed, "id": row.id},
            )
            changed += 1

    db.commit()
    print(f"✅  Re-evaluated {len(rows)} open/click events — corrected {changed} row(s).")
except Exception as e:
    db.rollback()
    print(f"❌  Error: {e}")
finally:
    db.close()
