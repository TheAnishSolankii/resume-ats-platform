from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Date
from datetime import datetime, timedelta

from core.database import get_db
from core.auth import get_current_admin
from models.user import User, Resume
from schemas import AdminStatsResponse, PaginatedUsers, AdminUserUpdate, UserResponse

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/stats", response_model=AdminStatsResponse)
async def get_stats(
    _=Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    today = datetime.utcnow().date()
    total_users = db.query(func.count(User.id)).scalar()
    active_users = db.query(func.count(User.id)).filter(User.is_active == True).scalar()
    pro_users = db.query(func.count(User.id)).filter(User.plan == "pro").scalar()
    enterprise_users = db.query(func.count(User.id)).filter(User.plan == "enterprise").scalar()
    total_analyses = db.query(func.count(Resume.id)).filter(Resume.status == "done").scalar()
    analyses_today = (
        db.query(func.count(Resume.id))
        .filter(Resume.status == "done", func.date(Resume.created_at) == today)
        .scalar()
    )

    return {
        "total_users": total_users or 0,
        "active_users": active_users or 0,
        "pro_users": pro_users or 0,
        "enterprise_users": enterprise_users or 0,
        "total_analyses": total_analyses or 0,
        "analyses_today": analyses_today or 0,
        "revenue_this_month": (pro_users * 19.0) + (enterprise_users * 49.0),
    }


@router.get("/users", response_model=PaginatedUsers)
async def list_users(
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    search: str = Query(default=""),
    _=Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    q = db.query(User)
    if search:
        q = q.filter(
            (User.email.ilike(f"%{search}%")) | (User.name.ilike(f"%{search}%"))
        )
    total = q.count()
    users = q.order_by(User.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
    return {"items": users, "total": total, "page": page, "pages": -(-total // per_page)}


@router.patch("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    body: AdminUserUpdate,
    _=Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(user, k, v)
    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}", status_code=204)
async def delete_user(
    user_id: int,
    admin=Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()


@router.get("/resumes", response_model=list)
async def list_all_resumes(
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20),
    _=Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    resumes = (
        db.query(Resume)
        .order_by(Resume.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )
    return [
        {
            "id": r.id,
            "name": r.name,
            "user_id": r.user_id,
            "ats_score": r.ats_score,
            "status": r.status,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in resumes
    ]
