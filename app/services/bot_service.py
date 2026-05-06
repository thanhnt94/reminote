import logging
import os
from telegram import Bot, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, MessageHandler, CallbackQueryHandler, filters
from app.database import async_session
from app.models.setting import SystemSetting
from app.config import get_settings

logger = logging.getLogger("reminote.bot")

# Global application instance
_bot_app = None

async def get_bot_token():
    async with async_session() as db:
        from sqlalchemy import select
        result = await db.execute(select(SystemSetting).where(SystemSetting.key == "TELEGRAM_BOT_TOKEN"))
        setting = result.scalar_one_or_none()
        return setting.value if setting else None

async def get_web_base_url():
    async with async_session() as db:
        from sqlalchemy import select
        result = await db.execute(select(SystemSetting).where(SystemSetting.key == "TELEGRAM_WEB_BASE_URL"))
        setting = result.scalar_one_or_none()
        return setting.value if setting else "http://localhost:5070"

async def init_bot_app():
    global _bot_app
    token = await get_bot_token()
    if not token:
        logger.warning("TELEGRAM_BOT_TOKEN not found in settings. Bot is disabled.")
        return None

    try:
        app = Application.builder().token(token).build()
        from app.bot.handlers import handle_start, handle_link, handle_message, handle_photo, handle_callback
        
        app.add_handler(CommandHandler("start", handle_start))
        app.add_handler(CommandHandler("link", handle_link))
        app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
        app.add_handler(MessageHandler(filters.PHOTO, handle_photo))
        app.add_handler(CallbackQueryHandler(handle_callback))
        
        await app.initialize()
        await app.start()
        
        _bot_app = app
        logger.info("Telegram Bot Application initialized successfully.")
        return app
    except Exception as e:
        logger.error(f"Failed to initialize Telegram Bot: {e}")
        return None

async def send_reminder_push(chat_id: str, reminder_id: int, text: str, image_path: str = None):
    token = await get_bot_token()
    if not token: return False
    
    base_url = await get_web_base_url()
    review_url = f"{base_url}/reminders/{reminder_id}"
        
    bot = Bot(token=token)
    
    keyboard = [
        [InlineKeyboardButton("📖 Open Research Note", url=review_url)],
        [
            InlineKeyboardButton("🔄 Review Later", callback_data=f"rem:{reminder_id}:review"),
            InlineKeyboardButton("✅ Understood", callback_data=f"rem:{reminder_id}:understand"),
        ]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    try:
        caption = f"🛡️ **KNOWLEDGE REINFORCEMENT**\n\n{text or 'Visual asset review required.'}"
        if image_path:
            settings = get_settings()
            full_path = os.path.join(settings.STORAGE_DIR, image_path)
            if os.path.exists(full_path):
                with open(full_path, "rb") as photo:
                    await bot.send_photo(chat_id=chat_id, photo=photo, caption=caption, reply_markup=reply_markup, parse_mode="Markdown")
                    return True

        await bot.send_message(chat_id=chat_id, text=caption, reply_markup=reply_markup, parse_mode="Markdown")
        return True
    except Exception as e:
        logger.error(f"Error sending push to {chat_id}: {e}")
        return False
