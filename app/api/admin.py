"""Admin API — Settings management, bot testing, stats, user management."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
import httpx

from app.database import get_db
from app.models.user import User
from app.models.setting import SystemSetting
from app.models.reminder import Reminder
from app.schemas.setting import SettingResponse, SettingUpdate
from app.schemas.user import UserResponse
from app.api.auth import require_admin
from app.services import reminder_service
from app.services.bot_service import send_reminder_push

router = APIRouter()


# --- Dashboard Stats ---
@router.get("/stats")
async def get_stats(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get admin dashboard statistics."""
    stats = await reminder_service.get_stats(db)
    user_count = (await db.execute(select(func.count(User.id)))).scalar() or 0
    stats["total_users"] = user_count
    return stats


# --- Settings CRUD ---
@router.get("/settings", response_model=list[SettingResponse])
async def get_settings(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get all system settings."""
    result = await db.execute(select(SystemSetting).order_by(SystemSetting.category, SystemSetting.key))
    settings = result.scalars().all()
    return [SettingResponse.model_validate(s) for s in settings]


@router.put("/settings/{key}", response_model=SettingResponse)
async def update_setting(
    key: str,
    data: SettingUpdate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update a system setting value."""
    result = await db.execute(select(SystemSetting).where(SystemSetting.key == key))
    setting = result.scalar_one_or_none()

    if not setting:
        raise HTTPException(status_code=404, detail=f"Setting '{key}' not found")

    setting.value = data.value
    await db.commit()
    await db.refresh(setting)
    return SettingResponse.model_validate(setting)


# --- Telegram Bot Testing ---
@router.post("/bot/test")
async def test_bot(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Test the configured Telegram bot token by calling getMe."""
    result = await db.execute(
        select(SystemSetting).where(SystemSetting.key == "TELEGRAM_BOT_TOKEN")
    )
    setting = result.scalar_one_or_none()

    if not setting or not setting.value:
        raise HTTPException(status_code=400, detail="Bot token not configured")

    token = setting.value
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"https://api.telegram.org/bot{token}/getMe", timeout=10)
            data = resp.json()

            if data.get("ok"):
                bot_info = data["result"]
                # Try to initialize the bot background task too
                from app.services.bot_service import init_bot_app
                import asyncio
                asyncio.create_task(init_bot_app())
                
                return {
                    "success": True,
                    "bot_name": bot_info.get("first_name"),
                    "bot_username": bot_info.get("username"),
                }
            else:
                return {
                    "success": False,
                    "error": data.get("description", "Unknown error"),
                }
    except httpx.RequestError as e:
        return {"success": False, "error": f"Connection error: {e}"}


@router.post("/bot/setup-webhook")
async def setup_bot_webhook(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Register the webhook URL with Telegram API."""
    token_result = await db.execute(select(SystemSetting).where(SystemSetting.key == "TELEGRAM_BOT_TOKEN"))
    url_result = await db.execute(select(SystemSetting).where(SystemSetting.key == "TELEGRAM_WEBHOOK_URL"))
    
    token = token_result.scalar_one_or_none()
    url = url_result.scalar_one_or_none()
    
    if not token or not token.value:
        raise HTTPException(status_code=400, detail="Bot token not configured")
    if not url or not url.value:
        raise HTTPException(status_code=400, detail="Webhook URL not configured")
        
    token_val = token.value
    webhook_url = url.value
    
    # Ensure the webhook URL points to our new endpoint
    if not webhook_url.endswith("/api/webhook/webhook"):
        webhook_url = f"{webhook_url.rstrip('/')}/api/webhook/webhook"
        
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"https://api.telegram.org/bot{token_val}/setWebhook",
                data={"url": webhook_url},
                timeout=10
            )
            data = resp.json()
            return {
                "success": data.get("ok", False),
                "telegram_response": data
            }
    except Exception as e:
        return {"success": False, "error": str(e)}


# --- User Management ---
@router.get("/users", response_model=list[UserResponse])
async def list_users(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all users."""
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    users = result.scalars().all()
    return [UserResponse.model_validate(u) for u in users]


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    telegram_chat_id: str | None = None,
    is_admin: bool | None = None,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update a user's admin status or telegram chat ID."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if telegram_chat_id is not None:
        user.telegram_chat_id = telegram_chat_id
    if is_admin is not None:
        user.is_admin = is_admin

    await db.commit()
    await db.refresh(user)
    return UserResponse.model_validate(user)


@router.post("/test-push")
async def test_push(
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Send a test push notification to the current user's Telegram."""
    if not user.telegram_chat_id:
        raise HTTPException(
            status_code=400, 
            detail="Bạn chưa kết nối Telegram. Hãy gõ /link với Bot trước."
        )

    # Get a random reminder to test with
    result = await db.execute(select(Reminder).where(Reminder.user_id == user.id).limit(1))
    reminder = result.scalar_one_or_none()

    if reminder:
        text = f"🧪 ĐÂY LÀ TIN NHẮN TEST\n\n{reminder.content_text or '(Ghi chú ảnh)'}"
        rem_id = reminder.id
        image_path = reminder.attachments[0].file_path if reminder.attachments else None
    else:
        text = "🧪 ĐÂY LÀ TIN NHẮN TEST\n\nBạn chưa có ghi chú nào, hãy tạo một cái để test link nhé!"
        rem_id = 0
        image_path = None

    success = await send_reminder_push(
        chat_id=user.telegram_chat_id,
        reminder_id=rem_id,
        text=text,
        image_path=image_path
    )

    if not success:
        raise HTTPException(status_code=500, detail="Gửi thất bại. Kiểm tra cấu hình Bot Token.")

@router.post("/bot/broadcast-test")
async def broadcast_test(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Send a test push to ALL channels (Telegram + Web) of the admin."""
    results = {"telegram": "skipped", "web_push": "skipped"}
    
    # Fetch 1 random reminder for payload
    res = await db.execute(select(Reminder).where(Reminder.user_id == admin.id).limit(1))
    item = res.scalar_one_or_none()
    title = item.title if item else "Neural Test Core"
    
    # 1. Telegram
    if admin.telegram_chat_id:
        from app.services.bot_service import bot
        try:
            if bot:
                await bot.send_message(
                    chat_id=admin.telegram_chat_id, 
                    text=f"🧪 **UNIVERSAL ADMIN TEST**\n\nKiểm tra hệ thống thông báo đa nền tảng.\nNode: {title}",
                    parse_mode='Markdown'
                )
                results["telegram"] = "success"
            else:
                results["telegram"] = "error: bot not initialized"
        except Exception as e:
            results["telegram"] = f"error: {str(e)}"

    # 2. Web Push
    from app.services.push_service import broadcast_web_push
    try:
        count = await broadcast_web_push(admin.id, {
            "title": "🧪 UNIVERSAL ADMIN TEST",
            "body": f"Kiểm tra hệ thống Chrome Push. Node: {title}",
            "url": "http://127.0.0.1:5070/admin"
        })
        results["web_push"] = f"success ({count} devices)"
    except Exception as e:
        results["web_push"] = f"error: {str(e)}"

    return results

@router.post("/sso/test")
async def test_sso_connection(
    db: AsyncSession = Depends(get_db)
):
    """Verify if the CentralAuth server is reachable."""
    from app.models.setting import SystemSetting
    res = await db.execute(select(SystemSetting).where(SystemSetting.key == "CENTRAL_AUTH_URL"))
    url_setting = res.scalar_one_or_none()
    
    if not url_setting or not url_setting.value:
        return {"success": false, "error": "CENTRAL_AUTH_URL not configured"}
        
    url = url_setting.value.rstrip('/')
    try:
        import httpx
        async with httpx.AsyncClient(timeout=5.0) as client:
            # Try to hit the public 'me' or health endpoint of CentralAuth
            # Most CentralAuth servers in this ecosystem have a /api/health or /
            resp = await client.get(f"{url}/")
            if resp.status_code < 500:
                return {"success": True, "message": f"CentralAuth reachable (Status: {resp.status_code})"}
            else:
                return {"success": False, "error": f"Server error: {resp.status_code}"}
    except Exception as e:
        return {"success": False, "error": f"Connection failed: {str(e)}"}
