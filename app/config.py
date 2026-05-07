"""RemiNote Configuration — Pydantic BaseSettings."""

import os
from pathlib import Path
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from .env and environment variables."""

    # --- Core ---
    APP_NAME: str = "RemiNote"
    APP_VERSION: str = "1.2.0"
    SECRET_KEY: str = "change-me-in-production"
    DEBUG: bool = True # Enabled for troubleshooting

    # --- Paths ---
    BASE_DIR: Path = Path(__file__).resolve().parent.parent
    
    # CENTRALIZED STORAGE: Resolves to /var/www/Storage on VPS
    # path/to/Ecosystem/reminote/app/config.py -> Ecosystem/reminote/ -> Ecosystem/ -> path/to/Storage
    STORAGE_BASE: Path = Path(__file__).resolve().parent.parent.parent / "Storage"

    @property
    def DB_PATH(self) -> Path:
        db_dir = self.STORAGE_BASE / "database"
        # Only create if we have write access (to avoid errors on weird environments)
        try:
            db_dir.mkdir(parents=True, exist_ok=True)
        except Exception: pass
        return db_dir / "reminote.db"

    @property
    def DATABASE_URL(self) -> str:
        return f"sqlite+aiosqlite:///{self.DB_PATH.absolute()}"

    @property
    def UPLOAD_DIR(self) -> Path:
        upload_dir = self.STORAGE_BASE / "uploads" / "RemiNoteMedia"
        try:
            upload_dir.mkdir(parents=True, exist_ok=True)
        except Exception: pass
        return upload_dir

    # --- Auth ---
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # --- CentralAuth SSO ---
    CENTRAL_AUTH_URL: str = "https://auth.mindstack.click"
    CENTRAL_AUTH_CLIENT_ID: str = "reminote-v1"
    CENTRAL_AUTH_CLIENT_SECRET: str = "reminote_secret_xxx"

    @property
    def SSO_REDIRECT_URI(self) -> str:
        return f"https://note.mindstack.click/api/auth/sso/callback"

    # --- Image Processing ---
    MAX_IMAGE_WIDTH: int = 1200
    JPEG_QUALITY: int = 80

    class Config:
        env_file = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"
        )
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
