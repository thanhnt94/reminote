"""Reminder & Attachment Pydantic schemas."""

from datetime import datetime
from pydantic import BaseModel, ConfigDict
from typing import Literal, List, Optional, Any


class AttachmentResponse(BaseModel):
    id: int
    file_path: str
    original_filename: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ReminderCreate(BaseModel):
    title: str | None = None
    content_text: str | None = None
    tags: str | None = None


class ReminderUpdate(BaseModel):
    title: str | None = None
    content_text: str | None = None
    tags: str | None = None
    is_archived: bool | None = None


class ReminderResponse(BaseModel):
    id: int
    user_id: int
    title: str | None = None
    content_text: str | None = None
    memory_level: int
    next_push_at: datetime
    is_archived: bool
    attachments: list[AttachmentResponse] = []
    created_at: datetime
    tags: list[str] = []

    model_config = ConfigDict(from_attributes=True)
    
    @classmethod
    def model_validate(cls, obj: Any, **kwargs):
        tags = []
        if hasattr(obj, "tags_rel"):
            tags = [t.name for t in obj.tags_rel]
        
        data = {
            "id": obj.id,
            "user_id": obj.user_id,
            "title": obj.title,
            "content_text": obj.content_text,
            "memory_level": obj.memory_level,
            "next_push_at": obj.next_push_at,
            "is_archived": obj.is_archived,
            "attachments": obj.attachments,
            "created_at": obj.created_at,
            "tags": tags
        }
        return cls(**data)


class InteractionRequest(BaseModel):
    action: Literal["understand", "review", "mastered"] # Professional terms


class ReminderListResponse(BaseModel):
    items: list[ReminderResponse]
    total: int


class TagUpdate(BaseModel):
    new_name: str
