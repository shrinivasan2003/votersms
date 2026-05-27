import sys, os
# Ensure the project root (one level up) is in PYTHONPATH for imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import User as UserModel
from app.utils.password import hash_password
from app.database import engine, Base

# Create a Session
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def hash_existing_passwords():
    """Iterate over all users and hash passwords that are not already hashed.
    If a plaintext password is longer than 72 bytes (bcrypt limit), it will be
    truncated to 72 bytes before hashing. Errors from the bcrypt backend are
    caught and logged, allowing the script to continue processing other users.
    """
    session = SessionLocal()
    try:
        users = session.query(UserModel).all()
        for user in users:
            pwd = getattr(user, "password", None)
            # If the stored password is not a pbkdf2_sha256 hash, re‑hash it using the current scheme
            if pwd and not pwd.startswith("$pbkdf2-"):
                try:
                    new_hash = hash_password(pwd)
                except Exception as exc:
                    print(f"Failed to hash password for user id={user.id}: {exc}")
                    continue
                setattr(user, "password", new_hash)
                print(f"Hashed password for user id={user.id}")
        session.commit()
    finally:
        session.close()

def ensure_admin():
    """Create an admin user if it does not exist, or ensure its password is hashed correctly."""
    session = SessionLocal()
    try:
        admin = session.query(UserModel).filter(UserModel.username == "admin").first()
        if not admin:
            admin_user = UserModel(
                username="admin",
                name="Admin User",
                password=hash_password("admin123"),
                role="admin",
                status="active",
            )
            session.add(admin_user)
            session.commit()
            print("Created admin user.")
        else:
            # If password is stored in plain text or not using the current scheme, rehash it
            if not admin.password.startswith("$pbkdf2-" ):
                admin.password = hash_password("admin123")
                session.commit()
                print("Rehashed admin password.")
            else:
                print("Admin user already exists with proper hash.")
    finally:
        session.close()

if __name__ == "__main__":
    # Ensure tables are reflected (metadata already loaded via automap)
    hash_existing_passwords()
    ensure_admin()
