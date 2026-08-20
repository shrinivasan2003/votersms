"""
Twilio status-callback webhook.
Receives SMS delivery status updates (queued/sent/delivered/failed/
undelivered) and updates the matching row in sms_job_messages.

Unlike Postmark, no per-message webhook configuration is needed in the
Twilio console — the callback URL is passed directly as `status_callback`
on each message.create() call in message_processor.py, pointing here:
  https://<your-public-host>/api/sms-webhooks?secret=<WEBHOOK_SECRET>

Twilio POSTs form-encoded data (not JSON).
"""
import logging
from datetime import datetime
from fastapi import APIRouter, HTTPException, Request, Query, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.database import get_db
from app.api.email_webhooks import WEBHOOK_SECRET

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/sms-webhooks")
async def receive_twilio_status_callback(
    request: Request,
    secret: str = Query(default=""),
    db: Session = Depends(get_db),
):
    """
    Twilio calls this endpoint on every status transition for a message.
    Always returns 200 so Twilio never retries unnecessarily; errors are
    logged but never surfaced as HTTP 500.
    """
    if not WEBHOOK_SECRET:
        logger.error("WEBHOOK_SECRET is not configured — rejecting webhook request")
        raise HTTPException(status_code=403, detail="Webhook secret not configured on server")
    if secret != WEBHOOK_SECRET:
        raise HTTPException(status_code=401, detail="Invalid webhook secret")

    try:
        form = await request.form()
    except Exception as exc:
        logger.warning(f"Twilio webhook: failed to parse form body: {exc}")
        return {"status": "error", "reason": "invalid form body"}

    sid          = form.get("MessageSid", "")
    status       = form.get("MessageStatus", "")
    error_code   = form.get("ErrorCode") or None
    error_message = form.get("ErrorMessage") or None

    if not sid or not status:
        logger.warning(f"Twilio webhook: missing MessageSid/MessageStatus in payload: {dict(form)}")
        return {"status": "error", "reason": "missing MessageSid/MessageStatus"}

    try:
        result = db.execute(
            text("""
                UPDATE sms_job_messages
                SET status = :status, error_code = :error_code, error_message = :error_message,
                    updated_at = :updated_at
                WHERE twilio_sid = :sid
            """),
            {
                "status": status, "error_code": error_code, "error_message": error_message,
                "updated_at": datetime.utcnow(), "sid": sid,
            },
        )
        db.commit()
        if result.rowcount == 0:
            logger.warning(f"Twilio webhook: no sms_job_messages row found for MessageSid={sid!r}")
        else:
            logger.info(f"sms_job_messages: {sid} -> {status}")
    except Exception as exc:
        db.rollback()
        logger.error(f"Twilio webhook: failed to update status for {sid!r}: {exc}")

    return {"status": "ok"}
