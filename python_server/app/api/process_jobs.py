from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.services.message_processor import process_sms_job, process_email_job

router = APIRouter()

def _get_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class ProcessJobRequest(BaseModel):
    job_id: Optional[int] = None
    batch_size: Optional[int] = 100
    job_type: Optional[str] = "sms"  # "sms" or "email"

@router.post("/process-jobs/process")
def trigger_process_jobs(
    request: ProcessJobRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(_get_session),
):
    if request.job_type not in ("sms", "email"):
        raise HTTPException(status_code=400, detail="job_type must be 'sms' or 'email'")

    processor = process_sms_job if request.job_type == "sms" else process_email_job
    table = "sms_jobs" if request.job_type == "sms" else "email_jobs"

    if request.job_id:
        background_tasks.add_task(processor, request.job_id)
        return {"detail": f"Processing {request.job_type.upper()} job {request.job_id} in the background."}

    # No specific job_id — queue all pending jobs up to batch_size
    rows = db.execute(
        text(f"SELECT id FROM {table} WHERE status='Pending' LIMIT :limit"),
        {"limit": request.batch_size or 100}
    ).fetchall()

    if not rows:
        return {"detail": "No pending jobs found.", "queued": 0}

    for row in rows:
        background_tasks.add_task(processor, row[0])

    return {
        "detail": f"Queued {len(rows)} {request.job_type.upper()} job(s) for processing.",
        "queued": len(rows),
    }
