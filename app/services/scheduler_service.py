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
    "🧠 Đã đến lúc 'nạp' thêm dữ liệu vào bộ não của bạn:",
    "🔥 Knowledge Digest mới nhất dành cho bạn đây:",
    "📢 Bộ nhớ đang cần đồng bộ hóa các Node kiến thức này:",
    "⏳ Đừng để tri thức trôi vào quên lãng, review ngay:",
    "🎯 Chào Node Operator! Đây là các dữ liệu cần xử lý:",
    "⚡ High-Impact Nodes đang chờ bạn quẹt thẻ:",
]

async def check_and_push():
    """
    User-centric scheduler:
    1. Respects quiet hours.
    2. Respects push intervals.
    3. Batches reminders into a single digest.
    """
    print("DEBUG: Scheduler scanning for due knowledge fragments...")
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
            # Simple local hour check (Assuming UTC+7 for logic, ideally use TZ from settings)
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
                print(f"DEBUG: System is in global quiet hours ({g_start}-{g_end}). Current hour: {current_hour}. Sleeping.")
                return

            # 1. Fetch all users with telegram/web push capability
            result = await db.execute(select(User).where((User.telegram_chat_id != None) | (User.sso_user_id != None)))
            users = result.scalars().all()
            
            for user in users:
                print(f"DEBUG: Processing user {user.username}...")
                
                # 2. Check Global & User Intervals (Whichever is larger or just use global if admin insists)
                # For now, we prioritize Global Interval as a floor
                effective_interval = max(g_interval, user.push_interval_minutes)
                
                if user.last_pushed_at:
                    elapsed = (now - user.last_pushed_at.replace(tzinfo=timezone.utc)).total_seconds() / 60
                    if elapsed < effective_interval:
                        print(f"DEBUG: User {user.username} not ready (Global/User Interval {effective_interval}m, elapsed {elapsed:.1f}m). skipping.")
                        continue

                # 3. Check User-specific Quiet Hours (Secondary layer)
                is_quiet = False
                if user.quiet_hour_start > user.quiet_hour_end:
                    if current_hour >= user.quiet_hour_start or current_hour < user.quiet_hour_end:
                        is_quiet = True
                else:
                    if user.quiet_hour_start <= current_hour < user.quiet_hour_end:
                        is_quiet = True
                
                if is_quiet:
                    print(f"DEBUG: User {user.username} is in quiet hours ({user.quiet_hour_start}-{user.quiet_hour_end}). skipping.")
                    continue

                # 4. Fetch due reminders for this user
                from app.models.reminder import Reminder
                from sqlalchemy.orm import selectinload
                
                stmt = (
                    select(Reminder)
                    .where(Reminder.user_id == user.id)
                    .where(Reminder.next_push_at <= now)
                    .where(Reminder.is_archived == False)
                    .options(selectinload(Reminder.attachments))
                    .order_by(Reminder.memory_level.asc())
                    .limit(5) # Batch of 5
                )
                res = await db.execute(stmt)
                due_items = res.scalars().all()

                if not due_items:
                    print(f"DEBUG: No due items for {user.username}.")
                    continue

                print(f"DEBUG: Found {len(due_items)} due items for {user.username}. Building digest...")
                # 5. Build and Send Digest
                prefix = random.choice(MESSAGES)
                digest_text = f"{prefix}\n\n"
                
                for i, item in enumerate(due_items):
                    title = item.title or "Untitled Knowledge"
                    digest_text += f"{i+1}. **{title}**\n"
                
                digest_text += f"\n👉 Bạn có {len(due_items)} kiến thức cần ôn tập ngay."

                # 5. Check Global Flags
                from app.models.setting import SystemSetting
                tg_enabled_res = await db.execute(select(SystemSetting).where(SystemSetting.key == "ENABLE_TELEGRAM_PUSH"))
                web_enabled_res = await db.execute(select(SystemSetting).where(SystemSetting.key == "ENABLE_WEB_PUSH"))
                
                tg_enabled = (tg_enabled_res.scalar_one_or_none().value or "true").lower() == "true"
                web_enabled = (web_enabled_res.scalar_one_or_none().value or "true").lower() == "true"

                from telegram import InlineKeyboardButton, InlineKeyboardMarkup
                keyboard = [[InlineKeyboardButton("🚀 Open Review Mode", url=f"http://127.0.0.1:5070/review")]]
                reply_markup = InlineKeyboardMarkup(keyboard)

                from app.services import bot_service
                try:
                    # Telegram Push
                    if tg_enabled and bot_service.bot and user.telegram_chat_id:
                        await bot_service.bot.send_message(
                            chat_id=user.telegram_chat_id, 
                            text=digest_text, 
                            reply_markup=reply_markup, 
                            parse_mode='Markdown'
                        )
                        print(f"DEBUG: Telegram digest sent to {user.username}")
                    
                    # Web Push to Chrome
                    if web_enabled:
                        from app.services.push_service import broadcast_web_push
                        await broadcast_web_push(user.id, {
                            "title": "🧠 RemiNote Knowledge OS",
                            "body": f"Bạn có {len(due_items)} kiến thức cần ôn tập ngay.",
                            "url": "http://127.0.0.1:5070/review"
                        })
                        print(f"DEBUG: Web Push broadcasted to {user.username}")
                    
                    # Update last pushed at
                    user.last_pushed_at = now
                    await db.commit()
                    logger.info(f"Sent knowledge digest to {user.username} ({len(due_items)} items)")
                    print(f"DEBUG: SUCCESSFULLY sent digest to {user.username} at {now}")
                    
                except Exception as ex:
                    print(f"DEBUG: FAILED to send push to {user.username}: {ex}")
                    logger.error(f"Error sending push to {user.username}: {ex}")

        except Exception as e:
            logger.error(f"Scheduler error: {e}")

def start_scheduler():
    if not scheduler.running:
        scheduler.add_job(
            check_and_push,
            trigger=IntervalTrigger(seconds=5), # High frequency for testing
            id="push_check",
            name="Smart Digest Check",
            replace_existing=True,
        )
        scheduler.start()
        logger.info("Smart Scheduler started — high frequency mode (5s).")

def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Smart Scheduler stopped.")
