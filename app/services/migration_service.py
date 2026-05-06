import logging
import os
from alembic.config import Config
from alembic import command

logger = logging.getLogger("reminote.migrations")

def run_auto_migrations():
    """Automatically run alembic migrations to the latest version."""
    # Ensure we are in the right directory
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    ini_path = os.path.join(base_dir, "alembic.ini")
    migrations_path = os.path.join(base_dir, "migrations")
    
    if not os.path.exists(ini_path):
        logger.error(f"alembic.ini not found at {ini_path}")
        return

    logger.info("Initializing Automated Schema Synchronization Protocol...")
    try:
        alembic_cfg = Config(ini_path)
        alembic_cfg.set_main_option("script_location", migrations_path)
        
        # Override sqlalchemy.url for Alembic (must be synchronous for SQLite)
        from app.config import get_settings
        settings = get_settings()
        # Convert aiosqlite to standard sqlite for Alembic sync operations
        db_url = settings.DATABASE_URL.replace("sqlite+aiosqlite:///", "sqlite:///")
        alembic_cfg.set_main_option("sqlalchemy.url", db_url)

        # Execute: alembic upgrade head
        command.upgrade(alembic_cfg, "head")
        logger.info("Database schema is now synchronized at 'head'.")
    except Exception as e:
        logger.error(f"Migration protocol encounter: {e}")
        # We continue because the app might still work if schema is partially correct
