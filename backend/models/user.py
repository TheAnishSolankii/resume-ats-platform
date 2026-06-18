from sqlalchemy import Column, Integer, String, Text, Float, Boolean, DateTime, ForeignKey, JSON, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from core.database import Base
import enum


class UserRole(str, enum.Enum):
    user = "user"
    admin = "admin"


class SubscriptionPlan(str, enum.Enum):
    free = "free"
    pro = "pro"
    enterprise = "enterprise"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.user)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    avatar_url = Column(String(500), nullable=True)

    # Subscription
    plan = Column(Enum(SubscriptionPlan), default=SubscriptionPlan.free)
    stripe_customer_id = Column(String(255), nullable=True)
    stripe_subscription_id = Column(String(255), nullable=True)
    subscription_ends_at = Column(DateTime, nullable=True)

    # Usage tracking
    analyses_this_month = Column(Integer, default=0)
    analyses_reset_at = Column(DateTime, nullable=True)
    total_analyses = Column(Integer, default=0)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    resumes = relationship("Resume", back_populates="user", cascade="all, delete-orphan")
    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")


class UserSession(Base):
    __tablename__ = "user_sessions"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    refresh_token = Column(String(500), unique=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    expires_at = Column(DateTime)

    user = relationship("User", back_populates="sessions")


class Resume(Base):
    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    original_text = Column(Text, nullable=False)
    file_url = Column(String(500), nullable=True)    # S3 URL
    file_type = Column(String(50), nullable=True)    # pdf, txt, docx

    # Job targeting
    job_description = Column(Text, nullable=True)
    job_title = Column(String(255), nullable=True)
    company = Column(String(255), nullable=True)

    # AI Analysis results
    ats_score = Column(Float, nullable=True)
    match_score = Column(Float, nullable=True)
    analysis = Column(JSON, nullable=True)           # Full analysis JSON
    rewritten_text = Column(Text, nullable=True)
    interview_questions = Column(JSON, nullable=True)

    # Status
    status = Column(String(50), default="pending")  # pending | analyzing | done | error
    analysis_version = Column(Integer, default=1)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="resumes")


class StripeEvent(Base):
    __tablename__ = "stripe_events"

    id = Column(Integer, primary_key=True)
    event_id = Column(String(255), unique=True)
    event_type = Column(String(100))
    processed = Column(Boolean, default=False)
    payload = Column(JSON)
    created_at = Column(DateTime, server_default=func.now())
