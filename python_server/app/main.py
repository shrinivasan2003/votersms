import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from sqlalchemy import text

from app.limiter import limiter

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
    admin_username = os.getenv("ADMIN_USERNAME", "admin")
    admin_password = os.getenv("ADMIN_PASSWORD", "")

    _insecure = {"", "admin123", "admin", "password", "changeme", "123456"}
    if admin_password in _insecure:
        raise RuntimeError(
            "ADMIN_PASSWORD is not set or is using an insecure default. "
            "Set a strong password in python_server/.env.\n"
            "Example: ADMIN_PASSWORD=MyStr0ng!Pass"
        )

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


# Disable interactive API docs in production
_is_prod = os.getenv("ENV", "development").lower() in ("production", "prod")
app = FastAPI(
    lifespan=lifespan,
    docs_url=None if _is_prod else "/docs",
    redoc_url=None if _is_prod else "/redoc",
    openapi_url=None if _is_prod else "/openapi.json",
)

# ── Rate limiter ───────────────────────────────────────────────────────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# ── CORS ──────────────────────────────────────────────────────────────────────
_raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# ── Security headers ──────────────────────────────────────────────────────────
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response: Response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    # HSTS — only meaningful over HTTPS; enable via ENV var on production server
    if os.getenv("HTTPS", "false").lower() == "true":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

# ── Route registration ────────────────────────────────────────────────────────
# Public routes (no JWT required)
app.include_router(auth.router,           prefix="/api")
app.include_router(email_webhooks.router, prefix="/api")

# Protected routes — every request must carry a valid Bearer token
_protected = [Depends(get_current_user)]

app.include_router(voters.router,             prefix="/api", dependencies=_protected)
app.include_router(counties.router,           prefix="/api", dependencies=_protected)
app.include_router(precincts.router,          prefix="/api", dependencies=_protected)
app.include_router(sms_templates.router,      prefix="/api", dependencies=_protected)
app.include_router(sms_jobs.router,           prefix="/api", dependencies=_protected)
app.include_router(dashboard.router,          prefix="/api", dependencies=_protected)
app.include_router(sms_providers.router,      prefix="/api", dependencies=_protected)
app.include_router(email_providers.router,    prefix="/api", dependencies=_protected)
app.include_router(whatsapp_providers.router, prefix="/api", dependencies=_protected)
app.include_router(permissions.router,        prefix="/api", dependencies=_protected)
app.include_router(roles.router,              prefix="/api", dependencies=_protected)
app.include_router(users.router,              prefix="/api")
app.include_router(email_jobs.router,         prefix="/api", dependencies=_protected)
app.include_router(whatsapp_templates.router, prefix="/api", dependencies=_protected)
app.include_router(whatsapp_jobs.router,      prefix="/api", dependencies=_protected)
app.include_router(sms_delivery_stats.router, prefix="/api", dependencies=_protected)
app.include_router(process_jobs.router,       prefix="/api", dependencies=_protected)
app.include_router(email_analytics.router,    prefix="/api", dependencies=_protected)
app.include_router(contact_lists.router,      prefix="/api", dependencies=_protected)
app.include_router(customers.router,          prefix="/api", dependencies=_protected)

# Root
@app.get("/")
def read_root():
    return {"message": "VoterSMS API"}
