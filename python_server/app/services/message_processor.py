from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import SessionLocal
from app.models import SmsJob, EmailJob, SmsProvider, EmailProvider, Precinct, Voter, SmsTemplate, EmailTemplate
from app.utils.limits import _get_limits_row, _monthly_sum, _emails_this_month, DEFAULTS
from twilio.rest import Client
import httpx
import logging
import re
from datetime import datetime

logger = logging.getLogger(__name__)

# ── Phone number normalisation ────────────────────────────────────────────────

def _normalize_phone(raw: str) -> str:
    """
    Strip formatting characters from a phone number and ensure it starts with +.
    Numbers should be stored with the full country code (e.g. +919876543210).
    """
    if not raw:
        return raw

    # Remove spaces, dashes, dots, parentheses — keep digits and leading +
    stripped = re.sub(r"[^\d+]", "", raw.strip())

    if not stripped:
        return raw

    # Already E.164
    if stripped.startswith("+"):
        return stripped

    # Has digits but no + — add it
    return f"+{stripped}"


# ── Shared helper: resolve recipient list ─────────────────────────────────────

def _resolve_voters(db, job, channel: str) -> list:
    """
    Returns a list of dicts with at minimum: id, first_name, last_name,
    plus 'email' or 'phone' depending on channel.

    Resolution priority:
      1. voter_id   → single recipient
      2. list_id    → contact-list members
      3. precinct_id → all active voters in precinct
      4. (none)     → master list (all active voters)
    """
    contact_field = "email" if channel == "email" else "phone"

    voter_id   = getattr(job, 'voter_id',   None)
    list_id    = getattr(job, 'list_id',    None)
    precinct_id = job.precinct_id

    if voter_id:
        rows = db.execute(text(
            f"SELECT id, first_name, last_name, email, phone "
            f"FROM voters WHERE id = :vid AND status = 'Active'"
        ), {"vid": voter_id}).fetchall()

    elif list_id:
        rows = db.execute(text(
            f"SELECT v.id, v.first_name, v.last_name, v.email, v.phone "
            f"FROM list_members lm "
            f"JOIN voters v ON lm.voter_id = v.id "
            f"WHERE lm.list_id = :lid "
            f"  AND v.{contact_field} IS NOT NULL AND v.{contact_field} != '' "
            f"  AND v.status = 'Active'"
        ), {"lid": list_id}).fetchall()

    elif precinct_id:
        rows = db.execute(text(
            f"SELECT id, first_name, last_name, email, phone "
            f"FROM voters "
            f"WHERE precinct_id = :pid "
            f"  AND {contact_field} IS NOT NULL AND {contact_field} != '' "
            f"  AND status = 'Active'"
        ), {"pid": precinct_id}).fetchall()

    else:
        # Master List — every active voter with the required contact field
        rows = db.execute(text(
            f"SELECT id, first_name, last_name, email, phone "
            f"FROM voters "
            f"WHERE {contact_field} IS NOT NULL AND {contact_field} != '' "
            f"  AND status = 'Active'"
        )).fetchall()

    return [dict(r._mapping) for r in rows]


# ── SMS ───────────────────────────────────────────────────────────────────────

def process_sms_job(job_id: int):
    db = SessionLocal()
    try:
        job = db.query(SmsJob).filter(SmsJob.id == job_id).first()
        if not job or job.status != "Pending":
            logger.info(f"SMS Job {job_id} not found or not pending.")
            return

        job.status = "Processing"
        db.commit()

        provider = db.query(SmsProvider).filter(SmsProvider.id == job.provider_id).first()
        if not provider:
            logger.error(f"Provider not found for SMS Job {job_id}")
            job.status = "Failed"; db.commit(); return

        template = db.query(SmsTemplate).filter(SmsTemplate.id == job.template_id).first()
        if not template:
            logger.error(f"Template not found for SMS Job {job_id}")
            job.status = "Failed"; db.commit(); return

        voters = _resolve_voters(db, job, "sms")

        if not voters:
            logger.warning(f"SMS Job {job_id}: no recipients resolved — marking Failed")
            job.status = "Failed"
            db.commit()
            return

        # Monthly volume guard
        cid = getattr(job, 'customer_id', None)
        if cid is not None:
            sms_used = _monthly_sum(db, "sms_jobs", cid)
            limits    = _get_limits_row(db, cid)
            max_sms   = limits.get("max_sms_per_month") or DEFAULTS.get("max_sms_per_month", 0)
            if max_sms > 0 and sms_used >= max_sms:
                logger.warning(
                    f"SMS Job {job_id}: monthly limit reached ({sms_used}/{max_sms}) — marking Failed"
                )
                job.status = "Failed"
                db.commit()
                return

        twilio_client = Client(provider.account_sid, provider.auth_token)
        success_count = 0
        failed_count  = 0

        for voter in voters:
            raw_phone      = voter.get("phone", "") or ""
            e164_phone     = _normalize_phone(raw_phone)

            first = voter.get("first_name") or ""
            last  = voter.get("last_name")  or ""
            full  = f"{first} {last}".strip()
            body  = (
                template.body
                # CamelCase — shown in UI
                .replace("{{FirstName}}", first)
                .replace("{{LastName}}",  last)
                .replace("{{FullName}}",  full)
                # snake_case — backward compat
                .replace("{{first_name}}", first)
                .replace("{{last_name}}",  last)
                .replace("{{full_name}}",  full)
            )
            try:
                message = twilio_client.messages.create(
                    body=body,
                    from_=provider.from_number,
                    to=e164_phone
                )
                logger.info(f"SMS Job {job_id}: sent {message.sid} to {e164_phone} (raw: {raw_phone})")
                success_count += 1
            except Exception as e:
                logger.error(f"SMS Job {job_id}: FAILED to send to {e164_phone} (raw: {raw_phone}): {e}")
                failed_count += 1

        total = success_count + failed_count
        if success_count == 0:
            job.status = "Failed"
            logger.error(f"SMS Job {job_id}: all {total} message(s) failed — marked Failed")
        else:
            job.status = "Completed"
            if failed_count:
                logger.warning(f"SMS Job {job_id}: {success_count}/{total} sent, {failed_count} failed")
            else:
                logger.info(f"SMS Job {job_id}: all {total} message(s) sent successfully")

        job.recipients = total
        db.commit()

    except Exception as e:
        logger.error(f"Error processing SMS job {job_id}: {e}")
        if 'job' in locals() and job:
            job.status = "Failed"; db.commit()
    finally:
        db.close()


# ── Email helpers ─────────────────────────────────────────────────────────────

def _text_to_html(text_body: str) -> str:
    """Wrap plain text in minimal HTML so Postmark's tracking pixel can be injected."""
    escaped = (
        text_body
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )
    html_body = escaped.replace("\r\n", "\n").replace("\r", "\n").replace("\n", "<br>\n")
    return (
        "<!DOCTYPE html><html><head><meta charset='utf-8'></head>"
        f"<body style='font-family:sans-serif;font-size:15px;line-height:1.6'>"
        f"{html_body}"
        "</body></html>"
    )


# ── Email ─────────────────────────────────────────────────────────────────────

def process_email_job(job_id: int):
    db = SessionLocal()
    try:
        job = db.query(EmailJob).filter(EmailJob.id == job_id).first()
        if not job or job.status != "Pending":
            logger.info(f"Email Job {job_id} not found or not pending.")
            return

        job.status = "Processing"
        db.commit()

        provider = db.query(EmailProvider).filter(EmailProvider.id == job.provider_id).first()
        if not provider:
            logger.error(f"Provider not found for Email Job {job_id}")
            job.status = "Failed"; db.commit(); return

        template = db.query(EmailTemplate).filter(EmailTemplate.id == job.template_id).first()
        if not template:
            logger.error(f"Template not found for Email Job {job_id}")
            job.status = "Failed"; db.commit(); return

        voters = _resolve_voters(db, job, "email")

        # Monthly volume guard
        email_cid = getattr(job, 'customer_id', None)
        if email_cid is not None:
            emails_used = _emails_this_month(db, email_cid)
            limits      = _get_limits_row(db, email_cid)
            max_emails  = limits.get("max_emails_per_month") or DEFAULTS.get("max_emails_per_month", 0)
            if max_emails > 0 and emails_used >= max_emails:
                logger.warning(
                    f"Email Job {job_id}: monthly limit reached ({emails_used}/{max_emails}) — marking Failed"
                )
                job.status = "Failed"
                db.commit()
                return

        postmark_api_url = "https://api.postmarkapp.com/email"
        http_headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "X-Postmark-Server-Token": provider.smtp_pass,
        }

        success_count = 0
        failed_count  = 0

        with httpx.Client() as client:
            for voter in voters:
                first     = voter.get("first_name") or ""
                last      = voter.get("last_name")  or ""
                full      = f"{first} {last}".strip()
                text_body = (
                    template.body
                    # CamelCase — shown in UI
                    .replace("{{FirstName}}", first)
                    .replace("{{LastName}}",  last)
                    .replace("{{FullName}}",  full)
                    # snake_case — backward compat
                    .replace("{{first_name}}", first)
                    .replace("{{last_name}}",  last)
                    .replace("{{full_name}}",  full)
                )
                html_body    = _text_to_html(text_body)
                from_address = (
                    f"{provider.smtp_user} <{provider.config_email}>"
                    if provider.smtp_user else provider.config_email
                )
                subject = getattr(template, "subject", None) or template.name

                # Build Reply-To with mailbox hash so inbound replies
                # auto-match back to this job + voter.
                # Format: reply+{job_id}_{voter_id}@inbound.yourdomain.com
                import os as _os
                _inbound_base = _os.getenv("INBOUND_EMAIL_ADDRESS", "")
                payload = {
                    "From":          from_address,
                    "To":            voter["email"],
                    "Subject":       subject,
                    "TextBody":      text_body,
                    "HtmlBody":      html_body,
                    "MessageStream": "broadcast",
                    "TrackOpens":    True,
                    "TrackLinks":    "HtmlAndText",
                }
                if _inbound_base and "@" in _inbound_base:
                    _local, _domain = _inbound_base.split("@", 1)
                    payload["ReplyTo"] = f"{_local}+{job_id}_{voter['id']}@{_domain}"

                try:
                    response = client.post(postmark_api_url, json=payload, headers=http_headers)
                    if response.status_code == 200:
                        resp_data  = response.json()
                        message_id = resp_data.get("MessageID")
                        if message_id:
                            db.execute(text("""
                                INSERT IGNORE INTO email_job_messages
                                    (job_id, voter_id, postmark_message_id, recipient_email)
                                VALUES (:job_id, :voter_id, :mid, :email)
                            """), {
                                "job_id":   job_id,
                                "voter_id": voter["id"],
                                "mid":      message_id,
                                "email":    voter["email"],
                            })
                            db.commit()
                        success_count += 1
                        logger.info(f"Sent email to {voter['email']} (MessageID: {message_id})")
                    else:
                        logger.error(f"Postmark error {response.status_code}: {response.text}")
                        failed_count += 1
                except Exception as e:
                    logger.error(f"Failed to send email to {voter['email']}: {e}")
                    failed_count += 1

        job.status     = "Completed"
        job.recipients = success_count + failed_count
        db.commit()

    except Exception as e:
        logger.error(f"Error processing Email job {job_id}: {e}")
        if "job" in locals() and job:
            job.status = "Failed"; db.commit()
    finally:
        db.close()
