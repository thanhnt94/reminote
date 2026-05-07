import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy import select
from app.api.auth import get_current_user
from app.models.user import User
from app.services import image_service
from app.models.reminder import Attachment
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from fastapi.responses import FileResponse

router = APIRouter()

@router.post("/upload")
async def upload_attachment(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    # Use core image service (compress, save to Storage)
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only images are allowed")

    relative_path, original_filename = await image_service.save_and_compress_image(file)
    
    # Return path for frontend preview
    filename = os.path.basename(relative_path)
    return {
        "url": f"/api/attachments/file/{filename}", 
        "filename": relative_path,
        "original_name": original_filename
    }

@router.get("/file/{filename}")
async def get_attachment_by_name(filename: str):
    """Serve a file by its direct filename from Storage."""
    from app.config import get_settings
    settings = get_settings()
    # image_service saves to settings.UPLOAD_DIR
    file_path = settings.UPLOAD_DIR / filename
    if not file_path.exists():
        # Fallback to checking static if it was an old upload
        static_fallback = os.path.join("app/static/uploads", filename)
        if os.path.exists(static_fallback):
             return FileResponse(static_fallback)
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(str(file_path))

@router.get("/{attachment_id}/file")
async def get_attachment_by_id(
    attachment_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Serve a file by its database Attachment ID."""
    from app.services.image_service import get_absolute_path
    result = await db.execute(select(Attachment).where(Attachment.id == attachment_id))
    attachment = result.scalar_one_or_none()
    
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment record not found")
    
    abs_path = get_absolute_path(attachment.file_path)
    if not abs_path.exists():
        # Fallback for old static uploads
        if attachment.file_path.startswith("static/uploads/"):
             static_path = os.path.join("app", attachment.file_path)
             if os.path.exists(static_path):
                  return FileResponse(static_path)
        raise HTTPException(status_code=404, detail=f"File not found on disk: {abs_path}")
        
    return FileResponse(str(abs_path))
