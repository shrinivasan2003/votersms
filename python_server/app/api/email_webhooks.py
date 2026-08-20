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
import json
import logging
from datetime import datetime
from fastapi import APIRouter, HTTPException, Request, Query, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.database import get_db

logger = logging.getLogger(__name__)
router = APIRouter()

WEBHOOK_SECRET = os.getenv("WEBHOOK_SECRET", "")


# ── Bot / scanner detection ─────────────────────────────────────────────────
# Corporate mail-security gateways (Microsoft Defender ATP Safe Links,
# Proofpoint URL Defense, Mimecast, Barracuda, image-proxy pixel prefetchers,
# etc.) automatically visit every link and image in a message within
# seconds of delivery. Postmark reports these as genuine Open/Click events,
# so without filtering they inflate analytics with events no human made.
SCANNER_CLIENT_MARKERS = (
    "imageproxy", "safelink", "safe link", "atp", "proofpoint", "mimecast",
    "barracuda", "urldefense", "trend micro", "symantec", "forcepoint",
    "ironport", "fireeye", "link scanner", "bot", "crawler", "scanner",
)
# A real human cannot open/click an email this fast after it's sent —
# this window catches gateway prefetching even when the client name is
# generic/unidentified. Kept short (rather than e.g. 10s) because genuine
# gateway/proxy prefetching is near-instant (well under a couple of
# seconds), while a real, attentive recipient can plausibly open an email
# within 5-10 seconds — a wider window was flagging real fast opens
# (e.g. testers watching for the email) as bots.
BOT_WINDOW_SECONDS = 3


def _looks_like_scanner(client_name, platform) -> bool:
    blob = f"{client_name or ''} {platform or ''}".lower()
    return any(marker in blob for marker in SCANNER_CLIENT_MARKERS)


def _is_bot_suspected(sent_at, occurred_at_str, client_name, platform) -> int:
    if _looks_like_scanner(client_name, platform):
        return 1
    if sent_at and occurred_at_str:
        try:
            occurred = datetime.strptime(occurred_at_str, "%Y-%m-%d %H:%M:%S")
            delta = (occurred - sent_at).total_seconds()
            if 0 <= delta < BOT_WINDOW_SECONDS:
                return 1
        except Exception:
            pass
    return 0


def _norm_dt(val):
    """Normalize ISO datetime from Postmark to MySQL-safe 'YYYY-MM-DD HH:MM:SS'."""
    if not val:
        return None
    return val.replace("Z", "").replace("T", " ")[:19]


def _resolve_job_id(db: Session, message_id: str):
    """Look up our internal job_id from the Postmark MessageID."""
    if not message_id:
        return None
    row = db.execute(
        text("SELECT job_id FROM email_job_messages WHERE postmark_message_id = :mid"),
        {"mid": message_id},
    ).fetchone()
    return row[0] if row else None


def _resolve_sent_at(db: Session, message_id: str):
    """Look up when we sent this message (UTC), to detect implausibly-fast opens/clicks."""
    if not message_id:
        return None
    row = db.execute(
        text("SELECT sent_at FROM email_job_messages WHERE postmark_message_id = :mid"),
        {"mid": message_id},
    ).fetchone()
    return row[0] if row else None


_V2_COLS_AVAILABLE: bool | None = None   # None = unknown; True/False after first check
_V3_COLS_AVAILABLE: bool | None = None   # is_bot_suspected — same lazy-check pattern


def _insert_event(db: Session, params: dict):
    """
    Insert a row into email_events.

    Tries the full v3 INSERT (adds is_bot_suspected) first, then falls back to
    v2 (raw_payload / bounce_type / bounce_description, no bot flag), then to
    the original v1 column set — whichever columns actually exist — so events
    are never lost if a migration hasn't been run yet.
    """
    global _V2_COLS_AVAILABLE, _V3_COLS_AVAILABLE

    # ── Try v3 INSERT (with is_bot_suspected) ───────────────────────────────
    if _V3_COLS_AVAILABLE is not False:
        try:
            db.execute(
                text("""
                    INSERT INTO email_events
                        (postmark_message_id, job_id, recipient_email, event_type,
                         is_first_event, click_url, platform, client_name, os_name,
                         read_seconds, is_bot_suspected, occurred_at,
                         raw_payload, bounce_type, bounce_description)
                    VALUES
                        (:mid, :job_id, :recipient, :event_type,
                         :is_first, :click_url, :platform, :client_name, :os_name,
                         :read_seconds, :is_bot_suspected, :occurred_at,
                         :raw_payload, :bounce_type, :bounce_description)
                """),
                params,
            )
            db.commit()
            _V3_COLS_AVAILABLE = True
            _V2_COLS_AVAILABLE = True
            return
        except Exception as exc:
            db.rollback()
            err = str(exc).lower()
            if "unknown column" in err or "1054" in err or "doesn't exist" in err:
                logger.warning(
                    "email_events is_bot_suspected column missing — falling back. "
                    "Run migrate_email_events_v3.py to enable bot/scanner filtering."
                )
                _V3_COLS_AVAILABLE = False
            else:
                raise  # real DB error — let the caller handle it

    # ── Try v2 INSERT ─────────────────────────────────────────────────────────
    if _V2_COLS_AVAILABLE is not False:
        try:
            db.execute(
                text("""
                    INSERT INTO email_events
                        (postmark_message_id, job_id, recipient_email, event_type,
                         is_first_event, click_url, platform, client_name, os_name,
                         read_seconds, occurred_at,
                         raw_payload, bounce_type, bounce_description)
                    VALUES
                        (:mid, :job_id, :recipient, :event_type,
                         :is_first, :click_url, :platform, :client_name, :os_name,
                         :read_seconds, :occurred_at,
                         :raw_payload, :bounce_type, :bounce_description)
                """),
                params,
            )
            db.commit()
            _V2_COLS_AVAILABLE = True
            return
        except Exception as exc:
            db.rollback()
            err = str(exc).lower()
            # Column missing → fall through to v1 INSERT
            if "unknown column" in err or "1054" in err or "doesn't exist" in err:
                logger.warning(
                    "email_events v2 columns missing — falling back to v1 INSERT. "
                    "Run migrate_email_events_v2.py to enable full analytics."
                )
                _V2_COLS_AVAILABLE = False
            else:
                raise  # real DB error — let the caller handle it

    # ── Fallback v1 INSERT (no raw_payload / bounce_type / bounce_description) ─
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
        params,
    )
    db.commit()


def _base_params(payload: dict, db: Session) -> dict:
    """Fields shared by every event type."""
    message_id = payload.get("MessageID", "")
    return {
        "mid": message_id,
        "job_id": _resolve_job_id(db, message_id),
        "raw_payload": json.dumps(payload),
        # per-type handlers override these as needed
        "recipient": "",
        "event_type": "unknown",
        "is_first": 0,
        "click_url": None,
        "platform": None,
        "client_name": None,
        "os_name": None,
        "read_seconds": None,
        "is_bot_suspected": 0,
        "occurred_at": None,
        "bounce_type": None,
        "bounce_description": None,
    }


# ─── Per-type handlers ────────────────────────────────────────────────────────

def _handle_delivery(payload: dict, db: Session):
    params = _base_params(payload, db)
    params.update(
        event_type="delivery",
        recipient=payload.get("Recipient") or payload.get("Email") or "",
        occurred_at=_norm_dt(payload.get("DeliveredAt") or payload.get("ReceivedAt")),
    )
    _insert_event(db, params)


def _handle_open(payload: dict, db: Session):
    client = payload.get("Client") or {}
    os_info = payload.get("OS") or {}
    message_id = payload.get("MessageID", "")
    occurred_at = _norm_dt(payload.get("ReceivedAt"))
    params = _base_params(payload, db)
    params.update(
        event_type="open",
        recipient=payload.get("Recipient") or "",
        occurred_at=occurred_at,
        is_first=1 if payload.get("FirstOpen") else 0,
        platform=payload.get("Platform"),
        client_name=client.get("Name"),
        os_name=os_info.get("Name"),
        read_seconds=payload.get("ReadSeconds"),
        is_bot_suspected=_is_bot_suspected(
            _resolve_sent_at(db, message_id), occurred_at, client.get("Name"), payload.get("Platform")
        ),
    )
    _insert_event(db, params)


def _handle_click(payload: dict, db: Session):
    client = payload.get("Client") or {}
    os_info = payload.get("OS") or {}
    message_id = payload.get("MessageID", "")
    occurred_at = _norm_dt(payload.get("ReceivedAt"))
    params = _base_params(payload, db)
    params.update(
        event_type="click",
        recipient=payload.get("Recipient") or "",
        occurred_at=occurred_at,
        is_first=1 if payload.get("FirstClick") else 0,
        click_url=payload.get("OriginalLink"),
        platform=payload.get("Platform"),
        client_name=client.get("Name"),
        os_name=os_info.get("Name"),
        is_bot_suspected=_is_bot_suspected(
            _resolve_sent_at(db, message_id), occurred_at, client.get("Name"), payload.get("Platform")
        ),
    )
    _insert_event(db, params)


def _handle_bounce(payload: dict, db: Session):
    params = _base_params(payload, db)
    params.update(
        event_type="bounce",
        # Bounce events use Email, not Recipient
        recipient=payload.get("Email") or payload.get("Recipient") or "",
        occurred_at=_norm_dt(payload.get("BouncedAt") or payload.get("ReceivedAt")),
        bounce_type=str(payload.get("Type", ""))[:60] if payload.get("Type") is not None else None,
        bounce_description=payload.get("Description"),
    )
    _insert_event(db, params)


def _handle_spam(payload: dict, db: Session):
    params = _base_params(payload, db)
    params.update(
        event_type="spam",
        # SpamComplaint also uses Email
        recipient=payload.get("Email") or payload.get("Recipient") or "",
        occurred_at=_norm_dt(payload.get("BouncedAt") or payload.get("ReceivedAt")),
        bounce_type=str(payload.get("Type", ""))[:60] if payload.get("Type") is not None else None,
    )
    _insert_event(db, params)


def _handle_subscription_change(payload: dict, db: Session):
    params = _base_params(payload, db)
    params.update(
        event_type="unsubscribe",
        recipient=payload.get("Recipient") or payload.get("Email") or "",
        occurred_at=_norm_dt(payload.get("ChangedAt") or payload.get("ReceivedAt")),
    )
    _insert_event(db, params)


def _handle_unknown(payload: dict, db: Session):
    """Persist any unrecognised event type so no data is lost."""
    record_type = payload.get("RecordType", "unknown")
    params = _base_params(payload, db)
    params.update(
        event_type=f"unknown:{record_type}"[:60],
        recipient=(
            payload.get("Recipient")
            or payload.get("Email")
            or ""
        ),
        occurred_at=_norm_dt(
            payload.get("ReceivedAt")
            or payload.get("DeliveredAt")
            or payload.get("BouncedAt")
            or payload.get("ChangedAt")
        ),
    )
    _insert_event(db, params)


# ─── Router ────────────────────────────────────────────────────────────────────

_HANDLERS = {
    "Delivery": _handle_delivery,
    "Open": _handle_open,
    "Click": _handle_click,
    "Bounce": _handle_bounce,
    "SpamComplaint": _handle_spam,
    "SubscriptionChange": _handle_subscription_change,
}


@router.post("/email-webhooks")
async def receive_postmark_webhook(
    request: Request,
    secret: str = Query(default=""),
    db: Session = Depends(get_db),
):
    """
    Postmark calls this endpoint for every tracked event.
    This handler ALWAYS returns 200 so Postmark never retries unnecessarily.
    Errors are logged but never surfaced as HTTP 500.
    """
    # ── Secret validation ─────────────────────────────────────────────────────
    # Always enforce the secret — if WEBHOOK_SECRET is not configured, reject all requests
    # to prevent unauthenticated event injection
    if not WEBHOOK_SECRET:
        logger.error("WEBHOOK_SECRET is not configured — rejecting webhook request")
        raise HTTPException(status_code=403, detail="Webhook secret not configured on server")
    if secret != WEBHOOK_SECRET:
        raise HTTPException(status_code=401, detail="Invalid webhook secret")

    # ── Parse JSON body ───────────────────────────────────────────────────────
    try:
        payload = await request.json()
    except Exception as exc:
        logger.warning(f"Postmark webhook: failed to parse JSON body: {exc}")
        # Return 200 so Postmark doesn't keep retrying a malformed payload
        return {"status": "error", "reason": "invalid JSON"}

    record_type = payload.get("RecordType", "")
    logger.debug(f"Postmark webhook received: RecordType={record_type!r} payload={json.dumps(payload)}")

    # ── Dispatch to per-type handler ──────────────────────────────────────────
    handler = _HANDLERS.get(record_type, _handle_unknown)

    try:
        handler(payload, db)
        logger.info(
            f"email_events: stored '{record_type}' for MessageID={payload.get('MessageID')!r}"
        )
        return {"status": "ok", "record_type": record_type}
    except Exception as exc:
        db.rollback()
        logger.error(
            f"email_events: DB error storing '{record_type}' "
            f"MessageID={payload.get('MessageID')!r}: {exc}",
            exc_info=True,
        )
        # Always 200 — Postmark must not retry because of our DB issues
        return {"status": "error", "reason": "db_error", "record_type": record_type}
