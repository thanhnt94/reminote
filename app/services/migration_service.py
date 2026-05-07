import logging
import os
import subprocess
import sys

logger = logging.getLogger("reminote.migrations")

async def run_auto_migrations():
    """Automatically run alembic migrations using a separate process to avoid loop conflicts."""
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    venv_bin = os.path.join(base_dir, "venv", "bin", "alembic")
    
    # Fallback for local windows or different paths
    if not os.path.exists(venv_bin):
        venv_bin = "alembic"

    logger.info("🚀 Launching Subprocess Schema Synchronization...")
    
    try:
        # Run: alembic upgrade head
        # We set PYTHONPATH to base_dir so alembic can find 'app'
        env = os.environ.copy()
        env["PYTHONPATH"] = base_dir
        
        process = subprocess.run(
            [venv_bin, "upgrade", "head"],
            cwd=base_dir,
            capture_output=True,
            text=True,
            env=env
        )
        
        if process.returncode == 0:
            logger.info("✅ Database schema synchronized successfully via subprocess.")
            if process.stdout:
                logger.debug(f"Alembic output: {process.stdout}")
        else:
            logger.error(f"❌ Migration failed with exit code {process.returncode}")
            logger.error(f"Error output: {process.stderr}")
            
    except Exception as e:
        logger.error(f"💥 Migration process encountered a critical failure: {e}")
