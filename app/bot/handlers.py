import logging
import io
import os
from datetime import datetime
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes

from app.database import async_session
from app.models.user import User
from app.models.reminder import Reminder, Attachment
from app.services.reminder_service import create_reminder, process_interaction

logger = logging.getLogger("reminote.bot")

async def get_user_by_chat_id(chat_id: int):
    async with async_session() as db:
        from sqlalchemy import select
        result = await db.execute(select(User).where(User.telegram_chat_id == str(chat_id)))
        return result.scalar_one_or_none()

async def handle_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /start command."""
    chat_id = update.effective_chat.id
    user = await get_user_by_chat_id(chat_id)
    
    if user:
        await update.message.reply_text(
            f"Welcome back, {user.username}! 🛡️\n\n"
            "Submit any text or visual assets here. I will integrate them into your long-term knowledge repository."
        )
    else:
        await update.message.reply_text(
            "Welcome to RemiNote Knowledge OS! 🛡️\n\n"
            "To begin integration, link your identity by sending:\n"
            "`/link <username>`\n\n"
            "Example: `/link admin`",
            parse_mode="Markdown"
        )

async def handle_link(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /link <username> command."""
    if not context.args:
        await update.message.reply_text("Please provide your username. Example: `/link admin`")
        return

    username = context.args[0]
    chat_id = str(update.effective_chat.id)

    async with async_session() as db:
        from sqlalchemy import select
        result = await db.execute(select(User).where(User.username == username))
        user = result.scalar_one_or_none()

        if not user:
            await update.message.reply_text(f"Identity '{username}' not found in the system.")
            return

        user.telegram_chat_id = chat_id
        await db.commit()
        
        await update.message.reply_text(
            f"✅ Identity `{username}` successfully linked to this node.\n\n"
            "You can now submit research notes and media for active reinforcement.",
            parse_mode="Markdown"
        )

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle incoming text messages."""
    chat_id = update.effective_chat.id
    user = await get_user_by_chat_id(chat_id)
    
    if not user:
        await update.message.reply_text("⚠️ Node not linked. Use `/link <username>` to begin.")
        return

    content = update.message.text
    if not content: return

    async with async_session() as db:
        reminder = await create_reminder(db, user.id, title="Telegram Submission", content_text=content)
        await db.commit()

    await update.message.reply_text(f"✅ Note integrated. Next reinforcement scheduled for: {reminder.next_push_at.strftime('%H:%M %d/%m')}")

async def handle_photo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle incoming photos."""
    chat_id = update.effective_chat.id
    user = await get_user_by_chat_id(chat_id)
    
    if not user:
        await update.message.reply_text("⚠️ Node not linked. Use `/link <username>` to begin.")
        return

    photo = update.message.photo[-1]
    caption = update.message.caption or ""
    
    file = await context.bot.get_file(photo.file_id)
    photo_bytes = await file.download_as_bytearray()
    
    async with async_session() as db:
        from app.services.image_service import process_and_save_image
        reminder = await create_reminder(db, user.id, title="Visual Asset", content_text=caption if caption else None)
        file_path = await process_and_save_image(io.BytesIO(photo_bytes), f"tg_{photo.file_id}.jpg")
        
        attachment = Attachment(
            reminder_id=reminder.id,
            file_path=file_path,
            original_filename=f"asset_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg",
            file_size=len(photo_bytes),
            content_type="image/jpeg"
        )
        db.add(attachment)
        await db.commit()

    await update.message.reply_text(f"✅ Visual asset integrated. Next reinforcement: {reminder.next_push_at.strftime('%H:%M %d/%m')}")

async def handle_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle interaction button clicks."""
    query = update.callback_query
    await query.answer()
    
    data = query.data # "rem:id:action"
    if not data.startswith("rem:"): return
        
    _, reminder_id, action = data.split(":")
    reminder_id = int(reminder_id)
    
    async with async_session() as db:
        from sqlalchemy import select
        from sqlalchemy.orm import selectinload
        result = await db.execute(
            select(Reminder).where(Reminder.id == reminder_id)
            .options(selectinload(Reminder.user))
        )
        reminder = result.scalar_one_or_none()
        
        if not reminder:
            await query.edit_message_text("Resource no longer exists.")
            return
            
        await process_interaction(db, reminder, action)
        await db.commit()
        
    status_msg = "✅ Concept understood. Knowledge level increased." if action == "understand" else "🔄 Scheduled for early review."
    await query.edit_message_text(
        text=f"{query.message.text}\n\n---\n{status_msg}\nNext review: {reminder.next_push_at.strftime('%H:%M %d/%m')}"
    )
