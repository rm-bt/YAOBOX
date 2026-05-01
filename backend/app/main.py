import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect, text

from app.api.routes import auth, history, reminders, scans, users
from app.api.routes.medicines import router as medicines_router
from app.core.database import Base, engine
from app.models.medicine import Medicine
from app.models.reminder import Reminder
from app.models.scan import ScanRecord
from app.models.user import User


def ensure_scan_trust_columns() -> None:
    """
    Temporary database compatibility helper.

    This keeps the thesis MVP working without forcing Alembic migration setup right now.
    Later, this should be replaced by real Alembic migrations.
    """
    required_columns = {
        "source_type": "VARCHAR(64)",
        "match_status": "VARCHAR(64)",
        "ocr_status": "VARCHAR(64)",
        "ai_status": "VARCHAR(64)",
        "ocr_confidence": "FLOAT",
        "ai_confidence": "VARCHAR(64)",
        "trust_notes": "TEXT",
    }

    inspector = inspect(engine)
    existing_columns = {
        column["name"]
        for column in inspector.get_columns("scan_records")
    }

    missing_columns = [
        (name, column_type)
        for name, column_type in required_columns.items()
        if name not in existing_columns
    ]

    if not missing_columns:
        return

    with engine.begin() as connection:
        for name, column_type in missing_columns:
            connection.execute(
                text(f"ALTER TABLE scan_records ADD COLUMN {name} {column_type}")
            )


Base.metadata.create_all(bind=engine)
ensure_scan_trust_columns()

os.makedirs("uploads", exist_ok=True)

app = FastAPI(title="Yaobox API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(users.router)
app.include_router(scans.router, prefix="/scans", tags=["Scans"])
app.include_router(history.router)
app.include_router(reminders.router)
app.include_router(medicines_router)


@app.get("/")
def root():
    return {"message": "Yaobox backend is running"}