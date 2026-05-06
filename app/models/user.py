"""User model — supports both internal login and CentralAuth SSO."""

from datetime import datetime, timezone
from sqlalchemy import String, Boolean, Integer, DateTime
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
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    reminders = relationship("Reminder", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User {self.username} (admin={self.is_admin})>"
