"""
Postmark Inbound Email webhook.

When a voter replies to a campaign email, Postmark POSTs the parsed
email to this endpoint.

Postmark setup (one-time):
  1. Dashboard → Servers → <your server> → Settings → Inbound
  2. Set the Inbound webhook URL to:
         https://outreach.ballotda.com/api/email-inbound?secret=<WEBHOOK_SECRET>
  3. Set your inbound domain MX record:
         inbound.ballotda.com  MX  10  inbound.postmarkapp.com

Matching logic (in priority order):
  1. MailboxHash  — present when Reply-To was set as reply+{job_id}_{voter_id}@domain
  2. Sender email — look up voter by from_email scoped to the customer
"""
import os
import logging
from fastapi import APIRouter, Request, Query, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.database import get_db

logger = logging.getLogger(__name__)
router = APIRouter()

WEBHOOK_SECRET = os.getenv("WEBHOOK_SECRET", "")




@router.post("/email-inbound")
async def receive_inbound_email(
    request: Request,
    secret: str = Query(default=""),
    db: Session = Depends(get_db),
):
    # ── Secret validation ────────────────────────────────────────────────────
    if WEBHOOK_SECRET and secret != WEBHOOK_SECRET:
        raise HTTPException(status_code=401, detail="Invalid webhook secret")

    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    from_email  = payload.get("From", "").strip()
    from_name   = payload.get("FromName", "").strip()
    subject     = payload.get("Subject", "").strip()
    body_text   = payload.get("TextBody", "").strip()
    stripped    = payload.get("StrippedTextReply", "").strip() or body_text
    message_id  = payload.get("MessageID", "").strip()
    mailbox_hash = payload.get("MailboxHash", "").strip()   # e.g. "42_317"
    received_at = payload.get("Date")

    if not from_email:
        return {"status": "ignored", "reason": "no From address"}

    voter_id    = None
    job_id      = None
    customer_id = None

    # ── 1. Match via MailboxHash (job_id_voter_id) ───────────────────────────
    if mailbox_hash and "_" in mailbox_hash:
        try:
            parts = mailbox_hash.split("_")
            j_id  = int(parts[0])
            v_id  = int(parts[1])
            row = db.execute(
                text("SELECT id, customer_id FROM email_jobs WHERE id=:jid"),
                {"jid": j_id},
            ).fetchone()
            if row:
                job_id      = j_id
                voter_id    = v_id
                customer_id = row[1]
                logger.info(f"Inbound matched via MailboxHash → job={job_id} voter={voter_id}")
        except (ValueError, IndexError):
            pass

    # ── 2. Fallback: match voter by sender email ─────────────────────────────
    if voter_id is None:
        row = db.execute(
            text("SELECT id, customer_id FROM voters WHERE email=:email LIMIT 1"),
            {"email": from_email},
        ).fetchone()
        if row:
            voter_id    = row[0]
            customer_id = row[1]
            logger.info(f"Inbound matched via email → voter={voter_id}")
        else:
            logger.info(f"Inbound from {from_email}: no matching voter found, storing unmatched.")

    # ── Persist ──────────────────────────────────────────────────────────────
    try:
        db.execute(
            text("""
                INSERT INTO email_replies
                    (from_email, from_name, subject, body_text, stripped_reply,
                     postmark_message_id, voter_id, job_id, customer_id, received_at)
                VALUES
                    (:from_email, :from_name, :subject, :body_text, :stripped,
                     :mid, :voter_id, :job_id, :customer_id, :received_at)
            """),
            {
                "from_email":  from_email,
                "from_name":   from_name or None,
                "subject":     subject   or None,
                "body_text":   body_text or None,
                "stripped":    stripped  or None,
                "mid":         message_id or None,
                "voter_id":    voter_id,
                "job_id":      job_id,
                "customer_id": customer_id,
                "received_at": received_at or None,
            },
        )
        db.commit()
        logger.info(f"Stored inbound reply from {from_email}")
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to store inbound reply: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    return {"status": "ok", "voter_id": voter_id, "job_id": job_id}


@router.get("/email-replies")
def get_email_replies(
    db: Session = Depends(get_db),
    current_user=Depends(__import__("app.dependencies.security", fromlist=["get_current_user"]).get_current_user),
):
    """Return all inbound replies for the current organisation."""
    try:
        if current_user.customer_id:
            rows = db.execute(
                text("""
                    SELECT r.*,
                           CONCAT(v.first_name, ' ', v.last_name) AS voter_name,
                           j.id AS matched_job_id
                    FROM email_replies r
                    LEFT JOIN voters     v ON r.voter_id = v.id
                    LEFT JOIN email_jobs j ON r.job_id   = j.id
                    WHERE r.customer_id = :cid
                    ORDER BY r.received_at DESC, r.id DESC
                """),
                {"cid": current_user.customer_id},
            ).fetchall()
        else:
            rows = db.execute(
                text("""
                    SELECT r.*,
                           CONCAT(v.first_name, ' ', v.last_name) AS voter_name,
                           j.id AS matched_job_id
                    FROM email_replies r
                    LEFT JOIN voters     v ON r.voter_id = v.id
                    LEFT JOIN email_jobs j ON r.job_id   = j.id
                    ORDER BY r.received_at DESC, r.id DESC
                """),
            ).fetchall()
        return [dict(row._mapping) for row in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/email-replies/{reply_id}/read")
def mark_reply_read(
    reply_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(__import__("app.dependencies.security", fromlist=["get_current_user"]).get_current_user),
):
    """Mark a reply as read."""
    try:
        db.execute(
            text("UPDATE email_replies SET is_read=1 WHERE id=:rid AND (customer_id=:cid OR :cid IS NULL)"),
            {"rid": reply_id, "cid": current_user.customer_id},
        )
        db.commit()
        return {"status": "ok"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/email-replies/{reply_id}")
def delete_reply(
    reply_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(__import__("app.dependencies.security", fromlist=["get_current_user"]).get_current_user),
):
    try:
        db.execute(
            text("DELETE FROM email_replies WHERE id=:rid AND (customer_id=:cid OR :cid IS NULL)"),
            {"rid": reply_id, "cid": current_user.customer_id},
        )
        db.commit()
        return {"status": "ok"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
