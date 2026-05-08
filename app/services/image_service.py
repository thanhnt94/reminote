"""Image Service — Compress and save uploaded images via Pillow."""

import uuid
from pathlib import Path
from PIL import Image
from fastapi import UploadFile

from app.config import get_settings

settings = get_settings()


async def save_and_compress_image(file: UploadFile) -> tuple[str, str]:
    """
    Compress an uploaded image and save to Ecosystem Storage.
    Returns (relative_file_path, original_filename).
    """
    original_filename = file.filename or "unknown.jpg"
    ext = Path(original_filename).suffix.lower()

    # Normalize extension
    if ext not in (".jpg", ".jpeg", ".png", ".webp", ".gif"):
        ext = ".jpg"

    # Generate unique filename
    unique_name = f"{uuid.uuid4().hex}{ext}"
    save_path = settings.UPLOAD_DIR / unique_name

    # Read file content
    content = await file.read()

    # Compress with Pillow
    try:
        img = Image.open(__import__("io").BytesIO(content))

        # Convert RGBA to RGB for JPEG
        if img.mode in ("RGBA", "P") and ext in (".jpg", ".jpeg"):
            img = img.convert("RGB")

        # Resize if wider than max
        if img.width > settings.MAX_IMAGE_WIDTH:
            ratio = settings.MAX_IMAGE_WIDTH / img.width
            new_height = int(img.height * ratio)
            img = img.resize((settings.MAX_IMAGE_WIDTH, new_height), Image.Resampling.LANCZOS)

        # Save compressed
        save_kwargs = {}
        if ext in (".jpg", ".jpeg"):
            save_kwargs["quality"] = settings.JPEG_QUALITY
            save_kwargs["optimize"] = True
        elif ext == ".png":
            save_kwargs["optimize"] = True
        elif ext == ".webp":
            save_kwargs["quality"] = settings.JPEG_QUALITY

        img.save(str(save_path), **save_kwargs)

    except Exception:
        # If Pillow fails (e.g., corrupted image), save raw
        with open(save_path, "wb") as f:
            f.write(content)

    # Return relative path (for DB) and original name
    relative_path = f"RemiNoteMedia/{unique_name}"
    return relative_path, original_filename


def get_absolute_path(relative_path: str) -> Path:
    """Convert relative DB path to absolute filesystem path."""
    # Handle cases where the prefix might be missing (common in seeded data)
    if relative_path.startswith("RemiNoteMedia/"):
        return settings.STORAGE_BASE / "uploads" / relative_path
    
    # Fallback: assume it's inside RemiNoteMedia if no prefix
    # Check if it exists directly in uploads first, then RemiNoteMedia
    direct_path = settings.STORAGE_BASE / "uploads" / relative_path
    if direct_path.exists():
        return direct_path
        
    return settings.UPLOAD_DIR / relative_path


def delete_image(relative_path: str) -> None:
    """Delete an image file from storage."""
    abs_path = get_absolute_path(relative_path)
    if abs_path.exists():
        abs_path.unlink()
