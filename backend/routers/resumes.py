from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
from typing import Optional, List
import PyPDF2
import io

from core.database import get_db
from core.auth import get_current_user
from core.config import settings
from models.user import User, Resume, SubscriptionPlan
from schemas import ResumeCreate, ResumeResponse, ResumeDetailResponse, RewriteRequest, InterviewRequest
from services.ai_service import analyze_resume, rewrite_resume, generate_interview_questions

router = APIRouter(prefix="/api/resumes", tags=["resumes"])

PLAN_LIMITS = {
    SubscriptionPlan.free: settings.RATE_LIMIT_ANALYSES_FREE,
    SubscriptionPlan.pro: settings.RATE_LIMIT_ANALYSES_PRO,
    SubscriptionPlan.enterprise: settings.RATE_LIMIT_ANALYSES_ENTERPRISE,
}


def _check_usage_limit(user: User, db: Session):
    """Reset monthly counter if new month, then enforce plan limit."""
    now = datetime.utcnow()
    if not user.analyses_reset_at or user.analyses_reset_at.month != now.month:
        user.analyses_this_month = 0
        user.analyses_reset_at = now
        db.commit()

    limit = PLAN_LIMITS.get(user.plan, 3)
    if user.analyses_this_month >= limit:
        raise HTTPException(
            status_code=429,
            detail=f"Monthly analysis limit reached ({limit} for {user.plan} plan). Upgrade to continue.",
        )


def _extract_text_from_pdf(content: bytes) -> str:
    reader = PyPDF2.PdfReader(io.BytesIO(content))
    return "\n".join(page.extract_text() or "" for page in reader.pages)


# ── List & Get ────────────────────────────────────────────────────────────────

@router.get("/", response_model=List[ResumeResponse])
async def list_resumes(
    skip: int = 0,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(Resume)
        .filter(Resume.user_id == current_user.id)
        .order_by(Resume.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/{resume_id}", response_model=ResumeDetailResponse)
async def get_resume(
    resume_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    r = db.query(Resume).filter(Resume.id == resume_id, Resume.user_id == current_user.id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Resume not found")
    return r


# ── Upload via file ───────────────────────────────────────────────────────────

@router.post("/upload", response_model=ResumeDetailResponse, status_code=201)
async def upload_resume(
    file: UploadFile = File(...),
    job_description: Optional[str] = None,
    job_title: Optional[str] = None,
    company: Optional[str] = None,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _check_usage_limit(current_user, db)

    content = await file.read()
    if len(content) > 5 * 1024 * 1024:  # 5MB
        raise HTTPException(status_code=413, detail="File too large (max 5MB)")

    if file.content_type == "application/pdf" or file.filename.endswith(".pdf"):
        text = _extract_text_from_pdf(content)
        file_type = "pdf"
    else:
        text = content.decode("utf-8", errors="replace")
        file_type = "txt"

    if len(text.strip()) < 50:
        raise HTTPException(status_code=422, detail="Could not extract sufficient text from file")

    name = file.filename.rsplit(".", 1)[0] if file.filename else "Resume"
    resume = Resume(
        user_id=current_user.id,
        name=name,
        original_text=text,
        file_type=file_type,
        job_description=job_description,
        job_title=job_title,
        company=company,
        status="pending",
    )
    db.add(resume)
    db.commit()
    db.refresh(resume)

    background_tasks.add_task(_run_analysis, resume.id, db, current_user)
    return resume


# ── Create via text ───────────────────────────────────────────────────────────

@router.post("/", response_model=ResumeDetailResponse, status_code=201)
async def create_resume(
    body: ResumeCreate,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _check_usage_limit(current_user, db)

    resume = Resume(
        user_id=current_user.id,
        name=body.name,
        original_text=body.original_text,
        job_description=body.job_description,
        job_title=body.job_title,
        company=body.company,
        status="pending",
    )
    db.add(resume)
    db.commit()
    db.refresh(resume)

    background_tasks.add_task(_run_analysis, resume.id, db, current_user)
    return resume


# ── AI Actions ────────────────────────────────────────────────────────────────

@router.post("/{resume_id}/analyze", response_model=ResumeDetailResponse)
async def run_analysis(
    resume_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Re-run analysis on an existing resume."""
    _check_usage_limit(current_user, db)
    r = db.query(Resume).filter(Resume.id == resume_id, Resume.user_id == current_user.id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Resume not found")

    await _run_analysis(resume_id, db, current_user)
    db.refresh(r)
    return r


@router.post("/{resume_id}/rewrite", response_model=ResumeDetailResponse)
async def rewrite(
    resume_id: int,
    body: RewriteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.plan == SubscriptionPlan.free:
        raise HTTPException(status_code=402, detail="AI Rewrite requires Pro plan or above")

    r = db.query(Resume).filter(Resume.id == resume_id, Resume.user_id == current_user.id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Resume not found")

    missing = (r.analysis or {}).get("keywords", {}).get("missing", [])
    jd = body.job_description or r.job_description

    r.rewritten_text = await rewrite_resume(r.original_text, jd, missing, body.target_role)
    db.commit()
    db.refresh(r)
    return r


@router.post("/{resume_id}/interview-questions", response_model=ResumeDetailResponse)
async def interview_questions(
    resume_id: int,
    body: InterviewRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.plan == SubscriptionPlan.free:
        raise HTTPException(status_code=402, detail="Interview Prep requires Pro plan or above")

    r = db.query(Resume).filter(Resume.id == resume_id, Resume.user_id == current_user.id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Resume not found")

    jd = body.job_description or r.job_description
    r.interview_questions = await generate_interview_questions(r.original_text, jd, body.target_role)
    db.commit()
    db.refresh(r)
    return r


@router.delete("/{resume_id}", status_code=204)
async def delete_resume(
    resume_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    r = db.query(Resume).filter(Resume.id == resume_id, Resume.user_id == current_user.id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Resume not found")
    db.delete(r)
    db.commit()


# ── Background task ───────────────────────────────────────────────────────────

async def _run_analysis(resume_id: int, db: Session, user: User):
    r = db.query(Resume).filter(Resume.id == resume_id).first()
    if not r:
        return
    try:
        r.status = "analyzing"
        db.commit()

        result = await analyze_resume(r.original_text, r.job_description)

        r.ats_score = result.get("ats_score", 0)
        r.match_score = result.get("match_score", 0)
        r.analysis = result
        r.status = "done"

        user.analyses_this_month = (user.analyses_this_month or 0) + 1
        user.total_analyses = (user.total_analyses or 0) + 1
        db.commit()
    except Exception as e:
        r.status = "error"
        db.commit()
        raise e
