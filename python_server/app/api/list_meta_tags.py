"""
Meta Tags API for Contact Lists

GET    /api/contact-lists/{list_id}/meta-tags              — all tags (defaults + custom)
POST   /api/contact-lists/{list_id}/meta-tags              — add custom tag
PUT    /api/contact-lists/{list_id}/meta-tags/{tag_key}    — rename tag label
DELETE /api/contact-lists/{list_id}/meta-tags/{tag_key}    — delete custom tag
GET    /api/contact-lists/{list_id}/csv-template           — download CSV template
"""
import re
from fastapi import APIRouter, HTTPException, Body, Depends
from fastapi.responses import StreamingResponse
from typing import Dict, Any
from sqlalchemy import text
from sqlalchemy.orm import Session
import io

from app.database import get_db
from app.schemas import UserOut
from app.dependencies.security import get_current_user

router = APIRouter()

# Default tags are always present for every list (not stored in DB)
DEFAULT_TAGS = [
    {"tag_key": "first_name", "tag_label": "First Name", "is_default": True, "display_order": 0},
    {"tag_key": "last_name",  "tag_label": "Last Name",  "is_default": True, "display_order": 1},
    {"tag_key": "email",      "tag_label": "Email",       "is_default": True, "display_order": 2},
    {"tag_key": "phone",      "tag_label": "Phone",       "is_default": True, "display_order": 3},
]
RESERVED_KEYS = {t["tag_key"] for t in DEFAULT_TAGS}


def _make_key(label: str) -> str:
    key = label.lower().strip()
    key = re.sub(r'\s+', '_', key)
    key = re.sub(r'[^a-z0-9_]', '', key)
    return key[:50]


def _verify_list_access(db: Session, list_id: int, cid):
    row = db.execute(
        text("SELECT id FROM contact_lists WHERE id=:lid AND (customer_id=:cid OR :cid IS NULL)"),
        {"lid": list_id, "cid": cid},
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="List not found")


# ── GET meta tags ─────────────────────────────────────────────────────────────

@router.get("/contact-lists/{list_id}/meta-tags")
def get_meta_tags(
    list_id: int,
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    _verify_list_access(db, list_id, current_user.customer_id)
    rows = db.execute(
        text("SELECT tag_key, tag_label, display_order FROM list_meta_tags "
             "WHERE list_id=:lid ORDER BY display_order, id"),
        {"lid": list_id},
    ).fetchall()
    custom = [{"tag_key": r.tag_key, "tag_label": r.tag_label, "is_default": False,
               "display_order": r.display_order} for r in rows]
    return DEFAULT_TAGS + custom


# ── POST add custom tag ───────────────────────────────────────────────────────

@router.post("/contact-lists/{list_id}/meta-tags")
def add_meta_tag(
    list_id: int,
    req: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    _verify_list_access(db, list_id, current_user.customer_id)

    label = (req.get("tag_label") or "").strip()
    if not label:
        raise HTTPException(status_code=400, detail="tag_label is required")

    tag_key = req.get("tag_key") or _make_key(label)
    if not tag_key:
        raise HTTPException(status_code=400, detail="Could not derive a valid tag key from label")
    if tag_key in RESERVED_KEYS:
        raise HTTPException(status_code=400, detail=f"'{tag_key}' is a reserved default tag")

    existing = db.execute(
        text("SELECT id FROM list_meta_tags WHERE list_id=:lid AND tag_key=:key"),
        {"lid": list_id, "key": tag_key},
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Tag key '{tag_key}' already exists for this list")

    max_order = db.execute(
        text("SELECT COALESCE(MAX(display_order), 3) FROM list_meta_tags WHERE list_id=:lid"),
        {"lid": list_id},
    ).scalar()

    db.execute(text("""
        INSERT INTO list_meta_tags (list_id, customer_id, tag_key, tag_label, display_order)
        VALUES (:lid, :cid, :key, :label, :ord)
    """), {
        "lid": list_id,
        "cid": current_user.customer_id,
        "key": tag_key,
        "label": label,
        "ord": (max_order or 0) + 1,
    })
    db.commit()
    return {"tag_key": tag_key, "tag_label": label, "is_default": False}


# ── PUT rename tag ────────────────────────────────────────────────────────────

@router.put("/contact-lists/{list_id}/meta-tags/{tag_key}")
def rename_meta_tag(
    list_id: int,
    tag_key: str,
    req: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    _verify_list_access(db, list_id, current_user.customer_id)
    if tag_key in RESERVED_KEYS:
        raise HTTPException(status_code=400, detail="Cannot rename a default tag")

    label = (req.get("tag_label") or "").strip()
    if not label:
        raise HTTPException(status_code=400, detail="tag_label is required")

    db.execute(
        text("UPDATE list_meta_tags SET tag_label=:label WHERE list_id=:lid AND tag_key=:key"),
        {"label": label, "lid": list_id, "key": tag_key},
    )
    db.commit()
    return {"tag_key": tag_key, "tag_label": label}


# ── DELETE custom tag ─────────────────────────────────────────────────────────

@router.delete("/contact-lists/{list_id}/meta-tags/{tag_key}")
def delete_meta_tag(
    list_id: int,
    tag_key: str,
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    _verify_list_access(db, list_id, current_user.customer_id)
    if tag_key in RESERVED_KEYS:
        raise HTTPException(status_code=400, detail="Cannot delete a default tag")

    db.execute(
        text("DELETE FROM list_meta_tags WHERE list_id=:lid AND tag_key=:key"),
        {"lid": list_id, "key": tag_key},
    )
    db.execute(
        text("DELETE FROM list_member_meta_values WHERE list_id=:lid AND tag_key=:key"),
        {"lid": list_id, "key": tag_key},
    )
    db.commit()
    return {"message": "Tag deleted"}


# ── GET CSV template ──────────────────────────────────────────────────────────

@router.get("/contact-lists/{list_id}/csv-template")
def download_csv_template(
    list_id: int,
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    list_row = db.execute(
        text("SELECT name FROM contact_lists WHERE id=:lid AND (customer_id=:cid OR :cid IS NULL)"),
        {"lid": list_id, "cid": current_user.customer_id},
    ).first()
    if not list_row:
        raise HTTPException(status_code=404, detail="List not found")

    custom_tags = db.execute(
        text("SELECT tag_key FROM list_meta_tags WHERE list_id=:lid ORDER BY display_order, id"),
        {"lid": list_id},
    ).fetchall()
    custom_keys = [r.tag_key for r in custom_tags]

    headers = ["email", "first_name", "last_name", "phone"] + custom_keys
    example = ["john@example.com", "John", "Doe", "555-0100"] + ["" for _ in custom_keys]

    csv_content = ",".join(headers) + "\n" + ",".join(example) + "\n"

    list_name = re.sub(r'[^a-z0-9]', '_', list_row.name.lower())
    filename = f"{list_name}_template.csv"

    return StreamingResponse(
        io.BytesIO(csv_content.encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
