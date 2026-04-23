from fastapi import FastAPI
import os

from app.api.routes import auth, scans
from app.core.database import Base, engine
from app.models.user import User
from app.models.scan import ScanRecord
from app.api.routes import reminders


Base.metadata.create_all(bind=engine)
os.makedirs("uploads", exist_ok=True)

app = FastAPI(title="Yaobox API", version="0.1.0")

app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(scans.router, prefix="/scans", tags=["Scans"])
app.include_router(reminders.router)

@app.get("/")
def root():
    return {"message": "Yaobox backend is running"}