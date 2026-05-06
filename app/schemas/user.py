"""User & Auth Pydantic schemas."""

from datetime import datetime
from pydantic import BaseModel


class UserLogin(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    id: int
    username: str
    email: str | None = None
    is_admin: bool
    telegram_chat_id: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
