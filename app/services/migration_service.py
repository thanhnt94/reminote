import logging
import os
import asyncio
from alembic.config import Config
from alembic import command

logger = logging.getLogger("reminote.migrations")

async def run_auto_migrations():
    """Automatically run alembic migrations to the latest version."""
    # Ensure we are in the right directory
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    ini_path = os.path.join(base_dir, "alembic.ini")
    migrations_path = os.path.join(base_dir, "migrations")
    
    if not os.path.exists(ini_path):
        logger.error(f"alembic.ini not found at {ini_path}")
        return

    logger.info("Initializing Automated Schema Synchronization Protocol...")
    
    # We run the migration in a thread pool because Alembic commands are synchronous
    # but our env.py might attempt to use the running event loop.
    def sync_run():
        try:
            alembic_cfg = Config(ini_path)
            alembic_cfg.set_main_option("script_location", migrations_path)
            
            from app.config import get_settings
            settings = get_settings()
            # Use SYNC sqlite for migration tools
            db_url = str(settings.DATABASE_URL).replace("sqlite+aiosqlite:///", "sqlite:///")
            alembic_cfg.set_main_option("sqlalchemy.url", db_url)

            command.upgrade(alembic_cfg, "head")
            logger.info("Database schema is now synchronized at 'head'.")
        except Exception as e:
            logger.error(f"Migration protocol encounter: {e}")

    await asyncio.to_thread(sync_run)
