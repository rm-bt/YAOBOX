from pathlib import Path
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Absolute path to backend/.env
ENV_PATH = Path(__file__).resolve().parents[2] / ".env"

print("Looking for .env at:", ENV_PATH)

# Force load
load_dotenv(dotenv_path=ENV_PATH, override=True)

DATABASE_URL = os.getenv("DATABASE_URL")

print("DATABASE_URL USED:", DATABASE_URL)

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is missing. .env not loaded.")

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