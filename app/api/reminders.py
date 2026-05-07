"""Reminders API — CRUD, interaction, archive, due list."""

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models.user import User
from app.models.reminder import Reminder, Attachment
from app.api.auth import get_current_user
from app.schemas.reminder import (
    ReminderCreate, ReminderUpdate, ReminderResponse,
    InteractionRequest, ReminderListResponse, TagUpdate,
)
from app.services import reminder_service, image_service, bot_service
from telegram import InlineKeyboardButton, InlineKeyboardMarkup
import random
import os

router = APIRouter()


@router.get("/tags")
async def list_tags(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all tags for the current user."""
    return await reminder_service.get_all_tags(db, user.id)


@router.put("/tags/{tag_name}")
async def update_tag(
    tag_name: str,
    data: TagUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Rename a tag."""
    return await reminder_service.rename_tag(db, user.id, tag_name, data.new_name)


@router.delete("/tags/{tag_name}")
async def delete_tag(
    tag_name: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a tag."""
    await reminder_service.delete_tag(db, user.id, tag_name)
    return {"status": "deleted"}


@router.post("", response_model=ReminderResponse, status_code=201)
async def create_reminder(
    data: ReminderCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new reminder."""
    reminder = await reminder_service.create_reminder(
        db, user_id=user.id, title=data.title, content_text=data.content_text, tags=data.tags
    )
    await db.commit()
    return ReminderResponse.model_validate(reminder)


@router.get("", response_model=ReminderListResponse)
async def list_reminders(
    search: str | None = Query(None),
    tag: str | None = Query(None),
    archived: bool | None = Query(None),
    due_only: bool = Query(False),
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List reminders with search and filtering."""
    items, total = await reminder_service.list_reminders(
        db, user_id=user.id, search=search, tag=tag, archived=archived,
        due_only=due_only, offset=offset, limit=limit,
    )
    return ReminderListResponse(
        items=[ReminderResponse.model_validate(r) for r in items],
        total=total,
    )


@router.get("/due", response_model=list[ReminderResponse])
async def get_due(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get due reminders."""
    items, _ = await reminder_service.list_reminders(
        db, user_id=user.id, due_only=True, archived=False, limit=50
    )
    return [ReminderResponse.model_validate(r) for r in items]


@router.get("/review-queue", response_model=list[ReminderResponse])
async def get_review_queue(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get an infinite-style queue for review.
    Due items first, then random low-memory items.
    """
    # 1. Get due items (Only active ones)
    due_items, _ = await reminder_service.list_reminders(
        db, user_id=user.id, due_only=True, archived=False, limit=20
    )
    
    # 2. Fill to at least 20 items with random non-due ones
    if len(due_items) < 20:
        due_ids = [r.id for r in due_items]
        stmt = (
            select(Reminder)
            .where(Reminder.user_id == user.id)
            .where(Reminder.is_archived == False)
            .where(Reminder.id.not_in(due_ids) if due_ids else True)
            .order_by(func.random())
            .limit(20 - len(due_items))
        )
        result = await db.execute(stmt)
        extra_items = result.scalars().all()
        combined = due_items + list(extra_items)
        return [ReminderResponse.model_validate(r) for r in combined]
        
    return [ReminderResponse.model_validate(r) for r in due_items]


@router.get("/{reminder_id}", response_model=ReminderResponse)
async def get_reminder(
    reminder_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single reminder."""
    reminder = await reminder_service.get_reminder(db, reminder_id, user_id=user.id)
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    return ReminderResponse.model_validate(reminder)


@router.put("/{reminder_id}", response_model=ReminderResponse)
async def update_reminder(
    reminder_id: int,
    data: ReminderUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a reminder."""
    reminder = await reminder_service.get_reminder(db, reminder_id, user_id=user.id)
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")

    updated = await reminder_service.update_reminder(
        db, reminder, data.model_dump(exclude_unset=True)
    )
    return ReminderResponse.model_validate(updated)


@router.delete("/{reminder_id}", status_code=204)
async def delete_reminder(
    reminder_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a reminder."""
    reminder = await reminder_service.get_reminder(db, reminder_id, user_id=user.id)
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")

    for att in reminder.attachments:
        image_service.delete_image(att.file_path)

    await reminder_service.delete_reminder(db, reminder)


@router.post("/{reminder_id}/interact", response_model=ReminderResponse)
async def interact(
    reminder_id: int,
    data: InteractionRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Process interaction."""
    reminder = await reminder_service.get_reminder(db, reminder_id, user_id=user.id)
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")

    await reminder_service.process_interaction(db, reminder, data.action)
    await db.commit()
    await db.refresh(reminder, attribute_names=["attachments", "tags_rel"])
    return ReminderResponse.model_validate(reminder)


@router.post("/{reminder_id}/archive", response_model=ReminderResponse)
async def toggle_archive(
    reminder_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Toggle archive."""
    reminder = await reminder_service.get_reminder(db, reminder_id, user_id=user.id)
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")

    reminder.is_archived = not reminder.is_archived
    await db.commit()
    await db.refresh(reminder, attribute_names=["attachments", "tags_rel"])
    return ReminderResponse.model_validate(reminder)


@router.post("/{reminder_id}/attachments", response_model=ReminderResponse)
async def upload_attachments(
    reminder_id: int,
    files: list[UploadFile] = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload attachments."""
    reminder = await reminder_service.get_reminder(db, reminder_id, user_id=user.id)
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")

    for file in files:
        file_path, original_name = await image_service.save_and_compress_image(file)
        attachment = Attachment(
            reminder_id=reminder_id,
            file_path=file_path,
            original_filename=file.filename,
            file_size=file.size,
            content_type=file.content_type
        )
        db.add(attachment)

    await db.commit()
    await db.refresh(reminder, attribute_names=["attachments", "tags_rel"])
    return ReminderResponse.model_validate(reminder)


@router.put("/{reminder_id}/link-attachments")
async def link_attachments(
    reminder_id: int,
    data: dict,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Link pre-uploaded files to a reminder."""
    reminder = await reminder_service.get_reminder(db, reminder_id, user_id=user.id)
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")

    filenames = data.get("filenames", [])
    for path in filenames:
        # Create attachment record
        # Note: We need some metadata like size/content-type if possible, or just default
        attachment = Attachment(
            reminder_id=reminder_id,
            file_path=path,
            original_filename=os.path.basename(path),
            file_size=0, # Unknown at this point unless we stat
            content_type="image/png"
        )
        db.add(attachment)

    await db.commit()
    return {"status": "success"}

@router.get("/search/similar-titles")
async def find_similar(
    q: str = Query(..., min_length=2),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Find similar titles for duplicate detection."""
    reminders = await reminder_service.search_similar_titles(db, user.id, q)
    return [ReminderResponse.model_validate(r) for r in reminders]

@router.get("/tags/suggestions")
async def suggest_tags(
    q: str = Query(""),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get tag suggestions based on prefix."""
    suggestions = await reminder_service.get_tag_suggestions(db, user.id, q)
    return suggestions

@router.post("/test-push")
async def test_push(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Trigger a test knowledge digest immediately."""
    if not user.telegram_chat_id:
        raise HTTPException(status_code=400, detail="Telegram not linked")

    # Fetch 3 items for test
    from sqlalchemy.orm import selectinload
    stmt = (
        select(Reminder)
        .where(Reminder.user_id == user.id)
        .limit(3)
        .options(selectinload(Reminder.attachments))
    )
    res = await db.execute(stmt)
    items = res.scalars().all()
    
    if not items:
        raise HTTPException(status_code=400, detail="No notes to send")

    digest_text = "🧪 **TEST KNOWLEDGE DIGEST**\n\nĐây là tin nhắn kiểm tra tính năng thông báo gom nhóm:\n\n"
    for i, item in enumerate(items):
        digest_text += f"{i+1}. {item.title or 'Note'}\n"
    
    keyboard = [[InlineKeyboardButton("🚀 Open Review Mode", url=f"http://127.0.0.1:5070/review")]]
    reply_markup = InlineKeyboardMarkup(keyboard)

    try:
        if not bot_service.bot:
            raise HTTPException(status_code=503, detail="Bot service not initialized yet. Try testing connection in Admin settings.")
            
        await bot_service.bot.send_message(
            chat_id=user.telegram_chat_id, 
            text=digest_text, 
            reply_markup=reply_markup, 
            parse_mode='Markdown'
        )
        return {"status": "success", "message": "Neural Digest dispatched to Telegram."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Bot error: {str(e)}")
