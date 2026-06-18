from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # App
    APP_NAME: str = "ResumeIQ API"
    VERSION: str = "1.0.0"
    DEBUG: bool = False
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173"]

    # Database
    DATABASE_URL: str = "postgresql://postgres:password@db:5432/resumeiq"

    # Auth
    SECRET_KEY: str = "change-this-in-production-use-32-char-min"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # Gemini AI
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.0-flash"   # free-tier friendly

    # Stripe
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_PRICE_PRO: str = ""
    STRIPE_PRICE_ENTERPRISE: str = ""

    # Plan limits
    RATE_LIMIT_ANALYSES_FREE: int = 3
    RATE_LIMIT_ANALYSES_PRO: int = 100
    RATE_LIMIT_ANALYSES_ENTERPRISE: int = 9999

    class Config:
        env_file = ".env"


settings = Settings()
