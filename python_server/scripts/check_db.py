import os
import pymysql
import pymysql.cursors
from dotenv import load_dotenv

load_dotenv()

def checkCounties():
    connection = pymysql.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", 3306)),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASS", ""),
        database=os.getenv("DB_NAME", "votersms"),
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=True
    )
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT * FROM counties")
            print(cursor.fetchall())
            cursor.execute("INSERT INTO counties (code, name, state) VALUES ('001', 'Fulton', 'GA')")
            print(cursor.fetchall())
    except Exception as e:
        print("Error:", e)
    finally:
        connection.close()

if __name__ == '__main__':
    checkCounties()
