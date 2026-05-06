"""Scheduler Service — APScheduler for periodic push notifications."""

import logging
import random
from datetime import datetime
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from app.database import async_session
from app.services.reminder_service import get_due_reminders
from app.services.bot_service import send_reminder_push

logger = logging.getLogger("reminote.scheduler")

scheduler = AsyncIOScheduler()

# Danh sách các câu "ép học" vui vẻ
MESSAGES = [
    "🧠 Đừng để nếp nhăn não bị phẳng ra! Review ngay:",
    "🔥 Kiến thức này đang bốc cháy, dập lửa bằng cách học đi:",
    "📢 Alo alo! Bộ nhớ não đang yêu cầu truy cập dữ liệu này:",
    "⏳ Thời gian trôi qua, kiến thức bay xa... Giữ nó lại:",
    "🎯 Mục tiêu là thuộc lòng, không phải thuộc 'lòng vòng':",
    "⚡ Nhồi ngay kẻo lỡ, trí nhớ không chờ đợi ai:",
    "🤖 Bot nhắc lần thứ n: Học bài đi bạn ơi!",
]

async def check_and_push():
    """
    Periodic task: find all due reminders and trigger push notifications.
    Runs every 60 seconds.
    """
    async with async_session() as db:
        try:
            due_reminders = await get_due_reminders(db, limit=50)
            if due_reminders:
                logger.info(f"Found {len(due_reminders)} due reminders to push.")
                for reminder in due_reminders:
                    if not reminder.user.telegram_chat_id:
                        logger.warning(f"  → Skipping #{reminder.id}: User {reminder.user.username} has no telegram_chat_id.")
                        continue
                        
                    # Check for attachments
                    image_path = None
                    if reminder.attachments:
                        image_path = reminder.attachments[0].file_path
                    
                    # Randomize message prefix
                    prefix = random.choice(MESSAGES)
                    message_text = f"{prefix}\n\n{reminder.content_text or '(Ghi chú hình ảnh)'}"
                    
                    success = await send_reminder_push(
                        chat_id=reminder.user.telegram_chat_id,
                        reminder_id=reminder.id,
                        text=message_text,
                        image_path=image_path
                    )
                    
                    if success:
                        logger.info(f"  → Pushed #{reminder.id} to {reminder.user.username}")
                    else:
                        logger.error(f"  → Failed to push #{reminder.id}")
        except Exception as e:
            logger.error(f"Scheduler error: {e}")

def start_scheduler():
    """Start the APScheduler with the check_and_push job."""
    # Ensure we don't start multiple times
    if not scheduler.running:
        scheduler.add_job(
            check_and_push,
            trigger=IntervalTrigger(seconds=60),
            id="push_check",
            name="Check due reminders and push",
            replace_existing=True,
        )
        scheduler.start()
        logger.info("APScheduler started — checking due reminders every 60s.")

def stop_scheduler():
    """Shutdown the scheduler gracefully."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("APScheduler stopped.")
