import logging
import random
from datetime import datetime, timezone, timedelta
from sqlalchemy import select
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from app.database import async_session
from app.models.user import User
from app.services.reminder_service import get_due_reminders
from app.services.bot_service import send_reminder_push

logger = logging.getLogger("reminote.scheduler")
scheduler = AsyncIOScheduler()

MESSAGES = [
    "🧠 **Neural Focus Needed:** Một mảnh tri thức đang chờ bạn xử lý:",
    "🔥 **Deep Learning Trigger:** Hãy đối mặt với Node này trước khi đi tiếp:",
    "📢 **Sequential Reinforcement:** Hệ thống yêu cầu bạn xử lý fragment này:",
    "⏳ **Persistence Mode:** Kiến thức này vẫn đang chờ được củng cố:",
    "🎯 **Priority Target:** Đừng để Node này bị đứt gãy liên kết:",
    "⚡ **Single-Point Attention:** Tập trung vào mảnh dữ liệu duy nhất này:",
]

async def check_and_push():
    """
    SEQUENTIAL FOCUS SCHEDULER (V2):
    1. Implements 'One-by-One' notification logic.
    2. Respects quiet hours and user intervals.
    3. Forces user to interact with the current pending item before showing new ones.
    """
    print("DEBUG: [V2] Sequential Scheduler scanning for the most urgent fragment...")
    async with async_session() as db:
        try:
            # 0. Fetch Global Settings
            from app.models.setting import SystemSetting
            global_settings_res = await db.execute(select(SystemSetting).where(SystemSetting.category == "scheduler"))
            g_set = {s.key: s.value for s in global_settings_res.scalars().all()}
            
            g_interval = int(g_set.get("GLOBAL_PUSH_INTERVAL", 60))
            g_start = int(g_set.get("GLOBAL_ACTIVE_START", 8))
            g_end = int(g_set.get("GLOBAL_ACTIVE_END", 22))
            
            now = datetime.now(timezone.utc)
            current_hour = (now + timedelta(hours=7)).hour 

            # 0.1 Check Global Active Window
            is_global_active = False
            if g_start > g_end: # Cross midnight
                if current_hour >= g_start or current_hour < g_end:
                    is_global_active = True
            else:
                if g_start <= current_hour < g_end:
                    is_global_active = True
            
            if not is_global_active:
                return

            # 1. Fetch all active users
            result = await db.execute(select(User).where((User.telegram_chat_id != None) | (User.sso_user_id != None)))
            users = result.scalars().all()
            
            for user in users:
                # 2. Respect Push Intervals
                effective_interval = max(g_interval, user.push_interval_minutes)
                
                if user.last_pushed_at:
                    elapsed = (now - user.last_pushed_at.replace(tzinfo=timezone.utc)).total_seconds() / 60
                    if elapsed < effective_interval:
                        continue

                # 3. Respect User-specific Quiet Hours
                is_quiet = False
                if user.quiet_hour_start > user.quiet_hour_end:
                    if current_hour >= user.quiet_hour_start or current_hour < user.quiet_hour_end:
                        is_quiet = True
                else:
                    if user.quiet_hour_start <= current_hour < user.quiet_hour_end:
                        is_quiet = True
                
                if is_quiet:
                    continue

                # 4. SEQUENTIAL FOCUS: Fetch only ONE most urgent item
                from app.models.reminder import Reminder
                from sqlalchemy.orm import selectinload
                
                # We sort by next_push_at ASC to get the most urgent/overdue item
                stmt = (
                    select(Reminder)
                    .where(Reminder.user_id == user.id)
                    .where(Reminder.next_push_at <= now)
                    .where(Reminder.is_archived == False)
                    .options(selectinload(Reminder.attachments))
                    .order_by(Reminder.next_push_at.asc()) # Focus on the most overdue
                    .limit(1) 
                )
                res = await db.execute(stmt)
                item = res.scalar_one_or_none()

                if not item:
                    continue

                # 5. Execute Push
                from app.services import bot_service
                try:
                    # Telegram Push
                    tg_enabled_res = await db.execute(select(SystemSetting).where(SystemSetting.key == "ENABLE_TELEGRAM_PUSH"))
                    tg_enabled = (tg_enabled_res.scalar_one_or_none().value or "true").lower() == "true"

                    if tg_enabled and bot_service.bot and user.telegram_chat_id:
                        image_path = item.attachments[0].file_path if item.attachments else None
                        await bot_service.send_reminder_push(
                            chat_id=user.telegram_chat_id,
                            reminder_id=item.id,
                            title=item.title or "Untitled Node",
                            content=item.content_text or "",
                            image_path=image_path
                        )
                    
                    # Web Push check
                    web_enabled_res = await db.execute(select(SystemSetting).where(SystemSetting.key == "ENABLE_WEB_PUSH"))
                    web_enabled = (web_enabled_res.scalar_one_or_none().value or "true").lower() == "true"
                    if web_enabled:
                        from app.services.push_service import broadcast_web_push
                        await broadcast_web_push(user.id, {
                            "title": f"🧠 Focus: {item.title or 'New Node'}",
                            "body": "Hãy xử lý Node này để tiếp tục hành trình tri thức.",
                            "url": f"http://127.0.0.1:5070/reminders/{item.id}"
                        })
                    
                    # Update last pushed at
                    user.last_pushed_at = now
                    await db.commit()
                    logger.info(f"Sequential push sent to {user.username} for item {item.id}")
                    
                except Exception as ex:
                    logger.error(f"Error sending sequential push to {user.username}: {ex}")

        except Exception as e:
            logger.error(f"Scheduler error: {e}")

def start_scheduler():
    if not scheduler.running:
        scheduler.add_job(
            check_and_push,
            trigger=IntervalTrigger(seconds=60), # Set to 1 min for production focus
            id="push_check",
            name="Sequential Focus Check",
            replace_existing=True,
        )
        scheduler.start()
        logger.info("Sequential Focus Scheduler started (60s interval).")

def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Sequential Focus Scheduler stopped.")
