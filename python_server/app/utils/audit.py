import json
from sqlalchemy import text
from sqlalchemy.orm import Session


def log_audit(
    db: Session,
    customer_id: int,
    entity_type: str,
    entity_id,
    entity_name: str | None,
    action: str,
    user,
    old_values: dict | None = None,
    new_values: dict | None = None,
) -> None:
    """Append one row to audit_logs. Never raises — audit failure must not break the caller."""
    if customer_id is None:
        return
    performed_by_id = getattr(user, 'id', None)
    name_parts = [
        getattr(user, 'first_name', '') or '',
        getattr(user, 'last_name', '') or '',
    ]
    performed_by_name = (
        ' '.join(p for p in name_parts if p).strip()
        or getattr(user, 'name', None)
        or getattr(user, 'username', None)
    )
    try:
        db.execute(text("""
            INSERT INTO audit_logs
                (customer_id, entity_type, entity_id, entity_name, action,
                 performed_by_id, performed_by_name, old_values, new_values)
            VALUES
                (:customer_id, :entity_type, :entity_id, :entity_name, :action,
                 :performed_by_id, :performed_by_name, :old_values, :new_values)
        """), {
            "customer_id":      customer_id,
            "entity_type":      entity_type,
            "entity_id":        entity_id,
            "entity_name":      entity_name,
            "action":           action,
            "performed_by_id":  performed_by_id,
            "performed_by_name": performed_by_name,
            "old_values":  json.dumps(old_values)  if old_values  else None,
            "new_values":  json.dumps(new_values)  if new_values  else None,
        })
        db.commit()
    except Exception:
        pass
