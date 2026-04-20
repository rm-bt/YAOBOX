import os
import shutil
from uuid import uuid4

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session

from app.api.routes.auth import get_current_user
from app.core.database import get_db
from app.models.scan import ScanRecord
from app.models.user import User
from app.schemas.scan import ScanCreate, ScanResponse
from app.services.ocr_service import (
    extract_text,
    clean_text,
    translate_text,
    extract_medicine_name,
    extract_manufacturer,
)
router = APIRouter()



@router.post("/", response_model=ScanResponse)
def create_scan(
    scan: ScanCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    new_scan = ScanRecord(
        user_id=current_user.id,
        image_path=None,
        medicine_name=scan.medicine_name,
        raw_ocr_text=scan.raw_ocr_text,
        translated_text=scan.translated_text,
    )

    db.add(new_scan)
    db.commit()
    db.refresh(new_scan)

    return new_scan


@router.get("/my", response_model=list[ScanResponse])
def get_my_scans(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    scans = (
        db.query(ScanRecord)
        .filter(ScanRecord.user_id == current_user.id)
        .order_by(ScanRecord.id.desc())
        .all()
    )
    return scans


@router.post("/upload", response_model=ScanResponse)
def upload_scan_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are allowed")

    ext = os.path.splitext(file.filename)[1] or ".jpg"
    unique_name = f"{uuid4().hex}{ext}"
    save_path = os.path.join("uploads", unique_name)

    # Read all bytes first
    file_bytes = file.file.read()

    # Save bytes to disk
    with open(save_path, "wb") as buffer:
        buffer.write(file_bytes)

    # OCR only after file is fully written and closed
    raw_text = extract_text(save_path)
    cleaned_text = clean_text(raw_text)
    medicine_name = extract_medicine_name(cleaned_text)
    translated_result = translate_text(cleaned_text)
    manufacturer = extract_manufacturer(cleaned_text)


    new_scan = ScanRecord(
        user_id=current_user.id,
        image_path=save_path,
        medicine_name=medicine_name,
        raw_ocr_text=cleaned_text,
        translated_text=translated_result,
         manufacturer=manufacturer
      )

    db.add(new_scan)
    db.commit()
    db.refresh(new_scan)

    return new_scan