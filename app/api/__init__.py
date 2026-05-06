"""API Router aggregation."""

from fastapi import APIRouter
from app.api.auth import router as auth_router
from app.api.reminders import router as reminders_router
from app.api.attachments import router as attachments_router
from app.api.admin import router as admin_router
from app.api.webhook import router as webhook_router

api_router = APIRouter()

api_router.include_router(auth_router, tags=["Auth"])
api_router.include_router(reminders_router, prefix="/api/reminders", tags=["Reminders"])
api_router.include_router(attachments_router, prefix="/api/attachments", tags=["Attachments"])
api_router.include_router(admin_router, prefix="/api/admin", tags=["Admin"])
api_router.include_router(webhook_router, prefix="/api/webhook", tags=["Webhook"])
