from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import SessionLocal
from app.models import SmsJob, EmailJob, SmsProvider, EmailProvider, Precinct, Voter, SmsTemplate, EmailTemplate
from app.utils.limits import _get_limits_row, _monthly_sum, _emails_this_month, DEFAULTS
from app.utils.crypto import decrypt_field
from twilio.rest import Client
import httpx
import logging
import re
import calendar
import os
import base64
from datetime import datetime, timedelta

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


# ── Shared helpers ────────────────────────────────────────────────────────────

def _fetch_meta_values(db, list_id) -> dict:
    """Returns {voter_id: {tag_key: tag_value}} for all members of a contact list."""
    if not list_id:
        return {}
    rows = db.execute(text("""
        SELECT voter_id, tag_key, tag_value
        FROM list_member_meta_values
        WHERE list_id = :lid
    """), {"lid": list_id}).fetchall()
    result = {}
    for r in rows:
        result.setdefault(r.voter_id, {})[r.tag_key] = r.tag_value or ""
    return result


def _substitute(body: str, voter: dict, meta: dict) -> str:
    """Replace all {{placeholders}} in body with voter data + custom meta values."""
    first = voter.get("first_name") or ""
    last  = voter.get("last_name")  or ""
    full  = f"{first} {last}".strip()
    body = (
        body
        .replace("{{FirstName}}", first)
        .replace("{{LastName}}",  last)
        .replace("{{FullName}}",  full)
        .replace("{{first_name}}", first)
        .replace("{{last_name}}",  last)
        .replace("{{full_name}}",  full)
        .replace("{{email}}", voter.get("email") or "")
        .replace("{{phone}}", voter.get("phone") or "")
    )
    for tag_key, tag_value in meta.items():
        body = body.replace(f"{{{{{tag_key}}}}}", tag_value)
    return body


def _add_months(dt: datetime, months: int) -> datetime:
    """Add N calendar months to a datetime, clamping to the last valid day of the target month."""
    month = dt.month - 1 + months
    year  = dt.year + month // 12
    month = month % 12 + 1
    max_day = calendar.monthrange(year, month)[1]
    return dt.replace(year=year, month=month, day=min(dt.day, max_day))


def _calc_next_run(job):
    """Calculate the next scheduled_at for a recurring job based on the previous run time."""
    if not getattr(job, 'repeat_type', None):
        return None
    base  = job.scheduled_at or datetime.utcnow()
    every = int(getattr(job, 'repeat_every', None) or 1)
    rtype = job.repeat_type

    if rtype == 'alternateday':
        next_dt = base + timedelta(days=2)
    elif rtype == 'daily':
        next_dt = base + timedelta(days=every)
    elif rtype == 'weekly':
        next_dt = base + timedelta(weeks=every)
    elif rtype == 'monthly':
        next_dt = _add_months(base, every)
    elif rtype == 'quarterly':
        next_dt = _add_months(base, 3)
    elif rtype == 'yearly':
        try:
            next_dt = base.replace(year=base.year + 1)
        except ValueError:
            # Feb 29 in a leap year → use Feb 28 in non-leap
            next_dt = base.replace(year=base.year + 1, day=28)
    else:
        return None

    until = getattr(job, 'repeat_until', None)
    if until and next_dt.date() > until:
        return None
    return next_dt


def _spawn_next_email_job(db, job):
    """Create the next pending occurrence of a recurring email job."""
    next_run = _calc_next_run(job)
    if not next_run:
        logger.info(f"Email Job {job.id}: repeat cycle ended (past repeat_until or unknown type)")
        return
    original_parent = getattr(job, 'parent_job_id', None) or job.id
    db.execute(text("""
        INSERT INTO email_jobs
            (name, precinct_id, template_id, provider_id, list_id, voter_id,
             scheduled_at, status, customer_id, created_by,
             repeat_type, repeat_every, repeat_days, repeat_time, repeat_until, parent_job_id,
             repeat_dom, repeat_month)
        VALUES
            (:name, :precinct_id, :template_id, :provider_id, :list_id, :voter_id,
             :scheduled_at, 'Pending', :customer_id, :created_by,
             :repeat_type, :repeat_every, :repeat_days, :repeat_time, :repeat_until, :parent_job_id,
             :repeat_dom, :repeat_month)
    """), {
        "name":          job.name,
        "precinct_id":   job.precinct_id,
        "template_id":   job.template_id,
        "provider_id":   job.provider_id,
        "list_id":       getattr(job, 'list_id', None),
        "voter_id":      getattr(job, 'voter_id', None),
        "scheduled_at":  next_run,
        "customer_id":   getattr(job, 'customer_id', None),
        "created_by":    getattr(job, 'created_by', None),
        "repeat_type":   job.repeat_type,
        "repeat_every":  getattr(job, 'repeat_every', 1),
        "repeat_days":   getattr(job, 'repeat_days', None),
        "repeat_time":   getattr(job, 'repeat_time', None),
        "repeat_until":  getattr(job, 'repeat_until', None),
        "parent_job_id": original_parent,
        "repeat_dom":    getattr(job, 'repeat_dom', None),
        "repeat_month":  getattr(job, 'repeat_month', None),
    })
    db.commit()
    logger.info(f"Email Job {job.id}: spawned next occurrence scheduled at {next_run}")


def _spawn_next_sms_job(db, job):
    """Create the next pending occurrence of a recurring SMS job."""
    next_run = _calc_next_run(job)
    if not next_run:
        logger.info(f"SMS Job {job.id}: repeat cycle ended")
        return
    original_parent = getattr(job, 'parent_job_id', None) or job.id
    db.execute(text("""
        INSERT INTO sms_jobs
            (name, precinct_id, template_id, provider_id, list_id, voter_id,
             scheduled_at, status, customer_id, created_by,
             repeat_type, repeat_every, repeat_days, repeat_time, repeat_until, parent_job_id,
             repeat_dom, repeat_month)
        VALUES
            (:name, :precinct_id, :template_id, :provider_id, :list_id, :voter_id,
             :scheduled_at, 'Pending', :customer_id, :created_by,
             :repeat_type, :repeat_every, :repeat_days, :repeat_time, :repeat_until, :parent_job_id,
             :repeat_dom, :repeat_month)
    """), {
        "name":          getattr(job, 'name', None),
        "precinct_id":   job.precinct_id,
        "template_id":   job.template_id,
        "provider_id":   job.provider_id,
        "list_id":       getattr(job, 'list_id', None),
        "voter_id":      getattr(job, 'voter_id', None),
        "scheduled_at":  next_run,
        "customer_id":   getattr(job, 'customer_id', None),
        "created_by":    getattr(job, 'created_by', None),
        "repeat_type":   job.repeat_type,
        "repeat_every":  getattr(job, 'repeat_every', 1),
        "repeat_days":   getattr(job, 'repeat_days', None),
        "repeat_time":   getattr(job, 'repeat_time', None),
        "repeat_until":  getattr(job, 'repeat_until', None),
        "parent_job_id": original_parent,
        "repeat_dom":    getattr(job, 'repeat_dom', None),
        "repeat_month":  getattr(job, 'repeat_month', None),
    })
    db.commit()
    logger.info(f"SMS Job {job.id}: spawned next occurrence scheduled at {next_run}")


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

        meta_by_voter = _fetch_meta_values(db, getattr(job, 'list_id', None))

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

        twilio_client = Client(decrypt_field(provider.account_sid), decrypt_field(provider.auth_token))
        success_count = 0
        failed_count  = 0

        for voter in voters:
            raw_phone  = voter.get("phone", "") or ""
            e164_phone = _normalize_phone(raw_phone)
            body       = _substitute(template.body, voter, meta_by_voter.get(voter["id"], {}))
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

        # Spawn next occurrence if this is a recurring job
        if getattr(job, 'repeat_type', None):
            _spawn_next_sms_job(db, job)

    except Exception as e:
        logger.error(f"Error processing SMS job {job_id}: {e}")
        if 'job' in locals() and job:
            job.status = "Failed"; db.commit()
    finally:
        db.close()


# ── Email helpers ─────────────────────────────────────────────────────────────

def _html_to_plain(html_body: str) -> str:
    """Strip HTML tags from Quill-generated HTML to get plain text."""
    # Replace block-level line breaks before stripping tags
    text = re.sub(r'<br\s*/?>', '\n', html_body, flags=re.IGNORECASE)
    text = re.sub(r'</p>', '\n', text, flags=re.IGNORECASE)
    text = re.sub(r'<[^>]+>', '', text)
    # Decode common HTML entities
    text = text.replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>').replace('&nbsp;', ' ').replace('&#39;', "'").replace('&quot;', '"')
    return text.strip()


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
        meta_by_voter = _fetch_meta_values(db, getattr(job, 'list_id', None))

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
            "X-Postmark-Server-Token": decrypt_field(provider.smtp_pass),
        }

        # ── Load attachments (template-level + job-level, merged) ─────────
        tpl_att_rows = db.execute(
            text("SELECT filename, filepath, content_type FROM email_template_attachments WHERE template_id=:tid"),
            {"tid": template.id}
        ).fetchall()
        job_att_rows = db.execute(
            text("SELECT filename, filepath, content_type FROM email_job_attachments WHERE job_id=:jid"),
            {"jid": job_id}
        ).fetchall()
        # Build attachment list: template attachments first, then job attachments.
        # Job attachments win on filename collision (they override template defaults).
        postmark_attachments = []
        seen_names = set()
        for att in list(tpl_att_rows) + list(job_att_rows):
            try:
                if att.filename in seen_names:
                    # Remove the earlier (template-level) entry so job-level wins
                    postmark_attachments = [a for a in postmark_attachments if a["Name"] != att.filename]
                if os.path.exists(att.filepath):
                    with open(att.filepath, "rb") as _f:
                        encoded = base64.b64encode(_f.read()).decode("utf-8")
                    seen_names.add(att.filename)
                    postmark_attachments.append({
                        "Name":        att.filename,
                        "Content":     encoded,
                        "ContentType": att.content_type,
                    })
            except Exception as att_err:
                logger.warning(f"Could not load attachment {att.filename}: {att_err}")

        success_count = 0
        failed_count  = 0

        with httpx.Client() as client:
            for voter in voters:
                substituted = _substitute(template.body, voter, meta_by_voter.get(voter["id"], {}))
                if getattr(template, "type", "Plain Text") == "HTML":
                    html_body = substituted
                    text_body = ""
                else:
                    # Quill editor stores rich text as HTML; strip tags for true plain text delivery
                    text_body = _html_to_plain(substituted)
                    html_body = ""
                from_address = (
                    f"{provider.smtp_user} <{provider.config_email}>"
                    if provider.smtp_user else provider.config_email
                )
                raw_subject = getattr(template, "subject", None) or template.name
                subject = _substitute(raw_subject, voter, meta_by_voter.get(voter["id"], {}))

                _inbound_base = os.getenv("INBOUND_EMAIL_ADDRESS", "")
                payload = {
                    "From":          from_address,
                    "To":            voter["email"],
                    "Subject":       subject,
                    "TextBody":      text_body,
                    "HtmlBody":      html_body,
                    "MessageStream": "outbound",
                    "TrackOpens":    True,
                    "TrackLinks":    "HtmlAndText",
                }
                if postmark_attachments:
                    payload["Attachments"] = postmark_attachments
                # CC / BCC from template (applied to every sent message)
                if getattr(template, 'cc', None):
                    payload["Cc"] = template.cc
                if getattr(template, 'bcc', None):
                    payload["Bcc"] = template.bcc
                # Reply-To: inbound routing hash takes precedence; fall back to template reply_to
                if _inbound_base and "@" in _inbound_base:
                    _local, _domain = _inbound_base.split("@", 1)
                    payload["ReplyTo"] = f"{_local}+{job_id}_{voter['id']}@{_domain}"
                elif getattr(template, 'reply_to', None):
                    payload["ReplyTo"] = template.reply_to

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

        total = success_count + failed_count
        if success_count == 0:
            job.status = "Failed"
            logger.error(f"Email Job {job_id}: all {total} message(s) failed — marked Failed")
        else:
            job.status = "Completed"
            if failed_count:
                logger.warning(f"Email Job {job_id}: {success_count}/{total} sent, {failed_count} failed")
        job.recipients = total
        db.commit()

        # Spawn next occurrence if this is a recurring job
        if getattr(job, 'repeat_type', None):
            _spawn_next_email_job(db, job)

    except Exception as e:
        logger.error(f"Error processing Email job {job_id}: {e}")
        if "job" in locals() and job:
            job.status = "Failed"; db.commit()
    finally:
        db.close()
