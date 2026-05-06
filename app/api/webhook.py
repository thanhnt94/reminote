import logging
from fastapi import APIRouter, Request, Header, HTTPException
from telegram import Update
from app.services.bot_service import _bot_app

router = APIRouter(prefix="/bot", tags=["Bot Webhook"])
logger = logging.getLogger("reminote.bot")

@router.post("/webhook")
async def telegram_webhook(request: Request):
    """Entry point for Telegram Webhook updates."""
    if not _bot_app:
        logger.error("Bot Application not initialized. Skipping webhook update.")
        return {"status": "bot_not_initialized"}
        
    try:
        data = await request.json()
        update = Update.de_json(data, _bot_app.bot)
        await _bot_app.process_update(update)
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Error processing Telegram webhook update: {e}")
        return {"status": "error", "message": str(e)}

@router.get("/status")
async def bot_status():
    """Check bot status and token."""
    from app.services.bot_service import get_bot_token
    token = await get_bot_token()
    return {
        "bot_initialized": _bot_app is not None,
        "token_configured": bool(token),
        "bot_username": (await _bot_app.bot.get_me()).username if _bot_app else None
    }
