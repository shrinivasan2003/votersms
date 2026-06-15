"""
Nadia AI — email template generation endpoints.

All routes require a valid customer JWT (enforced in main.py).
"""
from __future__ import annotations

import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.dependencies.security import get_current_user
from app.schemas import UserOut
from app.utils.limits import _get_limits_row, DEFAULTS
from app.utils.crypto import encrypt_field, decrypt_field
from app.utils.ai_providers import (
    PROVIDER_REGISTRY,
    generate_email_variations,
    validate_config,
    get_provider_info,
)

log = logging.getLogger(__name__)
router = APIRouter(prefix="/ai", tags=["Nadia AI"])


# ── Helpers ───────────────────────────────────────────────────────────────────

def _require_customer(current_user: UserOut) -> UserOut:
    if not current_user.customer_id:
        raise HTTPException(status_code=403, detail="Customer account required")
    return current_user


def _get_ai_config(db: Session, customer_id: int) -> dict | None:
    row = db.execute(
        text("SELECT * FROM customer_ai_config WHERE customer_id=:cid AND is_active=1"),
        {"cid": customer_id},
    ).fetchone()
    return dict(row._mapping) if row else None


def _log_usage(
    db: Session,
    customer_id: int,
    user_id: int | None,
    provider: str,
    model: str,
    usage: dict,
) -> None:
    db.execute(
        text("""
            INSERT INTO ai_usage_logs
                (customer_id, user_id, action, provider, model,
                 prompt_tokens, completion_tokens, total_tokens)
            VALUES
                (:cid, :uid, 'generate_email', :provider, :model,
                 :pt, :ct, :tt)
        """),
        {
            "cid":      customer_id,
            "uid":      user_id,
            "provider": provider,
            "model":    model,
            "pt":       usage.get("prompt_tokens", 0),
            "ct":       usage.get("completion_tokens", 0),
            "tt":       usage.get("total_tokens", 0),
        },
    )
    db.commit()


def _ai_usage_this_month(db: Session, customer_id: int) -> dict:
    r = db.execute(
        text("""
            SELECT
                COUNT(*)                       AS generations,
                COALESCE(SUM(total_tokens), 0) AS tokens
            FROM ai_usage_logs
            WHERE customer_id = :cid
              AND YEAR(created_at)  = YEAR(NOW())
              AND MONTH(created_at) = MONTH(NOW())
        """),
        {"cid": customer_id},
    ).fetchone()
    return {"generations": int(r[0] or 0), "tokens": int(r[1] or 0)} if r else {"generations": 0, "tokens": 0}


# ── Schemas ───────────────────────────────────────────────────────────────────

class GenerateRequest(BaseModel):
    context:             str        = Field(..., min_length=10, max_length=2000)
    available_variables: List[str]  = Field(default_factory=list)
    format:              str        = Field(default="Plain Text")


class VariationOut(BaseModel):
    subject: str
    body:    str


class GenerateResponse(BaseModel):
    variations: List[VariationOut]
    usage:      dict


class AIConfigIn(BaseModel):
    provider: str
    api_key:  str = Field(..., min_length=8)
    model:    str


class AIConfigOut(BaseModel):
    provider:   str
    api_key_masked: str
    model:      str
    base_url:   str
    is_active:  bool
    updated_at: Optional[str]


# ── Provider catalogue (public — no auth needed) ──────────────────────────────

@router.get("/providers")
def list_providers():
    """Return the list of supported AI providers and their available models."""
    return [
        {
            "key":      k,
            "label":    v["label"],
            "base_url": v["base_url"],
            "models":   v["models"],
        }
        for k, v in PROVIDER_REGISTRY.items()
    ]


# ── Org AI config CRUD ────────────────────────────────────────────────────────

@router.get("/config", response_model=AIConfigOut | None)
def get_ai_config(
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    _require_customer(current_user)
    cfg = _get_ai_config(db, current_user.customer_id)
    if not cfg:
        return None
    key = decrypt_field(cfg["api_key"]) or ""
    masked = key[:6] + "●" * max(0, len(key) - 10) + key[-4:] if len(key) > 10 else "●" * len(key)
    info = get_provider_info(cfg["provider"])
    return AIConfigOut(
        provider=cfg["provider"],
        api_key_masked=masked,
        model=cfg["model"],
        base_url=info["base_url"],
        is_active=bool(cfg["is_active"]),
        updated_at=str(cfg["updated_at"]) if cfg.get("updated_at") else None,
    )


@router.put("/config")
def save_ai_config(
    payload: AIConfigIn,
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    _require_customer(current_user)

    provider_key = payload.provider.lower()
    try:
        info = get_provider_info(provider_key)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Unsupported provider: {payload.provider}")

    # Validate the key actually works before saving
    try:
        validate_config(provider_key, payload.api_key, payload.model)
    except Exception as exc:
        raise HTTPException(
            status_code=422,
            detail=f"API key validation failed: {exc}",
        )

    existing = db.execute(
        text("SELECT id FROM customer_ai_config WHERE customer_id=:cid"),
        {"cid": current_user.customer_id},
    ).fetchone()

    encrypted_key = encrypt_field(payload.api_key)

    if existing:
        db.execute(
            text("""
                UPDATE customer_ai_config
                SET provider=:provider, api_key=:api_key, base_url=:base_url,
                    model=:model, is_active=1, updated_at=NOW()
                WHERE customer_id=:cid
            """),
            {
                "provider": provider_key,
                "api_key":  encrypted_key,
                "base_url": info["base_url"],
                "model":    payload.model,
                "cid":      current_user.customer_id,
            },
        )
    else:
        db.execute(
            text("""
                INSERT INTO customer_ai_config
                    (customer_id, provider, api_key, base_url, model, is_active)
                VALUES
                    (:cid, :provider, :api_key, :base_url, :model, 1)
            """),
            {
                "cid":      current_user.customer_id,
                "provider": provider_key,
                "api_key":  encrypted_key,
                "base_url": info["base_url"],
                "model":    payload.model,
            },
        )
    db.commit()
    return {"message": "AI configuration saved and validated successfully"}


# ── Usage stats (org) ─────────────────────────────────────────────────────────

@router.get("/usage")
def get_ai_usage(
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    _require_customer(current_user)
    cid = current_user.customer_id
    limits = _get_limits_row(db, cid)
    monthly_limit  = limits.get("ai_monthly_limit")        or DEFAULTS["ai_monthly_limit"]
    tokens_limit   = limits.get("ai_tokens_monthly_limit") or DEFAULTS["ai_tokens_monthly_limit"]
    usage          = _ai_usage_this_month(db, cid)
    return {
        "generations_used":    usage["generations"],
        "generations_limit":   monthly_limit,
        "generations_remaining": max(0, monthly_limit - usage["generations"]),
        "tokens_used":         usage["tokens"],
        "tokens_limit":        tokens_limit,
        "tokens_remaining":    max(0, tokens_limit - usage["tokens"]),
    }


# ── Generate email template ───────────────────────────────────────────────────

@router.post("/generate-email-template", response_model=GenerateResponse)
def generate_email_template(
    payload: GenerateRequest,
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    _require_customer(current_user)
    cid = current_user.customer_id

    # 1. Require org to have configured their own AI key
    cfg = _get_ai_config(db, cid)
    if not cfg:
        raise HTTPException(
            status_code=402,
            detail="No AI key configured. Please go to Configuration → Nadia AI and add your API key.",
        )

    # 2. Quota check
    limits = _get_limits_row(db, cid)
    monthly_limit = limits.get("ai_monthly_limit") or DEFAULTS["ai_monthly_limit"]
    usage = _ai_usage_this_month(db, cid)
    if monthly_limit > 0 and usage["generations"] >= monthly_limit:
        raise HTTPException(
            status_code=429,
            detail=(
                f"Monthly AI generation limit reached ({usage['generations']}/{monthly_limit}). "
                "Contact your administrator to increase this limit."
            ),
        )

    # 3. Call the provider
    try:
        variations, token_usage = generate_email_variations(
            provider=cfg["provider"],
            api_key=decrypt_field(cfg["api_key"]),
            model=cfg["model"],
            context=payload.context,
            variables=payload.available_variables,
            fmt=payload.format,
        )
    except Exception as exc:
        log.error("AI generation failed for customer %s: %s", cid, exc)
        raise HTTPException(
            status_code=502,
            detail=f"AI provider error: {exc}",
        )

    # 4. Log usage
    try:
        _log_usage(db, cid, current_user.id, cfg["provider"], cfg["model"], token_usage)
    except Exception as exc:
        log.warning("Failed to log AI usage: %s", exc)

    return GenerateResponse(
        variations=[VariationOut(**v) for v in variations],
        usage={
            "generations_used":    usage["generations"] + 1,
            "generations_limit":   monthly_limit,
            "generations_remaining": max(0, monthly_limit - usage["generations"] - 1),
        },
    )


# ── Admin: all-orgs AI usage summary ─────────────────────────────────────────

@router.get("/admin/usage")
def admin_ai_usage(
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    if getattr(current_user, "role", "").lower() != "admin" or current_user.customer_id:
        raise HTTPException(status_code=403, detail="Platform admin access required")

    rows = db.execute(
        text("""
            SELECT
                c.id                                         AS customer_id,
                c.name                                       AS organization_name,
                COALESCE(cl.ai_monthly_limit,        50)    AS ai_monthly_limit,
                COALESCE(cl.ai_tokens_monthly_limit, 500000) AS ai_tokens_monthly_limit,
                COALESCE(m.generations, 0)                  AS generations_used,
                COALESCE(m.tokens,      0)                  AS tokens_used
            FROM customers c
            LEFT JOIN customer_limits cl ON cl.customer_id = c.id
            LEFT JOIN (
                SELECT
                    customer_id,
                    COUNT(*)                       AS generations,
                    COALESCE(SUM(total_tokens), 0) AS tokens
                FROM ai_usage_logs
                WHERE YEAR(created_at)  = YEAR(NOW())
                  AND MONTH(created_at) = MONTH(NOW())
                GROUP BY customer_id
            ) m ON m.customer_id = c.id
            ORDER BY c.name
        """)
    ).fetchall()

    result = []
    for r in rows:
        r = dict(r._mapping)
        # Coerce Decimal/non-serializable types from MySQL aggregates
        r["tokens_used"]      = int(r.get("tokens_used") or 0)
        r["generations_used"] = int(r.get("generations_used") or 0)
        limit = int(r["ai_monthly_limit"])
        used  = r["generations_used"]
        result.append({
            **r,
            "ai_monthly_limit":        limit,
            "ai_tokens_monthly_limit": int(r["ai_tokens_monthly_limit"]),
            "generations_remaining":   max(0, limit - used),
            "usage_pct":               round((used / limit * 100), 1) if limit else 0,
        })
    return result


@router.put("/admin/usage/{customer_id}/limit")
def admin_update_ai_limit(
    customer_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    if getattr(current_user, "role", "").lower() != "admin" or current_user.customer_id:
        raise HTTPException(status_code=403, detail="Platform admin access required")

    allowed = {"ai_monthly_limit", "ai_tokens_monthly_limit"}
    updates = {k: int(v) for k, v in payload.items() if k in allowed}
    if not updates:
        raise HTTPException(status_code=400, detail="No valid keys provided")

    existing = db.execute(
        text("SELECT id FROM customer_limits WHERE customer_id=:cid"),
        {"cid": customer_id},
    ).fetchone()

    if existing:
        set_clause = ", ".join(f"{k}=:{k}" for k in updates)
        db.execute(
            text(f"UPDATE customer_limits SET {set_clause} WHERE customer_id=:customer_id"),
            {**updates, "customer_id": customer_id},
        )
    else:
        cols = "customer_id, " + ", ".join(updates.keys())
        vals = ":customer_id, " + ", ".join(f":{k}" for k in updates)
        db.execute(
            text(f"INSERT INTO customer_limits ({cols}) VALUES ({vals})"),
            {**updates, "customer_id": customer_id},
        )
    db.commit()
    return {"message": "AI limit updated"}
