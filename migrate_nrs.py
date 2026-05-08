import sqlite3
import os

# Updated path based on search result
db_path = os.path.join('Storage', 'database', 'reminote.db')

if not os.path.exists(db_path):
    # Try absolute path just in case
    db_path = r'C:\Code\Ecosystem\reminote\Storage\database\reminote.db'

if not os.path.exists(db_path):
    print(f"Error: Database not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print(f"Starting NRS Migration for: {db_path}")

try:
    # Add priority_score
    try:
        cursor.execute('ALTER TABLE reminders ADD COLUMN priority_score FLOAT DEFAULT 500.0')
        print("Success: Added priority_score column")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            print("Info: priority_score column already exists")
        else:
            print(f"Error adding priority_score: {e}")

    # Add manual_weight
    try:
        cursor.execute("ALTER TABLE reminders ADD COLUMN manual_weight VARCHAR DEFAULT 'medium'")
        print("Success: Added manual_weight column")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            print("Info: manual_weight column already exists")
        else:
            print(f"Error adding manual_weight: {e}")

    # Add last_reviewed_at
    try:
        cursor.execute('ALTER TABLE reminders ADD COLUMN last_reviewed_at DATETIME')
        print("Success: Added last_reviewed_at column")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            print("Info: last_reviewed_at column already exists")
        else:
            print(f"Error adding last_reviewed_at: {e}")

    conn.commit()
    print("Migration completed successfully!")

except Exception as e:
    print(f"Migration failed: {e}")
    conn.rollback()
finally:
    conn.close()
