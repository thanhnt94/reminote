import logging
import os
from alembic.config import Config
from alembic import command

logger = logging.getLogger("reminote.migrations")

def run_auto_migrations():
    """Automatically run alembic migrations to the latest version."""
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    ini_path = os.path.join(base_dir, "alembic.ini")
    migrations_path = os.path.join(base_dir, "migrations")
    
    if not os.path.exists(ini_path):
        logger.error(f"alembic.ini not found at {ini_path}")
        return

    logger.info("Checking for database migrations...")
    try:
        alembic_cfg = Config(ini_path)
        alembic_cfg.set_main_option("script_location", migrations_path)
        
        # This will run 'alembic upgrade head'
        command.upgrade(alembic_cfg, "head")
        logger.info("Database is up to date.")
    except Exception as e:
        logger.error(f"Migration error: {e}")
        # Note: In some cases (like first time), you might need to stamp the DB
        # if tables already exist. But for now, we try to upgrade.
        logger.info("Attempting to continue despite migration warning...")
