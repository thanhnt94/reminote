"""User model — supports both internal login and CentralAuth SSO."""

from datetime import datetime, timezone
from sqlalchemy import String, Boolean, Integer, DateTime, ForeignKey, Column
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    email: Mapped[str | None] = mapped_column(String(200), nullable=True)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    sso_user_id: Mapped[int | None] = mapped_column(Integer, nullable=True, unique=True)
    telegram_chat_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    telegram_link_code: Mapped[str | None] = mapped_column(String(10), nullable=True, unique=True)
    
    # Notification Settings
    push_interval_minutes: Mapped[int] = mapped_column(Integer, default=60)
    quiet_hour_start: Mapped[int] = mapped_column(Integer, default=23)  # 23:00
    quiet_hour_end: Mapped[int] = mapped_column(Integer, default=7)     # 07:00
    last_pushed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    reminders = relationship("Reminder", back_populates="user", cascade="all, delete-orphan")
    web_push_subscriptions = relationship("WebPushSubscription", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User {self.username} (admin={self.is_admin})>"

class WebPushSubscription(Base):
    __tablename__ = "web_push_subscriptions"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    endpoint = Column(String, unique=True, nullable=False)
    p256dh = Column(String, nullable=False)
    auth = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.now)

    user = relationship("User", back_populates="web_push_subscriptions")

class TelegramConnection(Base):
    __tablename__ = "telegram_connections"
    
    username: Mapped[str] = mapped_column(String(100), primary_key=True)
    chat_id: Mapped[str] = mapped_column(String(50), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
