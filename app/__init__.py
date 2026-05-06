"""RemiNote — FastAPI Application Factory."""

import logging
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from sqlalchemy import select

from app.config import get_settings
from app.database import init_db, async_session
from app.models.user import User
from app.models.setting import SystemSetting
from app.services.auth_service import hash_password
from app.services.scheduler_service import start_scheduler, stop_scheduler
from app.services.bot_service import init_bot_app
from app.services.migration_service import run_auto_migrations

settings = get_settings()
logger = logging.getLogger("reminote")


async def seed_defaults():
    """Seed admin user and default system settings on first run."""
    async with async_session() as db:
        # 1. Seed admin user
        result = await db.execute(select(User).where(User.username == "admin"))
        admin = result.scalar_one_or_none()
        if not admin:
            admin = User(
                username="admin",
                password_hash=hash_password("admin"),
                email="admin@reminote.local",
                is_admin=True,
            )
            db.add(admin)
            logger.info("Created default admin user (admin/admin)")

        # 2. Seed system settings
        default_settings = [
            ("TELEGRAM_BOT_TOKEN", "", "Telegram Bot API Token", "bot"),
            ("TELEGRAM_WEBHOOK_URL", "", "Public webhook URL for Telegram", "bot"),
            ("TELEGRAM_WEB_BASE_URL", "http://localhost:5070", "Base URL for opening reminders on web", "bot"),
            ("PUSH_SCHEDULE_HOURS", "8,12,20", "Comma-separated push hours (24h format)", "scheduler"),
            ("PUSH_TIMEZONE", "Asia/Ho_Chi_Minh", "Timezone for scheduled pushes", "scheduler"),
            ("MAX_DAILY_PUSHES", "15", "Maximum push notifications per day", "scheduler"),
        ]
        for key, value, desc, cat in default_settings:
            result = await db.execute(select(SystemSetting).where(SystemSetting.key == key))
            if not result.scalar_one_or_none():
                db.add(SystemSetting(key=key, value=value, description=desc, category=cat))

        await db.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    # Startup phase
    try:
        logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
        
        # 1. Initialize DB tables
        await init_db()
        
        # 2. Seed default data (admin, settings)
        await seed_defaults()
        
        # 3. Run migrations (if any)
        try:
            run_auto_migrations()
        except Exception as e:
            logger.warning(f"Migrations skipped: {e}")

        # 4. Services
        await init_bot_app()
        start_scheduler()
        
        logger.info("Application startup complete.")
    except Exception as e:
        logger.error(f"CRITICAL: Startup failed: {e}")
        # We don't re-raise here to see if the app can at least stay alive for debugging
    
    yield
    
    # Shutdown
    stop_scheduler()
    logger.info("RemiNote shutdown complete.")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="Aggressive Knowledge Reinforcement System",
        lifespan=lifespan,
    )

    app.add_middleware(SessionMiddleware, secret_key=settings.SECRET_KEY)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    from app.api import api_router
    app.include_router(api_router)

    static_dir = Path(__file__).parent / "static"
    dist_dir = static_dir / "dist"
    app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api/"):
            return JSONResponse(status_code=404, content={"detail": "Not Found"})
            
        index_file = dist_dir / "index.html"
        if index_file.exists():
            return FileResponse(str(index_file))
        return JSONResponse(status_code=200, content={"message": "Frontend not built"})

    return app
