from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from models.user import UserRole, SubscriptionPlan


# ── Auth Schemas ──────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    name: str = Field(..., min_length=2, max_length=100)
    password: str = Field(..., min_length=8)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: "UserResponse"


class RefreshRequest(BaseModel):
    refresh_token: str


# ── User Schemas ──────────────────────────────────────────────────────────────

class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    role: UserRole
    plan: SubscriptionPlan
    is_active: bool
    is_verified: bool
    avatar_url: Optional[str]
    analyses_this_month: int
    total_analyses: int
    created_at: datetime

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    name: Optional[str] = None
    avatar_url: Optional[str] = None


class AdminUserUpdate(BaseModel):
    role: Optional[UserRole] = None
    plan: Optional[SubscriptionPlan] = None
    is_active: Optional[bool] = None


# ── Resume Schemas ────────────────────────────────────────────────────────────

class ResumeCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    original_text: str = Field(..., min_length=50)
    job_description: Optional[str] = None
    job_title: Optional[str] = None
    company: Optional[str] = None


class ResumeResponse(BaseModel):
    id: int
    name: str
    file_type: Optional[str]
    job_title: Optional[str]
    company: Optional[str]
    ats_score: Optional[float]
    match_score: Optional[float]
    analysis: Optional[Dict[str, Any]]
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ResumeDetailResponse(ResumeResponse):
    original_text: str
    job_description: Optional[str]
    rewritten_text: Optional[str]
    interview_questions: Optional[Dict[str, Any]]


# ── Analysis Schemas ──────────────────────────────────────────────────────────

class AnalysisResult(BaseModel):
    ats_score: float
    match_score: float
    sections: Dict[str, float]
    keywords: Dict[str, List[str]]
    skills: Dict[str, List[str]]
    strengths: List[str]
    suggestions: List[str]
    red_flags: List[str]
    summary: str


class RewriteRequest(BaseModel):
    resume_id: int
    job_description: Optional[str] = None
    target_role: Optional[str] = None


class InterviewRequest(BaseModel):
    resume_id: int
    job_description: Optional[str] = None
    target_role: Optional[str] = None
    num_questions: int = Field(default=15, ge=5, le=30)


# ── Stripe Schemas ────────────────────────────────────────────────────────────

class CheckoutRequest(BaseModel):
    plan: str  # "pro" | "enterprise"
    success_url: str
    cancel_url: str


class CheckoutResponse(BaseModel):
    checkout_url: str
    session_id: str


# ── Admin Schemas ─────────────────────────────────────────────────────────────

class AdminStatsResponse(BaseModel):
    total_users: int
    active_users: int
    pro_users: int
    enterprise_users: int
    total_analyses: int
    analyses_today: int
    revenue_this_month: float


class PaginatedUsers(BaseModel):
    items: List[UserResponse]
    total: int
    page: int
    pages: int


TokenResponse.model_rebuild()
