"""RemiNote entry point — Uvicorn server."""

import os
import sys
import logging

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    datefmt="%H:%M:%S",
)

from app import create_app

app = create_app()

if __name__ == "__main__":
    import uvicorn

    # Ensure essential directories
    base_dir = os.path.dirname(os.path.abspath(__file__))
    storage_dir = os.path.abspath(os.path.join(base_dir, '..', 'Storage'))

    for d in [
        os.path.join(storage_dir, 'database'),
        os.path.join(storage_dir, 'uploads', 'RemiNoteMedia'),
    ]:
        os.makedirs(d, exist_ok=True)

    print("=" * 50)
    print("  RemiNote — Aggressive Knowledge Reinforcement")
    print("  http://127.0.0.1:5070")
    print("  Swagger: http://127.0.0.1:5070/docs")
    print("=" * 50)

    uvicorn.run(
        "run_reminote:app",
        host="0.0.0.0",
        port=5070,
        reload=True,
        reload_dirs=[os.path.join(base_dir, "app")],
    )
