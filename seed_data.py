import asyncio
import random
import uuid
import os
import urllib.request
from datetime import datetime, timedelta
from sqlalchemy import select
from app.database import async_session
from app.models.user import User
from app.models.reminder import Reminder, Attachment, Tag, reminder_tags
from app.services.reminder_service import create_reminder
from app.config import get_settings

SETTINGS = get_settings()

TOPICS = [
    ("Quantum Physics", "Quantum entanglement is a physical phenomenon that occurs when pairs or groups of particles are generated, interact, or share spatial proximity."),
    ("Neural Networks", "Artificial neural networks are computing systems inspired by the biological neural networks that constitute animal brains."),
    ("Blade Runner 2049", "A young Blade Runner's discovery of a long-buried secret leads him to track down former Blade Runner Rick Deckard."),
    ("Cyberpunk Aesthetic", "Cyberpunk is a subgenre of science fiction in a futuristic setting that tends to focus on a combination of low life and high tech."),
    ("Deep Learning", "Deep learning is part of a broader family of machine learning methods based on artificial neural networks with representation learning."),
    ("Space Exploration", "The discovery and exploration of celestial structures in outer space by means of evolving and growing space technology."),
    ("Ancient Philosophy", "Philosophy in the classical world, ranging from the early Pre-Socratics to the late Neoplatonists."),
    ("Digital Art", "An artistic work or practice that uses digital technology as part of the creative or presentation process."),
    ("Python Programming", "Python is an interpreted, high-level and general-purpose programming language."),
    ("FastAPI Framework", "FastAPI is a modern, fast (high-performance), web framework for building APIs with Python 3.7+."),
]

TAG_POOL = ["Science", "Tech", "Art", "Movie", "AI", "Learning", "Physics", "Future", "Code", "Mindset"]

async def seed():
    async with async_session() as db:
        # Get admin user
        result = await db.execute(select(User).where(User.username == "admin"))
        user = result.scalar_one_or_none()
        if not user:
            print("Admin user not found. Please run the app first to create default admin.")
            return

        print(f"Seeding 100 notes for user: {user.username}...")

        upload_dir = SETTINGS.UPLOAD_DIR
        if not os.path.exists(upload_dir):
            os.makedirs(upload_dir)

        for i in range(100):
            topic, content = random.choice(TOPICS)
            title = f"{topic} #{i+1}"
            
            # Random tags as string
            num_tags = random.randint(0, 4)
            tags_list = random.sample(TAG_POOL, num_tags)
            tags_str = " ".join([f"#{t}" for t in tags_list])
            
            # Create reminder
            reminder = await create_reminder(db, user.id, title=title, content_text=content, tags=tags_str)
            
            # Random memory level and next push
            reminder.memory_level = random.randint(0, 5)
            reminder.next_push_at = datetime.now() + timedelta(hours=random.randint(-48, 72))
            
            # 70% chance of having an image
            if random.random() < 0.7:
                try:
                    img_id = str(uuid.uuid4())
                    img_filename = f"seed_{img_id}.jpg"
                    img_path = os.path.join(upload_dir, img_filename)
                    
                    # Download random image from picsum
                    img_url = f"https://picsum.photos/seed/{img_id}/800/600"
                    urllib.request.urlretrieve(img_url, img_path)
                    
                    attachment = Attachment(
                        reminder_id=reminder.id,
                        file_path=img_filename,
                        original_filename=f"image_{i}.jpg",
                        file_size=os.path.getsize(img_path),
                        content_type="image/jpeg"
                    )
                    db.add(attachment)
                except Exception as e:
                    print(f"Failed to download image for note {i}: {e}")

            if i % 10 == 0:
                print(f"Progress: {i}%")
                await db.commit()

        await db.commit()
        print("Successfully seeded 100 notes with random images and tags!")

if __name__ == "__main__":
    asyncio.run(seed())
