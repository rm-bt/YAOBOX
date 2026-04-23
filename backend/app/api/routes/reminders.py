from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.routes.auth import get_current_user
from app.models.user import User
from app.models.reminder import Reminder
from app.schemas.reminder import ReminderCreate, ReminderResponse
from app.models.scan import ScanRecord

router = APIRouter(prefix="/reminders", tags=["Reminders"])


@router.post("/", response_model=ReminderResponse)
def create_reminder(
    data: ReminderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    medicine_name = data.medicine_name
    dosage = data.dosage

    if data.scan_id:
        scan = db.query(ScanRecord).filter(
            ScanRecord.id == data.scan_id,
            ScanRecord.user_id == current_user.id
        ).first()

        if not scan:
            raise HTTPException(status_code=404, detail="Scan not found")

        medicine_name = scan.medicine_name
        dosage = scan.dosage

    if not medicine_name:
        raise HTTPException(status_code=400, detail="Medicine name required")

    reminder = Reminder(
        user_id=current_user.id,
        medicine_name=medicine_name,
        dosage=dosage,
        reminder_time=data.reminder_time,
    )

    db.add(reminder)
    db.commit()
    db.refresh(reminder)

    return reminder


@router.get("/", response_model=list[ReminderResponse])
def get_my_reminders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(Reminder).filter(Reminder.user_id == current_user.id).all()