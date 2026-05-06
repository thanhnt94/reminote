"""Attachments API — Serve and delete individual attachments."""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.reminder import Attachment
from app.models.user import User
from app.api.auth import get_current_user
from app.services import image_service

router = APIRouter()


@router.get("/{attachment_id}/file")
async def serve_attachment(
    attachment_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Serve an attachment image file."""
    result = await db.execute(select(Attachment).where(Attachment.id == attachment_id))
    attachment = result.scalar_one_or_none()

    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")

    abs_path = image_service.get_absolute_path(attachment.file_path)
    if not abs_path.exists():
        raise HTTPException(status_code=404, detail="File not found on disk")

    return FileResponse(
        path=str(abs_path),
        filename=attachment.original_filename or "image.jpg",
    )


@router.delete("/{attachment_id}", status_code=204)
async def delete_attachment(
    attachment_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete an individual attachment."""
    result = await db.execute(select(Attachment).where(Attachment.id == attachment_id))
    attachment = result.scalar_one_or_none()

    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")

    # Delete file from disk
    image_service.delete_image(attachment.file_path)

    # Delete DB record
    await db.delete(attachment)
    await db.commit()
