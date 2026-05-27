from passlib.context import CryptContext

# PBKDF2 SHA256 context for password hashing (no external binary dependencies)
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

def hash_password(password: str) -> str:
    """Return a PBKDF2-SHA256 hash of the given password."""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against its PBKDF2-SHA256 hash."""
    return pwd_context.verify(plain_password, hashed_password)
