import os
from uuid import uuid4

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from app.services.ai_service import explain_medicine_info

from app.api.routes.auth import get_current_user
from app.core.database import get_db
from app.models.scan import ScanRecord
from app.models.user import User
from pydantic import BaseModel
from app.services.ai_service import answer_scan_question
from app.schemas.scan import ScanCreate, ScanResponse
from app.services.ocr_service import (
    extract_barcode,
    extract_text,
    clean_text,
    translate_text,
    build_translation_input,
    extract_medicine_name,
    extract_manufacturer,
    extract_usage,
    extract_dosage,
)

router = APIRouter()


@router.post("/", response_model=ScanResponse)
def create_scan(
    scan: ScanCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        new_scan = ScanRecord(
            user_id=current_user.id,
            image_path=None,
            barcode=scan.barcode,
            medicine_name=scan.medicine_name,
            raw_ocr_text=scan.raw_ocr_text,
            translated_text=scan.translated_text,
            manufacturer=scan.manufacturer,
            usage=scan.usage,
            dosage=scan.dosage,
        )

        db.add(new_scan)
        db.commit()
        db.refresh(new_scan)

        return new_scan
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create scan: {str(e)}")


@router.get("/my", response_model=list[ScanResponse])
def get_my_scans(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        scans = (
            db.query(ScanRecord)
            .filter(ScanRecord.user_id == current_user.id)
            .order_by(ScanRecord.id.desc())
            .all()
        )
        return scans
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch scans: {str(e)}")


@router.post("/upload", response_model=ScanResponse)
def upload_scan_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are allowed")

    os.makedirs("uploads", exist_ok=True)

    ext = os.path.splitext(file.filename)[1].lower() or ".jpg"
    unique_name = f"{uuid4().hex}{ext}"
    save_path = os.path.join("uploads", unique_name)

    try:
        file_bytes = file.file.read()
        if not file_bytes:
            raise HTTPException(status_code=400, detail="Uploaded file is empty")

        with open(save_path, "wb") as buffer:
            buffer.write(file_bytes)

        barcode = extract_barcode(save_path)
        raw_text = extract_text(save_path)
        cleaned_text = clean_text(raw_text)

        medicine_name = extract_medicine_name(cleaned_text)
        manufacturer = extract_manufacturer(cleaned_text)
        usage = extract_usage(cleaned_text)
        dosage = extract_dosage(cleaned_text) or extract_dosage(raw_text)

        try:
            translated_result = explain_medicine_info(
                medicine_name=medicine_name,
                manufacturer=manufacturer,
                usage=usage,
                dosage=dosage,
                raw_text=cleaned_text,
            )
        except Exception:
            translated_result = (
                f"Medicine: {medicine_name or ''}\n"
                f"Manufacturer: {manufacturer or ''}\n"
                f"Usage: {usage or ''}\n"
                f"Dosage: {dosage or ''}"
            )

        new_scan = ScanRecord(
            user_id=current_user.id,
            image_path=save_path,
            barcode=barcode,
            medicine_name=medicine_name,
            raw_ocr_text=cleaned_text,
            translated_text=translated_result,
            manufacturer=manufacturer,
            usage=usage,
            dosage=dosage,
        )

        db.add(new_scan)
        db.commit()
        db.refresh(new_scan)

        return new_scan

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to process uploaded image: {str(e)}")


@router.post("/upload-prescription", response_model=ScanResponse)
def upload_prescription(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are allowed")

    os.makedirs("uploads", exist_ok=True)

    ext = os.path.splitext(file.filename)[1].lower() or ".jpg"
    filename = f"{uuid4().hex}{ext}"
    save_path = os.path.join("uploads", filename)

    try:
        file_bytes = file.file.read()
        if not file_bytes:
            raise HTTPException(status_code=400, detail="Empty file")

        with open(save_path, "wb") as f:
            f.write(file_bytes)

        raw_text = extract_text(save_path)
        cleaned_text = clean_text(raw_text)

        try:
            translated_result = explain_medicine_info(
                medicine_name=None,
                manufacturer=None,
                usage=None,
                dosage=None,
                raw_text=cleaned_text,
            )
        except Exception:
            translated_result = cleaned_text

        new_record = ScanRecord(
            user_id=current_user.id,
            image_path=save_path,
            barcode=None,
            medicine_name=None,
            raw_ocr_text=cleaned_text,
            translated_text=translated_result,
            manufacturer=None,
            usage=None,
            dosage=None,
        )

        db.add(new_record)
        db.commit()
        db.refresh(new_record)

        return new_record

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    

class ScanQuestionRequest(BaseModel):
    scan_id: int
    question: str


@router.post("/ask")
def ask_about_scan(
    data: ScanQuestionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    scan = db.query(ScanRecord).filter(
        ScanRecord.id == data.scan_id,
        ScanRecord.user_id == current_user.id
    ).first()

    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    try:
        answer = answer_scan_question(
            medicine_name=scan.medicine_name,
            manufacturer=scan.manufacturer,
            usage=scan.usage,
            dosage=scan.dosage,
            translated_text=scan.translated_text,
            user_question=data.question,
        )
    except Exception:
        answer = (
            f"Medicine: {scan.medicine_name or 'Unknown'}\n"
            f"Usage: {scan.usage or 'Not available'}\n"
            f"Dosage: {scan.dosage or 'Not available'}\n"
            f"Explanation: AI service is temporarily unavailable. Please try again later."
        )

    return {"answer": answer}