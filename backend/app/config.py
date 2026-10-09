import os
import secrets
from pathlib import Path
from typing import List
try:
    from pydantic_settings import BaseSettings
except ImportError:
    from pydantic import BaseModel
    class BaseSettings(BaseModel):
        class Config:
            extra = "allow"

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(dotenv_path=BASE_DIR / ".env")

class Settings(BaseSettings):
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    ENVIRONMENT: str = "development"
    CORS_ORIGINS: str = "*"
    
    # Database
    DATABASE_URL: str = f"sqlite+aiosqlite:///{BASE_DIR / 'triage.db'}"
    
    # JWT Auth
    SECRET_KEY: str = secrets.token_urlsafe(48)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    
    # AI Keys (optional, system has high-fidelity clinical rule & parser fallback)
    GEMINI_API_KEY: str = ""
    WHISPER_MODEL_SIZE: str = "base"
    
    # Upload storage
    UPLOAD_DIR: str = str(BASE_DIR / "uploads")
    SAMPLE_REPORTS_DIR: str = str(BASE_DIR / "sample_reports")
    MAX_UPLOAD_SIZE_MB: int = 20
    
    # Privacy
    ENABLE_PII_MASKING: bool = True
    RETENTION_DAYS_DEFAULT: int = 30

    @property
    def cors_origins_list(self) -> List[str]:
        if self.CORS_ORIGINS == "*":
            return ["*"]
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    class Config:
        env_file = str(BASE_DIR / ".env")
        env_file_encoding = "utf-8"
        extra = "allow"

settings = Settings()

# Ensure directories exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.SAMPLE_REPORTS_DIR, exist_ok=True)
