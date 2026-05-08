import asyncio
from app.database import async_session
from app.models.reminder import Tag
from sqlalchemy import select

async def check_tags():
    async with async_session() as db:
        res = await db.execute(select(Tag))
        tags = res.scalars().all()
        print(f"Total tags in DB: {len(tags)}")
        for t in tags:
            print(f"ID: {t.id}, Name: '{t.name}'")
        
        null_tags = [t for t in tags if t.name is None or t.name.strip() == ""]
        if null_tags:
            print(f"Found {len(null_tags)} invalid tags. Cleaning up...")
            for t in null_tags:
                await db.delete(t)
            await db.commit()
            print("Cleanup complete.")
        else:
            print("No invalid tags found.")

if __name__ == "__main__":
    asyncio.run(check_tags())
