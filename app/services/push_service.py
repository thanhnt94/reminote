import logging
import json
from pywebpush import webpush, WebPushException
from sqlalchemy import select
from app.database import async_session
from app.models.setting import SystemSetting
from app.models.user import WebPushSubscription

logger = logging.getLogger("reminote.push")

async def get_vapid_keys():
    async with async_session() as db:
        pub_result = await db.execute(select(SystemSetting).where(SystemSetting.key == "VAPID_PUBLIC_KEY"))
        priv_result = await db.execute(select(SystemSetting).where(SystemSetting.key == "VAPID_PRIVATE_KEY"))
        
        pub = pub_result.scalar_one_or_none()
        priv = priv_result.scalar_one_or_none()
        
        if pub and priv and pub.value and priv.value:
            return {"public": pub.value, "private": priv.value}
            
        # If missing, generate new ones (only works if py-vapid is installed)
        try:
            from pyvapid import Vapid
            vapid = Vapid()
            vapid.generate_keys()
            
            # This is a bit tricky in async, but let's assume we can save them
            # For now, if they are missing, return None and we'll seed them in __init__
            return None
        except Exception:
            return None

async def send_web_push(subscription: WebPushSubscription, data: dict):
    """Send a push notification to a specific browser subscription."""
    keys = await get_vapid_keys()
    if not keys:
        logger.error("VAPID keys not configured. Cannot send web push.")
        return False

    try:
        webpush(
            subscription_info={
                "endpoint": subscription.endpoint,
                "keys": {
                    "p256dh": subscription.p256dh,
                    "auth": subscription.auth
                }
            },
            data=json.dumps(data),
            vapid_private_key=keys["private"],
            vapid_claims={"sub": "mailto:admin@reminote.local"},
        )
        return True
    except WebPushException as ex:
        logger.error(f"Web push failed: {ex}")
        if ex.response and ex.response.status_code in [404, 410]:
            # Subscription expired or removed
            async with async_session() as db:
                await db.delete(subscription)
                await db.commit()
        return False
    except Exception as e:
        logger.error(f"Unexpected push error: {e}")
        return False

async def broadcast_web_push(user_id: int, data: dict):
    """Send push to all active browser sessions of a user."""
    async with async_session() as db:
        result = await db.execute(select(WebPushSubscription).where(WebPushSubscription.user_id == user_id))
        subs = result.scalars().all()
        
        success_count = 0
        for sub in subs:
            if await send_web_push(sub, data):
                success_count += 1
        return success_count
