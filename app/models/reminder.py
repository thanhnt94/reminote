from datetime import datetime, timezone, timedelta
from typing import Optional, List
from sqlalchemy import String, Integer, DateTime, ForeignKey, Boolean, Table, Column
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

# Join table for many-to-many relationship between Reminders and Tags
reminder_tags = Table(
    "reminder_tags",
    Base.metadata,
    Column("reminder_id", Integer, ForeignKey("reminders.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)

class Tag(Base):
    __tablename__ = "tags"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    color: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    
    reminders: Mapped[List["Reminder"]] = relationship(
        secondary=reminder_tags, back_populates="tags_rel"
    )

class Reminder(Base):
    __tablename__ = "reminders"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    
    title: Mapped[Optional[str]] = mapped_column(String(200), nullable=True) # Added Title
    content_text: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    
    memory_level: Mapped[int] = mapped_column(Integer, default=0)
    priority_score: Mapped[float] = mapped_column(default=500.0) # NRS Base Score
    manual_weight: Mapped[str] = mapped_column(String(20), default="medium") # low, medium, high
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_pushed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    last_reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    next_push_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False)

    user: Mapped["User"] = relationship(back_populates="reminders")
    attachments: Mapped[List["Attachment"]] = relationship(back_populates="reminder", cascade="all, delete-orphan")
    tags_rel: Mapped[List[Tag]] = relationship(
        secondary=reminder_tags, back_populates="reminders"
    )

class Attachment(Base):
    __tablename__ = "attachments"

    id: Mapped[int] = mapped_column(primary_key=True)
    reminder_id: Mapped[int] = mapped_column(ForeignKey("reminders.id", ondelete="CASCADE"))
    
    file_path: Mapped[str] = mapped_column(String)
    original_filename: Mapped[str] = mapped_column(String)
    file_size: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    content_type: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    reminder: Mapped["Reminder"] = relationship(back_populates="attachments")
