"""
Backfill audit_log with CREATE events for all pre-existing records.

Run once from the python_server/ directory:
    python backfill_audit_log.py

Safe to re-run — skips any entity that already has a CREATE entry in audit_logs.
"""
import json
import sys
from sqlalchemy import text
from app.database import SessionLocal


def _user_name(db, user_id):
    if not user_id:
        return None
    row = db.execute(
        text("SELECT name, first_name, last_name FROM users WHERE id=:id"),
        {"id": user_id},
    ).fetchone()
    if not row:
        return None
    full = f"{row.first_name or ''} {row.last_name or ''}".strip()
    return full or row.name or None


def _already_logged(db, entity_type, entity_id):
    row = db.execute(
        text("SELECT id FROM audit_logs WHERE entity_type=:et AND entity_id=:eid AND action='CREATE' LIMIT 1"),
        {"et": entity_type, "eid": entity_id},
    ).fetchone()
    return row is not None


def _insert(db, customer_id, entity_type, entity_id, entity_name, created_by, created_at, new_values):
    if customer_id is None:
        return False
    if _already_logged(db, entity_type, entity_id):
        return False
    db.execute(text("""
        INSERT INTO audit_logs
            (customer_id, entity_type, entity_id, entity_name, action,
             performed_by_id, performed_by_name, new_values, created_at)
        VALUES
            (:customer_id, :entity_type, :entity_id, :entity_name, 'CREATE',
             :performed_by_id, :performed_by_name, :new_values, :created_at)
    """), {
        "customer_id":      customer_id,
        "entity_type":      entity_type,
        "entity_id":        entity_id,
        "entity_name":      entity_name,
        "action":           "CREATE",
        "performed_by_id":  created_by,
        "performed_by_name": _user_name(db, created_by),
        "new_values":       json.dumps(new_values, default=str),
        "created_at":       created_at,
    })
    return True


def backfill():
    db = SessionLocal()
    counts = {}

    try:
        # ── SMS Templates ────────────────────────────────────────────────────
        n = 0
        for r in db.execute(text("SELECT * FROM sms_templates")).fetchall():
            r = dict(r._mapping)
            if _insert(db, r["customer_id"], "sms_template", r["id"], r.get("name"),
                       r.get("created_by"), r.get("created_at"),
                       {k: v for k, v in r.items() if k != "body"}):
                n += 1
        db.commit()
        counts["sms_templates"] = n

        # ── Email Templates ──────────────────────────────────────────────────
        n = 0
        for r in db.execute(text("SELECT * FROM email_templates")).fetchall():
            r = dict(r._mapping)
            if _insert(db, r["customer_id"], "email_template", r["id"], r.get("name"),
                       r.get("created_by"), r.get("created_at"),
                       {k: v for k, v in r.items() if k != "body"}):
                n += 1
        db.commit()
        counts["email_templates"] = n

        # ── WhatsApp Templates ───────────────────────────────────────────────
        n = 0
        for r in db.execute(text("SELECT * FROM whatsapp_templates")).fetchall():
            r = dict(r._mapping)
            if _insert(db, r["customer_id"], "whatsapp_template", r["id"], r.get("name"),
                       r.get("created_by"), r.get("created_at"),
                       {k: v for k, v in r.items() if k != "body"}):
                n += 1
        db.commit()
        counts["whatsapp_templates"] = n

        # ── SMS Jobs ─────────────────────────────────────────────────────────
        n = 0
        rows = db.execute(text("""
            SELECT j.*, t.name AS template_name
            FROM sms_jobs j
            LEFT JOIN sms_templates t ON j.template_id = t.id
        """)).fetchall()
        for r in rows:
            r = dict(r._mapping)
            entity_name = r.get("name") or r.get("template_name") or f"SMS Job #{r['id']}"
            payload = {k: v for k, v in r.items() if k != "template_name"}
            if _insert(db, r["customer_id"], "sms_job", r["id"], entity_name,
                       r.get("created_by"), r.get("created_at"), payload):
                n += 1
        db.commit()
        counts["sms_jobs"] = n

        # ── Email Jobs ───────────────────────────────────────────────────────
        n = 0
        rows = db.execute(text("""
            SELECT j.*, t.name AS template_name
            FROM email_jobs j
            LEFT JOIN email_templates t ON j.template_id = t.id
        """)).fetchall()
        for r in rows:
            r = dict(r._mapping)
            entity_name = r.get("name") or r.get("template_name") or f"Email Job #{r['id']}"
            payload = {k: v for k, v in r.items() if k != "template_name"}
            if _insert(db, r["customer_id"], "email_job", r["id"], entity_name,
                       r.get("created_by"), r.get("created_at"), payload):
                n += 1
        db.commit()
        counts["email_jobs"] = n

        # ── WhatsApp Jobs ────────────────────────────────────────────────────
        n = 0
        rows = db.execute(text("""
            SELECT j.*, t.name AS template_name
            FROM whatsapp_jobs j
            LEFT JOIN whatsapp_templates t ON j.template_id = t.id
        """)).fetchall()
        for r in rows:
            r = dict(r._mapping)
            entity_name = r.get("name") or r.get("template_name") or f"WhatsApp Job #{r['id']}"
            payload = {k: v for k, v in r.items() if k != "template_name"}
            if _insert(db, r["customer_id"], "whatsapp_job", r["id"], entity_name,
                       r.get("created_by"), r.get("created_at"), payload):
                n += 1
        db.commit()
        counts["whatsapp_jobs"] = n

        # ── Contact Lists ────────────────────────────────────────────────────
        n = 0
        for r in db.execute(text("SELECT * FROM contact_lists")).fetchall():
            r = dict(r._mapping)
            if _insert(db, r["customer_id"], "contact_list", r["id"], r.get("name"),
                       r.get("created_by"), r.get("created_at"), dict(r)):
                n += 1
        db.commit()
        counts["contact_lists"] = n

        # ── Voters ───────────────────────────────────────────────────────────
        # Voters don't have a created_by column — performer will be NULL
        n = 0
        for r in db.execute(text("SELECT * FROM voters")).fetchall():
            r = dict(r._mapping)
            entity_name = f"{r.get('first_name', '')} {r.get('last_name', '')}".strip() or f"Voter #{r['id']}"
            if _insert(db, r["customer_id"], "voter", r["id"], entity_name,
                       None, r.get("created_at"), dict(r)):
                n += 1
        db.commit()
        counts["voters"] = n

    except Exception as e:
        db.rollback()
        print(f"ERROR: {e}")
        sys.exit(1)
    finally:
        db.close()

    return counts


if __name__ == "__main__":
    print("Starting audit log backfill...")
    results = backfill()
    total = sum(results.values())
    print("\nBackfill complete:")
    for table, count in results.items():
        print(f"  {table:<25} {count:>5} record(s) inserted")
    print(f"\n  {'TOTAL':<25} {total:>5} audit event(s) added")
