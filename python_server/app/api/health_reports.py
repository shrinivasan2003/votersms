"""
Health Check Reports API — platform admin only.

GET /admin/health-reports — history of daily automated health checks
    (deploy/healthcheck/daily_healthcheck.sh), most recent first.

Rows are inserted directly by the health-check script via the mysql
client, not through this API — there is no POST endpoint here.
"""
from fastapi import APIRouter, HTTPException, Depends, Query
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


@router.get("/admin/health-reports")
def list_health_reports(
    limit: int = Query(default=30, ge=1, le=100),
    db: Session = Depends(get_db),
    _: UserOut = Depends(_require_platform_admin),
):
    try:
        rows = db.execute(text("""
            SELECT id, checked_at, overall_ok, frontend_ok, backend_ok,
                   services_ok, ssl_days_left, disk_pct, report_text
            FROM health_check_reports
            ORDER BY checked_at DESC
            LIMIT :limit
        """), {"limit": limit}).fetchall()
        return [dict(r._mapping) for r in rows]
    except Exception as e:
        err = str(e).lower()
        if "doesn't exist" in err or "1146" in err:
            return []
        raise HTTPException(status_code=500, detail=str(e))
