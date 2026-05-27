import sys
from app.database import SessionLocal
from app.models import User
db = SessionLocal()
users = db.query(User).all()
for u in users:
    print(f"Username: {u.username}, Role: {u.role}")
db.close()
