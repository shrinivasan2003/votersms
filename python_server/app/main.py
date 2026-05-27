import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

# Import routers
from app.api import (
    auth,
    voters,
    counties,
    precincts,
    sms_templates,
    sms_jobs,
    dashboard,
    sms_providers,
    email_providers,
    whatsapp_providers,
    permissions,
    roles,
    users,
    email_jobs,
    whatsapp_templates,
    whatsapp_jobs,
    sms_delivery_stats,
    process_jobs,
    email_webhooks,
    email_analytics,
    contact_lists,
    customers,
)
from app.dependencies.security import get_current_user
from app.database import SessionLocal
from app.utils.password import hash_password


def _ensure_admin_user() -> None:
    """Ensure the platform admin user exists in the DB on startup.
    Credentials are read from env vars — never hardcoded in the frontend.
    """
    admin_username = os.getenv("ADMIN_USERNAME", "admin")
    admin_password = os.getenv("ADMIN_PASSWORD", "admin123")
    db = SessionLocal()
    try:
        row = db.execute(
            text("SELECT id, password FROM users WHERE username=:u AND customer_id IS NULL"),
            {"u": admin_username},
        ).first()
        if not row:
            db.execute(
                text(
                    "INSERT INTO users (username, password, name, role, status) "
                    "VALUES (:u, :p, 'Platform Admin', 'admin', 'Active')"
                ),
                {"u": admin_username, "p": hash_password(admin_password)},
            )
            db.commit()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    _ensure_admin_user()
    yield


app = FastAPI(lifespan=lifespan)

# ── CORS ──────────────────────────────────────────────────────────────────────
# In production set ALLOWED_ORIGINS in .env to your actual frontend domain(s).
# e.g. ALLOWED_ORIGINS="https://app.yourdomain.com"
_raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# ── Route registration ────────────────────────────────────────────────────────
# Public routes (no JWT required)
app.include_router(auth.router,           prefix="/api")           # /api/login
app.include_router(email_webhooks.router, prefix="/api")           # Postmark callbacks — secured by its own WEBHOOK_SECRET

# Protected routes — every request must carry a valid Bearer token
_protected = [Depends(get_current_user)]

app.include_router(voters.router,           prefix="/api", dependencies=_protected)
app.include_router(counties.router,         prefix="/api", dependencies=_protected)
app.include_router(precincts.router,        prefix="/api", dependencies=_protected)
app.include_router(sms_templates.router,    prefix="/api", dependencies=_protected)
app.include_router(sms_jobs.router,         prefix="/api", dependencies=_protected)
app.include_router(dashboard.router,        prefix="/api", dependencies=_protected)
app.include_router(sms_providers.router,    prefix="/api", dependencies=_protected)
app.include_router(email_providers.router,  prefix="/api", dependencies=_protected)
app.include_router(whatsapp_providers.router, prefix="/api", dependencies=_protected)
app.include_router(permissions.router,      prefix="/api", dependencies=_protected)
app.include_router(roles.router,            prefix="/api", dependencies=_protected)
app.include_router(users.router,            prefix="/api")          # users.py manages its own per-route auth
app.include_router(email_jobs.router,       prefix="/api", dependencies=_protected)
app.include_router(whatsapp_templates.router, prefix="/api", dependencies=_protected)
app.include_router(whatsapp_jobs.router,    prefix="/api", dependencies=_protected)
app.include_router(sms_delivery_stats.router, prefix="/api", dependencies=_protected)
app.include_router(process_jobs.router,     prefix="/api", dependencies=_protected)
app.include_router(email_analytics.router,  prefix="/api", dependencies=_protected)
app.include_router(contact_lists.router,    prefix="/api", dependencies=_protected)
app.include_router(customers.router,        prefix="/api", dependencies=_protected)

# Root
@app.get("/")
def read_root():
    return {"message": "VoterSMS API"}
