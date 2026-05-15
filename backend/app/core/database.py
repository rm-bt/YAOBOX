import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker


def load_backend_env() -> None:
    """
    Load backend/.env reliably whether the backend is started from:
    - project root
    - backend/
    - VS Code terminal
    """
    backend_dir = Path(__file__).resolve().parents[2]
    env_path = backend_dir / ".env"

    if env_path.exists():
        load_dotenv(env_path)


load_backend_env()

DATABASE_URL = os.getenv("DATABASE_URL", "").strip()

if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL is missing. Create backend/.env and set DATABASE_URL."
    )

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()