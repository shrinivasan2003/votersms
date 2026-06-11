from fastapi import APIRouter, HTTPException, Body, Depends, Query, UploadFile, File
from typing import Dict, Any
from datetime import datetime, timezone
from sqlalchemy import text
from sqlalchemy.orm import Session
import os, shutil, uuid
from app.database import get_db
from app.dependencies.security import get_current_user
from app.schemas import UserOut
from app.utils.limits import check_limit
from app.utils.audit import log_audit
from app.utils.timezone import get_customer_timezone, naive_to_utc

UPLOAD_DIR = "/opt/votersms/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_TYPES = {
    "application/pdf":                                                   "pdf",
    "image/jpeg":                                                        "jpg",
    "image/png":                                                         "png",
    "image/gif":                                                         "gif",
    "image/webp":                                                        "webp",
    "application/msword":                                                "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.ms-excel":                                          "xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":"xlsx",
    "text/plain":                                                        "txt",
}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

router = APIRouter()


# ── Email Templates ────────────────────────────────────────────────────────────

@router.get("/email-templates")
def get_email_templates(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    try:
        if current_user.customer_id:
            result = db.execute(
                text("SELECT * FROM email_templates WHERE customer_id=:cid ORDER BY id DESC LIMIT :limit OFFSET :skip"),
                {"cid": current_user.customer_id, "limit": limit, "skip": skip},
            )
        else:
            result = db.execute(text("SELECT * FROM email_templates ORDER BY id DESC LIMIT :limit OFFSET :skip"), {"limit": limit, "skip": skip})
        return [dict(row._mapping) for row in result]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/email-templates")
def create_email_template(
    req: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    try:
        cid = current_user.customer_id
        if cid is not None:
            current_count = db.execute(
                text("SELECT COUNT(*) AS c FROM email_templates WHERE customer_id=:cid"),
                {"cid": cid},
            ).fetchone().c
            check_limit(db, cid, "max_email_templates", current_count, "Email Template")

        result = db.execute(
            text("INSERT INTO email_templates "
                 "(code, name, subject, body, status, customer_id, created_by, cc, bcc, reply_to, type) "
                 "VALUES (:code, :name, :subject, :body, :status, :customer_id, :created_by, :cc, :bcc, :reply_to, :type)"),
            {"code": req.get('code'), "name": req.get('name'), "subject": req.get('subject'),
             "body": req.get('body'), "status": req.get('status', 'Active'),
             "customer_id": current_user.customer_id, "created_by": current_user.id,
             "cc": req.get('cc') or None, "bcc": req.get('bcc') or None, "reply_to": req.get('reply_to') or None,
             "type": req.get('type', 'Plain Text')},
        )
        db.commit()
        new_id = result.lastrowid
        log_audit(db, current_user.customer_id, 'email_template', new_id, req.get('name'), 'CREATE', current_user, new_values=req)
        return {"id": new_id, **req}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/email-templates/{id}")
def update_email_template(
    id: int,
    req: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    try:
        old_row = db.execute(text("SELECT * FROM email_templates WHERE id=:id AND (customer_id=:cid OR :cid IS NULL)"), {"id": id, "cid": current_user.customer_id}).fetchone()
        old_vals = dict(old_row._mapping) if old_row else None
        db.execute(
            text("UPDATE email_templates SET code=:code, name=:name, subject=:subject, body=:body, status=:status, cc=:cc, bcc=:bcc, reply_to=:reply_to, type=:type WHERE id=:id AND (customer_id=:cid OR :cid IS NULL)"),
            {"code": req.get('code'), "name": req.get('name'), "subject": req.get('subject'),
             "body": req.get('body'), "status": req.get('status'), "id": id, "cid": current_user.customer_id,
             "cc": req.get('cc') or None, "bcc": req.get('bcc') or None, "reply_to": req.get('reply_to') or None,
             "type": req.get('type', 'Plain Text')},
        )
        db.commit()
        cid = (old_vals or {}).get('customer_id') or current_user.customer_id
        log_audit(db, cid, 'email_template', id, req.get('name'), 'UPDATE', current_user, old_values=old_vals, new_values=req)
        return {"message": "Updated successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/email-templates/{id}")
def delete_email_template(
    id: int,
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    try:
        old_row = db.execute(text("SELECT * FROM email_templates WHERE id=:id AND (customer_id=:cid OR :cid IS NULL)"), {"id": id, "cid": current_user.customer_id}).fetchone()
        old_vals = dict(old_row._mapping) if old_row else None

        # Detach any jobs that reference this template before deleting
        db.execute(text("UPDATE email_jobs SET template_id=NULL WHERE template_id=:id"), {"id": id})

        db.execute(text("DELETE FROM email_templates WHERE id=:id AND (customer_id=:cid OR :cid IS NULL)"), {"id": id, "cid": current_user.customer_id})
        db.commit()
        cid = (old_vals or {}).get('customer_id') or current_user.customer_id
        log_audit(db, cid, 'email_template', id, (old_vals or {}).get('name'), 'DELETE', current_user, old_values=old_vals)
        return {"message": "Deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ── Email Jobs ─────────────────────────────────────────────────────────────────

@router.get("/email-jobs")
def get_email_jobs(
    skip: int = Query(0, ge=0),
    limit: int = Query(200, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    try:
        result = db.execute(text("""
            SELECT j.*,
                p.name   AS precinct_name,
                t.name   AS template_name,
                pr.name  AS provider_name,
                cl.name  AS list_name,
                CONCAT(v.first_name, ' ', v.last_name) AS voter_name,
                COALESCE(
                    NULLIF(j.recipients, 0),
                    CASE
                        WHEN j.voter_id   IS NOT NULL THEN 1
                        WHEN j.list_id    IS NOT NULL THEN
                            (SELECT COUNT(*) FROM list_members lm
                             JOIN voters vv ON lm.voter_id = vv.id
                             WHERE lm.list_id = j.list_id
                               AND vv.email IS NOT NULL AND vv.email != ''
                               AND vv.status = 'Active')
                        WHEN j.precinct_id IS NOT NULL THEN
                            (SELECT COUNT(*) FROM voters vv
                             WHERE vv.precinct_id = j.precinct_id
                               AND vv.email IS NOT NULL AND vv.email != ''
                               AND vv.status = 'Active')
                        ELSE
                            (SELECT COUNT(*) FROM voters vv
                             WHERE vv.email IS NOT NULL AND vv.email != ''
                               AND vv.status = 'Active')
                    END
                ) AS recipients
            FROM email_jobs j
            LEFT JOIN precincts       p  ON j.precinct_id = p.id
            LEFT JOIN email_templates t  ON j.template_id = t.id
            LEFT JOIN email_providers pr ON j.provider_id = pr.id
            LEFT JOIN contact_lists   cl ON j.list_id     = cl.id
            LEFT JOIN voters          v  ON j.voter_id    = v.id
            WHERE (:cid IS NULL OR j.customer_id = :cid)
            ORDER BY j.id DESC
            LIMIT :limit OFFSET :skip
        """), {"cid": current_user.customer_id, "limit": limit, "skip": skip})
        return [dict(row._mapping) for row in result]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/email-jobs")
def create_email_job(
    req: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    try:
        cid = current_user.customer_id
        if cid is not None:
            current_count = db.execute(
                text("SELECT COUNT(*) AS c FROM email_jobs WHERE customer_id=:cid"),
                {"cid": cid},
            ).fetchone().c
            check_limit(db, cid, "max_email_jobs", current_count, "Email Job")

        # Convert scheduled_at from customer's timezone to UTC, then validate
        scheduled_at_str = req.get('scheduled_at') or None
        if scheduled_at_str:
            try:
                cust_tz = get_customer_timezone(db, current_user.customer_id)
                scheduled_at_str = naive_to_utc(scheduled_at_str.replace('Z', ''), cust_tz)
                # Normalise to plain "YYYY-MM-DDTHH:MM:SS" for MySQL DATETIME column
                scheduled_at_str = scheduled_at_str[:19]
                sched_dt = datetime.fromisoformat(scheduled_at_str).replace(tzinfo=timezone.utc)
                if sched_dt <= datetime.now(timezone.utc):
                    raise HTTPException(status_code=400, detail="Scheduled time must be in the future.")
            except HTTPException:
                raise
            except Exception:
                raise HTTPException(status_code=400, detail="Invalid scheduled_at format.")

        if req.get('provider_id'):
            p_row = db.execute(
                text("SELECT id FROM email_providers WHERE id=:id AND (customer_id=:cid OR :cid IS NULL)"),
                {"id": req['provider_id'], "cid": cid},
            ).fetchone()
            if not p_row:
                raise HTTPException(status_code=400, detail="Invalid provider")

        if req.get('list_id'):
            l_row = db.execute(
                text("SELECT id FROM contact_lists WHERE id=:id AND (customer_id=:cid OR :cid IS NULL)"),
                {"id": req['list_id'], "cid": cid},
            ).fetchone()
            if not l_row:
                raise HTTPException(status_code=400, detail="Invalid contact list")

        template_name = None
        if req.get('template_id'):
            t_row = db.execute(
                text("SELECT name FROM email_templates WHERE id=:id AND (customer_id=:cid OR :cid IS NULL)"),
                {"id": req['template_id'], "cid": cid},
            ).fetchone()
            template_name = t_row.name if t_row else None

        result = db.execute(
            text("""
                INSERT INTO email_jobs
                    (name, precinct_id, template_id, provider_id, scheduled_at, status,
                     list_id, voter_id, customer_id, created_by,
                     repeat_type, repeat_every, repeat_days, repeat_time, repeat_until,
                     repeat_dom, repeat_month)
                VALUES
                    (:name, :precinct_id, :template_id, :provider_id, :scheduled_at, :status,
                     :list_id, :voter_id, :customer_id, :created_by,
                     :repeat_type, :repeat_every, :repeat_days, :repeat_time, :repeat_until,
                     :repeat_dom, :repeat_month)
            """),
            {
                "name":         req.get('name') or template_name,
                "precinct_id":  req.get('precinct_id') or None,
                "template_id":  req.get('template_id'),
                "provider_id":  req.get('provider_id') or None,
                "scheduled_at": scheduled_at_str,
                "status":       'Pending',
                "list_id":      req.get('list_id')  or None,
                "voter_id":     req.get('voter_id') or None,
                "customer_id":  current_user.customer_id,
                "created_by":   current_user.id,
                "repeat_type":  req.get('repeat_type')  or None,
                "repeat_every": req.get('repeat_every') or 1,
                "repeat_days":  req.get('repeat_days')  or None,
                "repeat_time":  req.get('repeat_time')  or None,
                "repeat_until": req.get('repeat_until') or None,
                "repeat_dom":   req.get('repeat_dom')   or None,
                "repeat_month": req.get('repeat_month') or None,
            },
        )
        db.commit()
        job_id = result.lastrowid
        log_audit(db, current_user.customer_id, 'email_job', job_id,
                  req.get('name') or template_name, 'CREATE', current_user, new_values=req)

        return {"id": job_id, **req}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/email-jobs/{id}")
def delete_email_job(
    id: int,
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    try:
        old_row = db.execute(text("SELECT * FROM email_jobs WHERE id=:id AND (customer_id=:cid OR :cid IS NULL)"), {"id": id, "cid": current_user.customer_id}).fetchone()
        old_vals = dict(old_row._mapping) if old_row else None
        # Delete attachments from disk
        attachments = db.execute(text("SELECT filepath FROM email_job_attachments WHERE job_id=:id"), {"id": id}).fetchall()
        for a in attachments:
            try:
                if os.path.exists(a.filepath): os.remove(a.filepath)
            except: pass
        db.execute(text("DELETE FROM email_job_attachments WHERE job_id=:id"), {"id": id})
        db.execute(text("DELETE FROM email_jobs WHERE id=:id AND (customer_id=:cid OR :cid IS NULL)"), {"id": id, "cid": current_user.customer_id})
        db.commit()
        cid = (old_vals or {}).get('customer_id') or current_user.customer_id
        log_audit(db, cid, 'email_job', id, (old_vals or {}).get('name'), 'DELETE', current_user, old_values=old_vals)
        return {"message": "Deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ── Attachments ────────────────────────────────────────────────────────────────

@router.get("/email-jobs/{job_id}/attachments")
def list_attachments(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    # Verify job belongs to user
    job = db.execute(
        text("SELECT id FROM email_jobs WHERE id=:id AND (customer_id=:cid OR :cid IS NULL)"),
        {"id": job_id, "cid": current_user.customer_id}
    ).fetchone()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    rows = db.execute(
        text("SELECT id, job_id, filename, content_type, file_size, created_at FROM email_job_attachments WHERE job_id=:jid ORDER BY id"),
        {"jid": job_id}
    ).fetchall()
    return [dict(r._mapping) for r in rows]


@router.post("/email-jobs/{job_id}/attachments")
async def upload_attachment(
    job_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    # Verify job belongs to user
    job = db.execute(
        text("SELECT id FROM email_jobs WHERE id=:id AND (customer_id=:cid OR :cid IS NULL)"),
        {"id": job_id, "cid": current_user.customer_id}
    ).fetchone()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Validate file type
    content_type = file.content_type or ""
    if content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail=f"File type '{content_type}' not allowed. Allowed: PDF, Images, Word, Excel, Text.")

    # Read file and check size
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 10MB.")

    # Save file to disk
    ext       = ALLOWED_TYPES[content_type]
    safe_name = f"{uuid.uuid4().hex}.{ext}"
    filepath  = os.path.join(UPLOAD_DIR, safe_name)
    with open(filepath, "wb") as f:
        f.write(contents)

    # Save metadata to DB
    result = db.execute(
        text("""
            INSERT INTO email_job_attachments (job_id, filename, filepath, content_type, file_size)
            VALUES (:job_id, :filename, :filepath, :content_type, :file_size)
        """),
        {
            "job_id":       job_id,
            "filename":     file.filename,
            "filepath":     filepath,
            "content_type": content_type,
            "file_size":    len(contents),
        }
    )
    db.commit()
    return {
        "id":           result.lastrowid,
        "job_id":       job_id,
        "filename":     file.filename,
        "content_type": content_type,
        "file_size":    len(contents),
    }


@router.delete("/email-jobs/{job_id}/attachments/{attachment_id}")
def delete_attachment(
    job_id: int,
    attachment_id: int,
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    # Verify job belongs to user
    job = db.execute(
        text("SELECT id FROM email_jobs WHERE id=:id AND (customer_id=:cid OR :cid IS NULL)"),
        {"id": job_id, "cid": current_user.customer_id}
    ).fetchone()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    row = db.execute(
        text("SELECT filepath FROM email_job_attachments WHERE id=:aid AND job_id=:jid"),
        {"aid": attachment_id, "jid": job_id}
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Attachment not found")

    # Delete file from disk
    try:
        if os.path.exists(row.filepath): os.remove(row.filepath)
    except: pass

    db.execute(text("DELETE FROM email_job_attachments WHERE id=:aid"), {"aid": attachment_id})
    db.commit()
    return {"message": "Attachment deleted"}
