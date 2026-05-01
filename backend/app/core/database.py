import os
from pathlib import Path

from dotenv import dotenv_values
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker


PROJECT_ROOT = Path(__file__).resolve().parents[3]
BACKEND_ENV_PATH = PROJECT_ROOT / "backend" / ".env"

env_values = dotenv_values(BACKEND_ENV_PATH)

# Prefer backend/.env for this thesis project so stale PowerShell env vars do not hijack the DB URL.
DATABASE_URL = (
    env_values.get("DATABASE_URL")
    or os.getenv("DATABASE_URL")
    or "postgresql://postgres:postgres@127.0.0.1:5432/yaobox_db"
).strip()

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is missing. Add it to backend/.env.")

connect_args = {}

if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
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