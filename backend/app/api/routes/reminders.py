from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.routes.auth import get_current_user
from app.models.user import User
from app.models.reminder import Reminder
from app.schemas.reminder import (
    ReminderCreate,
    ReminderResponse,
    ReminderUpdate,
)
from app.models.scan import ScanRecord

router = APIRouter(prefix="/reminders", tags=["Reminders"])


def normalize_text(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def normalize_frequency(value: str | None) -> str:
    if not value or not value.strip():
        return "daily"
    return value.strip().lower()


def get_user_scan_or_404(
    scan_id: int,
    db: Session,
    current_user: User,
) -> ScanRecord:
    scan = (
        db.query(ScanRecord)
        .filter(
            ScanRecord.id == scan_id,
            ScanRecord.user_id == current_user.id,
        )
        .first()
    )

    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    return scan


def get_user_reminder_or_404(
    reminder_id: int,
    db: Session,
    current_user: User,
) -> Reminder:
    reminder = (
        db.query(Reminder)
        .filter(
            Reminder.id == reminder_id,
            Reminder.user_id == current_user.id,
        )
        .first()
    )

    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")

    return reminder


@router.post("/", response_model=ReminderResponse)
def create_reminder(
    data: ReminderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    scan = None
    if data.scan_id is not None:
        scan = get_user_scan_or_404(data.scan_id, db, current_user)

    medicine_id = normalize_text(data.medicine_id)

    medicine_name = normalize_text(data.medicine_name)
    if not medicine_name and scan and scan.medicine_name:
        medicine_name = normalize_text(scan.medicine_name)
    if not medicine_name and medicine_id:
        # smallest safe fallback for the current repo/frontend mismatch
        medicine_name = medicine_id
    if not medicine_name:
        medicine_name = "Medication reminder"

    dosage = normalize_text(data.dosage)
    if not dosage and scan and scan.dosage:
        dosage = normalize_text(scan.dosage)

    dosage_note = normalize_text(data.dosage_note)
    if not dosage_note and dosage:
        dosage_note = dosage

    reminder = Reminder(
        user_id=current_user.id,
        scan_id=scan.id if scan else data.scan_id,
        medicine_id=medicine_id,
        medicine_name=medicine_name,
        dosage=dosage,
        dosage_note=dosage_note,
        reminder_time=data.reminder_time,
        frequency=normalize_frequency(data.frequency),
        is_active=data.is_active,
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
    reminders = (
        db.query(Reminder)
        .filter(Reminder.user_id == current_user.id)
        .order_by(Reminder.is_active.desc(), Reminder.reminder_time.asc(), Reminder.id.desc())
        .all()
    )
    return reminders


@router.put("/{reminder_id}", response_model=ReminderResponse)
def update_reminder(
    reminder_id: int,
    data: ReminderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    reminder = get_user_reminder_or_404(reminder_id, db, current_user)

    scan = None
    if data.scan_id is not None:
        scan = get_user_scan_or_404(data.scan_id, db, current_user)
        reminder.scan_id = scan.id

    if data.medicine_id is not None:
        reminder.medicine_id = normalize_text(data.medicine_id)

    if data.medicine_name is not None:
        reminder.medicine_name = (
            normalize_text(data.medicine_name)
            or reminder.medicine_id
            or (scan.medicine_name if scan and scan.medicine_name else None)
            or reminder.medicine_name
            or "Medication reminder"
        )

    if data.dosage is not None:
        reminder.dosage = normalize_text(data.dosage)

    if data.dosage_note is not None:
        reminder.dosage_note = normalize_text(data.dosage_note)

    if data.reminder_time is not None:
        reminder.reminder_time = data.reminder_time

    if data.frequency is not None:
        reminder.frequency = normalize_frequency(data.frequency)

    if data.is_active is not None:
        reminder.is_active = data.is_active

    # if scan was changed and medicine_name is still weak, improve it
    if scan and (not reminder.medicine_name or reminder.medicine_name == "Medication reminder"):
        if scan.medicine_name:
            reminder.medicine_name = scan.medicine_name

    # keep dosage_note useful for current frontend display
    if not reminder.dosage_note and reminder.dosage:
        reminder.dosage_note = reminder.dosage

    if not reminder.medicine_name:
        reminder.medicine_name = reminder.medicine_id or "Medication reminder"

    db.commit()
    db.refresh(reminder)

    return reminder


@router.delete("/{reminder_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_reminder(
    reminder_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    reminder = get_user_reminder_or_404(reminder_id, db, current_user)

    db.delete(reminder)
    db.commit()

    return Response(status_code=status.HTTP_204_NO_CONTENT)