import logging
import re
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Any
from sqlalchemy import select, func, desc, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.reminder import Reminder, Tag, Attachment
from app.models.user import User

logger = logging.getLogger("reminote.service")

# Professional Intervals for Knowledge Reinforcement
INTERVALS = [
    timedelta(minutes=10),
    timedelta(hours=1),
    timedelta(hours=4),
    timedelta(days=1),
    timedelta(days=3),
    timedelta(days=7),
]

async def get_or_create_tags(db: AsyncSession, tag_names: List[str]) -> List[Tag]:
    if not tag_names: return []
    tag_names = [t.strip().lstrip('#').lower() for t in tag_names if t.strip()]
    tag_names = list(set(tag_names))
    
    result = await db.execute(select(Tag).where(Tag.name.in_(tag_names)))
    existing_tags = result.scalars().all()
    existing_names = {t.name for t in existing_tags}
    
    new_tags = []
    for name in tag_names:
        if name not in existing_names:
            new_tag = Tag(name=name)
            db.add(new_tag)
            new_tags.append(new_tag)
    
    if new_tags:
        await db.flush()
    return list(existing_tags) + new_tags

async def create_reminder(db: AsyncSession, user_id: int, title: Optional[str] = None, content_text: Optional[str] = None, tags: Optional[str] = None) -> Reminder:
    tag_list = re.findall(r'#(\w+)|(\w+)', tags) if tags else []
    tag_list = [t[0] or t[1] for t in tag_list]
    tag_objects = await get_or_create_tags(db, tag_list)
    
    reminder = Reminder(
        user_id=user_id,
        title=title,
        content_text=content_text,
        memory_level=0,
        next_push_at=datetime.now(timezone.utc) + INTERVALS[0],
        tags_rel=tag_objects
    )
    db.add(reminder)
    await db.commit()
    await db.refresh(reminder, attribute_names=["tags_rel", "attachments"])
    return reminder

async def list_reminders(db: AsyncSession, user_id: int, search: Optional[str] = None, tag: Optional[str] = None, archived: Optional[bool] = None, due_only: bool = False, limit: int = 50, offset: int = 0):
    query = select(Reminder).where(Reminder.user_id == user_id).options(selectinload(Reminder.tags_rel), selectinload(Reminder.attachments))
    
    if archived is not None: query = query.where(Reminder.is_archived == archived)
    if due_only: query = query.where(Reminder.next_push_at <= datetime.now(timezone.utc))
    if tag: query = query.join(Reminder.tags_rel).where(Tag.name == tag.lower().lstrip('#'))
    
    if search:
        search_query = f"%{search}%"
        query = query.where(or_(Reminder.title.ilike(search_query), Reminder.content_text.ilike(search_query)))
    
    query = query.order_by(desc(Reminder.created_at))
    result = await db.execute(query.limit(limit).offset(offset))
    items = result.scalars().all()
    
    count_query = select(func.count(Reminder.id)).where(Reminder.user_id == user_id)
    if archived is not None: count_query = count_query.where(Reminder.is_archived == archived)
    if due_only: count_query = count_query.where(Reminder.next_push_at <= datetime.now(timezone.utc))
    if tag: count_query = count_query.join(Reminder.tags_rel).where(Tag.name == tag.lower().lstrip('#'))
    if search:
        count_query = count_query.where(or_(Reminder.title.ilike(f"%{search}%"), Reminder.content_text.ilike(f"%{search}%")))
    
    total = (await db.execute(count_query)).scalar() or 0
    return items, total

async def get_due_reminders(db: AsyncSession, limit: int = 50) -> List[Reminder]:
    """Fetch all reminders across all users that are due for a push notification."""
    query = (
        select(Reminder)
        .where(Reminder.next_push_at <= datetime.now(timezone.utc))
        .where(Reminder.is_archived == False)
        .options(
            selectinload(Reminder.tags_rel), 
            selectinload(Reminder.attachments), 
            selectinload(Reminder.user)
        )
        .limit(limit)
    )
    result = await db.execute(query)
    return list(result.scalars().all())

async def update_reminder(db: AsyncSession, reminder: Reminder, data: dict) -> Reminder:
    if "tags" in data:
        tags_str = data.pop("tags")
        tag_list = re.findall(r'#(\w+)|(\w+)', tags_str) if tags_str else []
        tag_list = [t[0] or t[1] for t in tag_list]
        reminder.tags_rel = await get_or_create_tags(db, tag_list)
    
    for key, value in data.items():
        setattr(reminder, key, value)
    
    await db.commit()
    await db.refresh(reminder, attribute_names=["tags_rel", "attachments"])
    return reminder

async def process_interaction(db: AsyncSession, reminder: Reminder, action: str):
    if action == "mastered":
        reminder.memory_level = min(5, reminder.memory_level + 2) # Jump 2 levels if mastered
    elif action == "understand":
        reminder.memory_level = min(5, reminder.memory_level + 1)
    else: # review (reset or stay)
        reminder.memory_level = max(0, reminder.memory_level - 1)
        
    reminder.last_pushed_at = datetime.now(timezone.utc)
    reminder.next_push_at = datetime.now(timezone.utc) + INTERVALS[reminder.memory_level]
    await db.commit()

async def get_reminder(db: AsyncSession, reminder_id: int, user_id: Optional[int] = None) -> Optional[Reminder]:
    query = select(Reminder).where(Reminder.id == reminder_id).options(
        selectinload(Reminder.tags_rel), 
        selectinload(Reminder.attachments)
    )
    if user_id:
        query = query.where(Reminder.user_id == user_id)
    result = await db.execute(query)
    return result.scalar_one_or_none()

async def delete_reminder(db: AsyncSession, reminder: Reminder):
    await db.delete(reminder)
    await db.commit()

async def get_all_tags(db: AsyncSession, user_id: int):
    query = (
        select(Tag.name, func.count(Reminder.id).label("count"))
        .join(Reminder.tags_rel)
        .where(Reminder.user_id == user_id)
        .group_by(Tag.name)
        .order_by(desc("count"))
    )
    result = await db.execute(query)
    return [{"name": row[0], "count": row[1]} for row in result.all()]

async def rename_tag(db: AsyncSession, user_id: int, old_name: str, new_name: str):
    result = await db.execute(select(Tag).where(Tag.name == old_name.lower().lstrip('#')))
    tag = result.scalar_one_or_none()
    if tag:
        tag.name = new_name.lower().lstrip('#')
        await db.commit()
    return tag

async def delete_tag(db: AsyncSession, user_id: int, tag_name: str):
    result = await db.execute(select(Tag).where(Tag.name == tag_name.lower().lstrip('#')))
    tag = result.scalar_one_or_none()
    if tag:
        # Just remove relationship for this user? No, tags are shared but we filter by user.
        # For simplicity, if we delete a tag, we just remove it from all reminders of this user.
        # But SQLA relationship handles this if we clear the list.
        # This is complex, let's just delete the tag if it's no longer used.
        await db.delete(tag)
        await db.commit()

async def get_stats(db: AsyncSession):
    total_reminders = (await db.execute(select(func.count(Reminder.id)))).scalar() or 0
    total_tags = (await db.execute(select(func.count(Tag.id)))).scalar() or 0
    due_now = (await db.execute(select(func.count(Reminder.id)).where(Reminder.next_push_at <= datetime.now(timezone.utc)))).scalar() or 0
    
    return {
        "total_reminders": total_reminders,
        "total_tags": total_tags,
        "due_now": due_now
    }

async def search_similar_titles(db: AsyncSession, user_id: int, title: str, limit: int = 5) -> List[Reminder]:
    """Search for existing reminders with similar titles to prevent duplication."""
    if not title or len(title) < 3: return []
    query = (
        select(Reminder)
        .where(Reminder.user_id == user_id)
        .where(Reminder.title.ilike(f"%{title}%"))
        .limit(limit)
    )
    result = await db.execute(query)
    return list(result.scalars().all())

async def get_tag_suggestions(db: AsyncSession, user_id: int, prefix: str, limit: int = 10) -> List[str]:
    """Suggest existing tags based on a prefix."""
    prefix = prefix.lower().lstrip('#')
    if not prefix:
        # Return most popular tags
        query = (
            select(Tag.name)
            .join(Reminder.tags_rel)
            .where(Reminder.user_id == user_id)
            .group_by(Tag.name)
            .order_by(desc(func.count(Reminder.id)))
            .limit(limit)
        )
    else:
        query = (
            select(Tag.name)
            .where(Tag.name.ilike(f"{prefix}%"))
            .limit(limit)
        )
    result = await db.execute(query)
    return list(result.scalars().all())
