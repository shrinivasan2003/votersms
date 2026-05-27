import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

# Load environment variables from .env (project root)
load_dotenv()

# Build the SQLAlchemy database URL
# Expected .env vars: DB_USER, DB_PASS, DB_HOST, DB_PORT, DB_NAME
DB_URL = (
    f"mysql+pymysql://"
    f"{os.getenv('DB_USER', 'root')}:{os.getenv('DB_PASS', '')}@"
    f"{os.getenv('DB_HOST', 'localhost')}:{os.getenv('DB_PORT', '3306')}/"
    f"{os.getenv('DB_NAME', 'votersms')}"
)

# Create the engine with connection pooling and ping support
engine = create_engine(DB_URL, pool_pre_ping=True)

# Session factory – each FastAPI request will get its own Session instance
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for ORM models
Base = declarative_base()

def get_db():
    """FastAPI dependency that yields a SQLAlchemy Session.
    The session is closed automatically after the request finishes.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_db_connection():
    """Return a raw connection for legacy raw‑SQL routers.
    Uses the SQLAlchemy engine's `connect()` method. Caller must close.
    """
    return engine.connect()
