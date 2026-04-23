from pydantic import BaseModel
from datetime import datetime


class ReminderCreate(BaseModel):
    scan_id: int | None = None
    medicine_name: str | None = None
    dosage: str | None = None
    reminder_time: datetime


class ReminderResponse(BaseModel):
    id: int
    medicine_name: str
    dosage: str | None
    reminder_time: datetime

    class Config:
        from_attributes = True