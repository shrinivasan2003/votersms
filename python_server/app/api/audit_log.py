"""
Audit Log API — platform admin only.

GET  /api/admin/audit/organizations
     List all orgs with summary counts (jobs, templates, recipients, last activity).

GET  /api/admin/audit/organizations/{customer_id}/summary
     Summary stat-cards for one org.

GET  /api/admin/audit/organizations/{customer_id}/entities
     All entities grouped by type (jobs, templates, contact_lists) for one org.

GET  /api/admin/audit/organizations/{customer_id}/logs
     Paginated, filtered audit event log for one org.
     Query params: entity_type, action, from_date, to_date, search, page, page_size
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import UserOut
from app.dependencies.security import get_current_user

router = APIRouter()


def _require_platform_admin(current_user: UserOut = Depends(get_current_user)):
    if getattr(current_user, "role", "").lower() != "admin" or current_user.customer_id is not None:
        raise HTTPException(status_code=403, detail="Platform admin access required")
    return current_user


# ── Organization list with summary ───────────────────────────────────────────

@router.get("/admin/audit/organizations")
def list_audit_organizations(
    db: Session = Depends(get_db),
    _: UserOut = Depends(_require_platform_admin),
):
    rows = db.execute(text("""
        SELECT
            c.id            AS customer_id,
            c.name          AS organization_name,
            c.status,
            c.created_at,

            (SELECT COUNT(*) FROM sms_jobs       WHERE customer_id = c.id) AS total_sms_jobs,
            (SELECT COUNT(*) FROM email_jobs     WHERE customer_id = c.id) AS total_email_jobs,
            (SELECT COUNT(*) FROM whatsapp_jobs  WHERE customer_id = c.id) AS total_whatsapp_jobs,
            (SELECT COUNT(*) FROM sms_templates      WHERE customer_id = c.id) AS total_sms_templates,
            (SELECT COUNT(*) FROM email_templates    WHERE customer_id = c.id) AS total_email_templates,
            (SELECT COUNT(*) FROM whatsapp_templates WHERE customer_id = c.id) AS total_whatsapp_templates,
            (SELECT COUNT(*) FROM contact_lists  WHERE customer_id = c.id) AS total_contact_lists,
            (SELECT COUNT(*) FROM voters         WHERE customer_id = c.id) AS total_voters,

            GREATEST(
                COALESCE((SELECT MAX(created_at) FROM sms_jobs      WHERE customer_id = c.id), '1970-01-01'),
                COALESCE((SELECT MAX(created_at) FROM email_jobs    WHERE customer_id = c.id), '1970-01-01'),
                COALESCE((SELECT MAX(created_at) FROM whatsapp_jobs WHERE customer_id = c.id), '1970-01-01'),
                COALESCE((SELECT MAX(created_at) FROM sms_templates      WHERE customer_id = c.id), '1970-01-01'),
                COALESCE((SELECT MAX(created_at) FROM email_templates    WHERE customer_id = c.id), '1970-01-01'),
                COALESCE((SELECT MAX(created_at) FROM whatsapp_templates WHERE customer_id = c.id), '1970-01-01'),
                COALESCE(c.created_at, '1970-01-01')
            ) AS last_activity

        FROM customers c
        ORDER BY c.id DESC
    """)).fetchall()
    return [dict(r._mapping) for r in rows]


# ── Summary cards for one org ─────────────────────────────────────────────────

@router.get("/admin/audit/organizations/{customer_id}/summary")
def get_org_summary(
    customer_id: int,
    db: Session = Depends(get_db),
    _: UserOut = Depends(_require_platform_admin),
):
    org = db.execute(
        text("SELECT id, name, status, created_at FROM customers WHERE id=:cid"),
        {"cid": customer_id},
    ).fetchone()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    counts = db.execute(text("""
        SELECT
            (SELECT COUNT(*) FROM sms_jobs       WHERE customer_id=:cid) AS total_sms_jobs,
            (SELECT COUNT(*) FROM email_jobs     WHERE customer_id=:cid) AS total_email_jobs,
            (SELECT COUNT(*) FROM whatsapp_jobs  WHERE customer_id=:cid) AS total_whatsapp_jobs,
            (SELECT COUNT(*) FROM sms_templates      WHERE customer_id=:cid) AS total_sms_templates,
            (SELECT COUNT(*) FROM email_templates    WHERE customer_id=:cid) AS total_email_templates,
            (SELECT COUNT(*) FROM whatsapp_templates WHERE customer_id=:cid) AS total_whatsapp_templates,
            (SELECT COUNT(*) FROM contact_lists  WHERE customer_id=:cid) AS total_contact_lists,
            (SELECT COUNT(*) FROM voters         WHERE customer_id=:cid) AS total_voters,
            (SELECT COUNT(*) FROM audit_logs     WHERE customer_id=:cid) AS total_audit_events
    """), {"cid": customer_id}).fetchone()

    last_activity = db.execute(text("""
        SELECT GREATEST(
            COALESCE((SELECT MAX(created_at) FROM sms_jobs      WHERE customer_id=:cid), '1970-01-01'),
            COALESCE((SELECT MAX(created_at) FROM email_jobs    WHERE customer_id=:cid), '1970-01-01'),
            COALESCE((SELECT MAX(created_at) FROM whatsapp_jobs WHERE customer_id=:cid), '1970-01-01'),
            COALESCE((SELECT MAX(created_at) FROM sms_templates      WHERE customer_id=:cid), '1970-01-01'),
            COALESCE((SELECT MAX(created_at) FROM email_templates    WHERE customer_id=:cid), '1970-01-01'),
            COALESCE((SELECT MAX(created_at) FROM whatsapp_templates WHERE customer_id=:cid), '1970-01-01'),
            COALESCE((SELECT MAX(created_at) FROM contact_lists WHERE customer_id=:cid), '1970-01-01')
        ) AS last_activity
    """), {"cid": customer_id}).fetchone()

    return {
        **dict(org._mapping),
        **dict(counts._mapping),
        "total_jobs": (counts.total_sms_jobs or 0) + (counts.total_email_jobs or 0) + (counts.total_whatsapp_jobs or 0),
        "last_activity": last_activity.last_activity if last_activity else None,
    }


# ── All entities for one org (grouped by type) ───────────────────────────────

@router.get("/admin/audit/organizations/{customer_id}/entities")
def get_org_entities(
    customer_id: int,
    db: Session = Depends(get_db),
    _: UserOut = Depends(_require_platform_admin),
):
    org = db.execute(
        text("SELECT id FROM customers WHERE id=:cid"), {"cid": customer_id}
    ).fetchone()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    def _fetch(query, params):
        return [dict(r._mapping) for r in db.execute(text(query), params)]

    p = {"cid": customer_id}

    sms_jobs = _fetch("""
        SELECT j.id, j.name, j.status, j.created_at, j.scheduled_at,
               t.name AS template_name, u.name AS created_by_name,
               CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,'')) AS created_by_full
        FROM sms_jobs j
        LEFT JOIN sms_templates t ON j.template_id = t.id
        LEFT JOIN users u ON j.created_by = u.id
        WHERE j.customer_id=:cid ORDER BY j.id DESC
    """, p)

    email_jobs = _fetch("""
        SELECT j.id, j.name, j.status, j.created_at, j.scheduled_at,
               t.name AS template_name, u.name AS created_by_name,
               CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,'')) AS created_by_full
        FROM email_jobs j
        LEFT JOIN email_templates t ON j.template_id = t.id
        LEFT JOIN users u ON j.created_by = u.id
        WHERE j.customer_id=:cid ORDER BY j.id DESC
    """, p)

    whatsapp_jobs = _fetch("""
        SELECT j.id, j.name, j.status, j.created_at, j.scheduled_at,
               t.name AS template_name, u.name AS created_by_name,
               CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,'')) AS created_by_full
        FROM whatsapp_jobs j
        LEFT JOIN whatsapp_templates t ON j.template_id = t.id
        LEFT JOIN users u ON j.created_by = u.id
        WHERE j.customer_id=:cid ORDER BY j.id DESC
    """, p)

    sms_templates = _fetch("""
        SELECT t.id, t.name, t.code, t.status, t.created_at,
               u.name AS created_by_name,
               CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,'')) AS created_by_full
        FROM sms_templates t
        LEFT JOIN users u ON t.created_by = u.id
        WHERE t.customer_id=:cid ORDER BY t.id DESC
    """, p)

    email_templates = _fetch("""
        SELECT t.id, t.name, t.code, t.subject, t.status, t.created_at,
               u.name AS created_by_name,
               CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,'')) AS created_by_full
        FROM email_templates t
        LEFT JOIN users u ON t.created_by = u.id
        WHERE t.customer_id=:cid ORDER BY t.id DESC
    """, p)

    whatsapp_templates = _fetch("""
        SELECT t.id, t.name, t.code, t.status, t.created_at,
               u.name AS created_by_name,
               CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,'')) AS created_by_full
        FROM whatsapp_templates t
        LEFT JOIN users u ON t.created_by = u.id
        WHERE t.customer_id=:cid ORDER BY t.id DESC
    """, p)

    contact_lists = _fetch("""
        SELECT cl.id, cl.name, cl.status, cl.created_at,
               COUNT(lm.id) AS member_count,
               u.name AS created_by_name,
               CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,'')) AS created_by_full
        FROM contact_lists cl
        LEFT JOIN list_members lm ON cl.id = lm.list_id
        LEFT JOIN users u ON cl.created_by = u.id
        WHERE cl.customer_id=:cid
        GROUP BY cl.id, cl.name, cl.status, cl.created_at, u.name, u.first_name, u.last_name
        ORDER BY cl.id DESC
    """, p)

    voters = _fetch("""
        SELECT id, CONCAT(first_name,' ',last_name) AS name, email, phone, status, created_at
        FROM voters
        WHERE customer_id=:cid ORDER BY id DESC LIMIT 200
    """, p)

    return {
        "sms_jobs":           sms_jobs,
        "email_jobs":         email_jobs,
        "whatsapp_jobs":      whatsapp_jobs,
        "sms_templates":      sms_templates,
        "email_templates":    email_templates,
        "whatsapp_templates": whatsapp_templates,
        "contact_lists":      contact_lists,
        "voters":             voters,
    }


# ── Paginated audit event log for one org ────────────────────────────────────

@router.get("/admin/audit/organizations/{customer_id}/logs")
def get_org_audit_logs(
    customer_id: int,
    entity_type: Optional[str] = Query(None),
    action:      Optional[str] = Query(None),
    from_date:   Optional[str] = Query(None),
    to_date:     Optional[str] = Query(None),
    search:      Optional[str] = Query(None),
    page:        int = Query(1, ge=1),
    page_size:   int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _: UserOut  = Depends(_require_platform_admin),
):
    org = db.execute(
        text("SELECT id FROM customers WHERE id=:cid"), {"cid": customer_id}
    ).fetchone()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    conditions = ["customer_id = :cid"]
    params: dict = {"cid": customer_id}

    if entity_type:
        conditions.append("entity_type = :entity_type")
        params["entity_type"] = entity_type
    if action:
        conditions.append("action = :action")
        params["action"] = action
    if from_date:
        conditions.append("created_at >= :from_date")
        params["from_date"] = from_date
    if to_date:
        conditions.append("created_at <= :to_date")
        params["to_date"] = to_date + " 23:59:59"
    if search:
        conditions.append("(entity_name LIKE :search OR performed_by_name LIKE :search)")
        params["search"] = f"%{search}%"

    where = " AND ".join(conditions)
    offset = (page - 1) * page_size

    total_row = db.execute(
        text(f"SELECT COUNT(*) AS cnt FROM audit_logs WHERE {where}"), params
    ).fetchone()
    total = total_row.cnt if total_row else 0

    rows = db.execute(text(f"""
        SELECT id, entity_type, entity_id, entity_name, action,
               performed_by_id, performed_by_name, old_values, new_values, created_at
        FROM audit_logs
        WHERE {where}
        ORDER BY created_at DESC
        LIMIT :limit OFFSET :offset
    """), {**params, "limit": page_size, "offset": offset}).fetchall()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [dict(r._mapping) for r in rows],
    }
