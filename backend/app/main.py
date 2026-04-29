from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from .api.routes import auth, scans, reminders, users, history
from .api.routes.medicines import router as medicines_router
from .core.database import Base, engine
from .models.user import User
from .models.scan import ScanRecord
from .models.reminder import Reminder
from .models.medicine import Medicine

Base.metadata.create_all(bind=engine)
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