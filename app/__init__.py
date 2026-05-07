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
from app.database import async_session
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
    try:
        async with async_session() as db:
            logger.info("--- [SEED] Checking for default ecosystem entities ---")
            
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
                logger.info("--- [SEED] SUCCESS: Created default admin user (admin/admin) ---")
            else:
                logger.info("--- [SEED] INFO: Admin user already exists. Skipping creation. ---")

            # 2. Seed system settings
            default_settings = [
                ("TELEGRAM_BOT_TOKEN", "", "Telegram Bot API Token", "bot"),
                ("TELEGRAM_WEBHOOK_URL", "", "Public webhook URL for Telegram", "bot"),
                ("TELEGRAM_WEB_BASE_URL", "http://localhost:5070", "Base URL for opening reminders on web", "bot"),
                ("PUSH_SCHEDULE_HOURS", "8,12,20", "Comma-separated push hours (Old System)", "scheduler"),
                ("PUSH_TIMEZONE", "Asia/Ho_Chi_Minh", "Timezone for scheduled pushes", "scheduler"),
                ("MAX_DAILY_PUSHES", "15", "Maximum push notifications per day", "scheduler"),
                ("GLOBAL_PUSH_INTERVAL", "60", "Global push interval in minutes", "scheduler"),
                ("GLOBAL_ACTIVE_START", "8", "Global active hour start (0-23)", "scheduler"),
                ("GLOBAL_ACTIVE_END", "22", "Global active hour end (0-23)", "scheduler"),
                ("VAPID_PUBLIC_KEY", "", "VAPID Public Key for Web Push", "security"),
                ("VAPID_PRIVATE_KEY", "", "VAPID Private Key for Web Push", "security"),
                ("ENABLE_TELEGRAM_PUSH", "true", "Enable system-wide Telegram notifications", "scheduler"),
                ("ENABLE_WEB_PUSH", "true", "Enable system-wide Chrome notifications", "scheduler"),
                ("CENTRAL_AUTH_URL", "https://auth.mindstack.click", "CentralAuth Server URL", "sso"),
                ("CENTRAL_AUTH_CLIENT_ID", "reminote-v1", "SSO Client ID", "sso"),
                ("CENTRAL_AUTH_CLIENT_SECRET", "reminote_secret_xxx", "SSO Client Secret", "sso"),
                ("ENABLE_SSO", "true", "Enable CentralAuth SSO Integration", "sso"),
            ]
            
            vapid_pub = ""
            vapid_priv = ""
            
            # Pre-check: Ensure VAPID keys exist
            for key_name in ["VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY"]:
                res = await db.execute(select(SystemSetting).where(SystemSetting.key == key_name))
                existing = res.scalar_one_or_none()
                if not existing or not existing.value:
                    if not vapid_pub:
                        try:
                            from pyvapid import Vapid
                            v = Vapid()
                            v.generate_keys()
                            vapid_pub = v.public_key
                            vapid_priv = v.private_key
                            logger.info("--- [SEED] SUCCESS: Generated new VAPID keys ---")
                        except Exception as ex:
                            logger.error(f"--- [SEED] WARNING: Could not generate VAPID keys: {ex}")
                    
                    val = vapid_pub if key_name == "VAPID_PUBLIC_KEY" else vapid_priv
                    if val: # Only save if we actually got a key
                        if not existing:
                            db.add(SystemSetting(key=key_name, value=val, description="VAPID Key", category="security"))
                        else:
                            existing.value = val

            # Seed other defaults
            for key, value, desc, cat in default_settings:
                if key in ["VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY"]: continue
                result = await db.execute(select(SystemSetting).where(SystemSetting.key == key))
                existing = result.scalar_one_or_none()
                if not existing:
                    db.add(SystemSetting(key=key, value=value, description=desc, category=cat))

            await db.commit()
            logger.info("--- [SEED] Ecosystem defaults synchronized. ---")
    except Exception as e:
        logger.error(f"--- [SEED] CRITICAL ERROR: {e} ---")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    # Startup phase
    try:
        logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
        
        # 1. Ensure Storage is ready
        settings.DB_PATH.parent.mkdir(parents=True, exist_ok=True)
        settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        
        # 2. Run migrations (This handles table creation properly)
        try:
            await run_auto_migrations()
        except Exception as e:
            logger.error(f"Migration failed: {e}")
            # In production, we might want to exit here, but we'll try to seed anyway
        
        # 3. Seed default data (admin, settings)
        await seed_defaults()

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
    """Application factory for RemiNote Knowledge OS."""
    
    # Migrations will be run in the lifespan context to avoid blocking worker startup too long
    # and to ensure DATABASE_URL is fully resolved via Pydantic

    app = FastAPI(
        title="RemiNote Knowledge OS",
        description="Dual-channel knowledge reinforcement system.",
        version="1.2.0",
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

    from app.api import auth, reminders, admin, attachments
    app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
    app.include_router(reminders.router, prefix="/api/reminders", tags=["reminders"])
    app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
    app.include_router(attachments.router, prefix="/api/attachments", tags=["attachments"])

    static_dir = Path(__file__).parent / "static"
    dist_dir = static_dir / "dist"
    app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # 1. Check if it's an API route that missed
        if full_path.startswith("api/"):
            return JSONResponse(status_code=404, content={"detail": "Not Found"})
            
        # 2. Check if the file exists in dist_dir (e.g. sw.js, manifest.json)
        requested_file = dist_dir / full_path
        if full_path and requested_file.exists() and requested_file.is_file():
            return FileResponse(str(requested_file))

        # 3. Fallback to index.html for SPA routing
        index_file = dist_dir / "index.html"
        if index_file.exists():
            return FileResponse(str(index_file))
        return JSONResponse(status_code=200, content={"message": "Frontend not built"})

    return app
