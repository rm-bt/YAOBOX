from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.sql import func
from app.core.database import Base


class Reminder(Base):
    __tablename__ = "reminders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    scan_id = Column(Integer, ForeignKey("scan_records.id"), nullable=True)

    # keep this as string for now because the current repo has no medicines table yet
    medicine_id = Column(String(255), nullable=True)

    medicine_name = Column(String(255), nullable=False)
    dosage = Column(String(100), nullable=True)
    dosage_note = Column(Text, nullable=True)

    reminder_time = Column(DateTime(timezone=True), nullable=False)
    frequency = Column(String(50), nullable=False, default="daily")
    is_active = Column(Boolean, nullable=False, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())