import sqlite3
import os

db_path = r'c:\Code\Ecosystem\Storage\database\reminote.db'

def migrate():
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    columns_to_add = [
        ("push_interval_minutes", "INTEGER DEFAULT 60"),
        ("quiet_hour_start", "INTEGER DEFAULT 23"),
        ("quiet_hour_end", "INTEGER DEFAULT 7"),
        ("last_pushed_at", "DATETIME")
    ]
    
    for col_name, col_type in columns_to_add:
        try:
            cursor.execute(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}")
            print(f"Added column {col_name}")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e).lower():
                print(f"Column {col_name} already exists.")
            else:
                print(f"Error adding {col_name}: {e}")
                
    conn.commit()
    conn.close()
    print("Migration finished.")

if __name__ == "__main__":
    migrate()
