"""
Postmark webhook endpoint.
Receives Open / Click / Bounce / SpamComplaint / Delivery events and
persists them in email_events for analytics.

Setup in Postmark:
  Dashboard → Servers → <your server> → Message Streams → broadcast
  → Webhooks → Add Webhook
  URL: https://<your-public-host>/api/email-webhooks?secret=<WEBHOOK_SECRET>
  Events: Open, Click, Bounce, SpamComplaint, Delivery

For local dev, expose FastAPI with:
  ngrok http 8000
"""
import os
import logging
from fastapi import APIRouter, HTTPException, Request, Query, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.database import SessionLocal

logger = logging.getLogger(__name__)
router = APIRouter()

WEBHOOK_SECRET = os.getenv("WEBHOOK_SECRET", "")

# Postmark RecordType  →  our canonical event_type
_EVENT_MAP = {
    "Open": "open",
    "Click": "click",
    "Bounce": "bounce",
    "SpamComplaint": "spam",
    "Delivery": "delivery",
    "SubscriptionChange": "unsubscribe",
}


def _get_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/email-webhooks")
async def receive_postmark_webhook(
    request: Request,
    secret: str = Query(default=""),
    db: Session = Depends(_get_session),
):
    """
    Postmark calls this endpoint for every tracked event.
    We validate the secret (optional), parse the payload, and persist the event.
    """
    # ── Secret validation (skip check if WEBHOOK_SECRET not configured) ──
    if WEBHOOK_SECRET and secret != WEBHOOK_SECRET:
        raise HTTPException(status_code=401, detail="Invalid webhook secret")

    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    record_type = payload.get("RecordType", "")
    event_type = _EVENT_MAP.get(record_type)
    if not event_type:
        logger.info(f"Ignored unknown Postmark RecordType: {record_type}")
        return {"status": "ignored", "reason": f"unknown RecordType: {record_type}"}

    # MessageID is present in all event types
    message_id = payload.get("MessageID", "")
    if not message_id:
        return {"status": "ignored", "reason": "no MessageID"}

    # Recipient email varies by event type
    recipient = (
        payload.get("Recipient")          # Open, Click
        or payload.get("Email")           # Bounce, SpamComplaint
        or ""
    )

    # Timestamp
    occurred_at = (
        payload.get("ReceivedAt")         # Open, Click, Delivery
        or payload.get("BouncedAt")       # Bounce
        or payload.get("ChangedAt")       # SubscriptionChange
    )

    # Resolve job_id from our messages table
    row = db.execute(
        text("SELECT job_id FROM email_job_messages WHERE postmark_message_id = :mid"),
        {"mid": message_id},
    ).fetchone()
    job_id = row[0] if row else None

    # Device / client details (Open & Click)
    client_info = payload.get("Client") or {}
    os_info = payload.get("OS") or {}

    try:
        db.execute(
            text("""
                INSERT INTO email_events
                    (postmark_message_id, job_id, recipient_email, event_type,
                     is_first_event, click_url, platform, client_name, os_name,
                     read_seconds, occurred_at)
                VALUES
                    (:mid, :job_id, :recipient, :event_type,
                     :is_first, :click_url, :platform, :client_name, :os_name,
                     :read_seconds, :occurred_at)
            """),
            {
                "mid": message_id,
                "job_id": job_id,
                "recipient": recipient,
                "event_type": event_type,
                "is_first": 1 if (payload.get("FirstOpen") or payload.get("FirstClick")) else 0,
                "click_url": payload.get("OriginalLink"),
                "platform": payload.get("Platform"),
                "client_name": client_info.get("Name"),
                "os_name": os_info.get("Name"),
                "read_seconds": payload.get("ReadSeconds"),
                "occurred_at": occurred_at,
            },
        )
        db.commit()
        logger.info(f"Stored {event_type} event for MessageID {message_id}")
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to store webhook event: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    return {"status": "ok", "event_type": event_type, "job_id": job_id}
