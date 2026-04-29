from datetime import datetime
from pydantic import BaseModel


class ReminderCreate(BaseModel):
    scan_id: int | None = None
    medicine_id: str | None = None
    medicine_name: str | None = None
    dosage: str | None = None
    dosage_note: str | None = None
    reminder_time: datetime
    frequency: str = "daily"
    is_active: bool = True


class ReminderUpdate(BaseModel):
    scan_id: int | None = None
    medicine_id: str | None = None
    medicine_name: str | None = None
    dosage: str | None = None
    dosage_note: str | None = None
    reminder_time: datetime | None = None
    frequency: str | None = None
    is_active: bool | None = None


class ReminderResponse(BaseModel):
    id: int
    scan_id: int | None = None
    medicine_id: str | None = None
    medicine_name: str
    dosage: str | None = None
    dosage_note: str | None = None
    reminder_time: datetime
    frequency: str
    is_active: bool
    created_at: datetime | None = None

    class Config:
        from_attributes = True