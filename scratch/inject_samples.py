import asyncio
import sys
from sqlalchemy import select
from app.database import get_db
from app.models.user import User
from app.models.reminder import Reminder, Tag

# Set encoding for Windows console if needed
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.detach())

async def inject_samples():
    async for db in get_db():
        # Get admin user
        result = await db.execute(select(User).where(User.username == 'admin'))
        admin = result.scalar_one_or_none()
        
        if not admin:
            print("Admin user not found. Skipping.")
            return

        samples = [
            {
                "title": "🧠 Neural Spaced Repetition Comparison",
                "content_text": """### Phương pháp Ghi nhớ Hiệu quả
Hệ thống RemiNote sử dụng thuật toán **Neural Scheduler** để tối ưu hóa việc ôn tập. Dưới đây là bảng so sánh các cấp độ ghi nhớ:

| Level | Strength | Interval | Description |
| :--- | :--- | :--- | :--- |
| **New** | 1 | 15m | Vừa được nạp vào hệ thần kinh |
| **Active** | 3 | 4h | Đang trong giai đoạn củng cố |
| **Mastered** | 7 | 2d | Đã in sâu vào trí nhớ dài hạn |

> "Việc quên là một phần tất yếu của quá trình học tập bền vững." - *RemiNote AI*

Bạn có thể dùng cú pháp `**Bold**` hoặc `*Italic*` để nhấn mạnh các từ khóa quan trọng.""",
                "tags": "#Methodology #Efficiency"
            },
            {
                "title": "⚛️ Feynman Technique: Deep Logic",
                "content_text": """### 4 Bước của Kỹ thuật Feynman
Nếu bạn không thể giải thích điều gì đó một cách đơn giản, bạn chưa thực sự hiểu nó.

1. **Chọn khái niệm**: Viết tên khái niệm lên đầu trang.
2. **Giải thích cho một đứa trẻ**: Dùng ngôn ngữ bình dân nhất.
3. **Xác định lỗ hổng**: Quay lại tài liệu nếu bạn bị "bí".
4. **Đơn giản hóa & So sánh**: Sử dụng các phép ẩn dụ.

#### Ví dụ về Logic Code (Python):
```python
def feynman_learning(topic):
    knowledge = analyze(topic)
    if knowledge.is_complex():
        return simplify(knowledge)
    return "Mastered!"
```

---
*Lưu ý: Luôn đính kèm ảnh sơ đồ để kích hoạt trí nhớ hình ảnh.*""",
                "tags": "#Learning #Feynman #Python"
            },
            {
                "title": "📝 Comprehensive Markdown Mastery",
                "content_text": """### Hướng dẫn Cú pháp RemiNote

#### 1. Formatting thể loại
- ~~Gạch ngang nội dung lỗi~~
- `Inline Code` dùng cho các thuật ngữ kỹ thuật.
- [Truy cập Documentation](https://reminote.io)

#### 2. Phân tách logic
---
Dùng đường kẻ ngang để chia các phần lớn trong ghi chú.

#### 3. Trích dẫn đa dòng
> Đây là một khối trích dẫn chuyên sâu.
> Nó giúp bạn làm nổi bật các định luật hoặc châm ngôn.

#### 4. Bảng tính năng
| Tính năng | Trạng thái |
| :--- | :--- |
| Paste to Upload | ✅ Active |
| Neural Digest | ✅ Active |
| SSO Login | ✅ Ready |

Cảm ơn bạn đã sử dụng **RemiNote Aggressive Knowledge OS**!""",
                "tags": "#Guide #Markdown #Styles"
            }
        ]

        for s in samples:
            # Check if exists to avoid duplicates
            check = await db.execute(select(Reminder).where(Reminder.title == s["title"]))
            if check.scalar_one_or_none():
                continue
                
            reminder = Reminder(
                user_id=admin.id,
                title=s["title"],
                content_text=s["content_text"],
            )
            db.add(reminder)
            await db.flush()
            
            # Add tags
            if s["tags"]:
                tag_list = [t.strip().lstrip('#') for t in s["tags"].split() if t.strip()]
                for tag_name in tag_list:
                    tag_res = await db.execute(select(Tag).where(Tag.name == tag_name))
                    tag = tag_res.scalar_one_or_none()
                    if not tag:
                        tag = Tag(name=tag_name)
                        db.add(tag)
                        await db.flush()
                    
                    # Link via association
                    from app.models.reminder import reminder_tags
                    # Check if already linked
                    check_link = await db.execute(
                        select(reminder_tags).where(
                            reminder_tags.c.reminder_id == reminder.id,
                            reminder_tags.c.tag_id == tag.id
                        )
                    )
                    if not check_link.scalar_one_or_none():
                        await db.execute(
                            reminder_tags.insert().values(reminder_id=reminder.id, tag_id=tag.id)
                        )
        
        await db.commit()
        print("Sample nodes successfully injected.")
        break

if __name__ == "__main__":
    asyncio.run(inject_samples())
