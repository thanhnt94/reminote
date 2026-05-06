"""SystemSetting model — key-value store for runtime config (bot tokens, scheduler, etc.)."""

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class SystemSetting(Base):
    __tablename__ = "system_settings"

    key: Mapped[str] = mapped_column(String(100), primary_key=True)
    value: Mapped[str] = mapped_column(Text, default="")
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    category: Mapped[str | None] = mapped_column(String(50), nullable=True)

    def __repr__(self):
        return f"<Setting {self.key}={self.value[:30]}>"
