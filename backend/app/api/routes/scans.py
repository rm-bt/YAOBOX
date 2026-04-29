import os

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.api.routes.auth import get_current_user
from app.core.database import get_db
from app.models.medicine import Medicine
from app.models.scan import ScanRecord
from app.models.user import User
from app.schemas.scan import ScanCreate, ScanResponse, ScanBarcodeRequest
from app.services.ai_service import explain_medicine_info, answer_scan_question
from app.services.upload_validation import (
    build_upload_path,
    validate_image_upload_metadata,
    validate_upload_bytes,
)
from app.services.ocr_service import (
    extract_barcode,
    extract_text,
    clean_text,
    extract_medicine_name,
    extract_manufacturer,
    extract_usage,
    extract_dosage,
)

router = APIRouter()


def normalize_text(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def safe_explanation(
    medicine_name: str | None,
    manufacturer: str | None,
    usage: str | None,
    dosage: str | None,
    raw_text: str | None = None,
) -> str:
    try:
        return explain_medicine_info(
            medicine_name=medicine_name,
            manufacturer=manufacturer,
            usage=usage,
            dosage=dosage,
            raw_text=raw_text,
        )
    except Exception:
        return (
            f"Medicine: {medicine_name or 'Unknown medicine'}\n"
            f"Manufacturer: {manufacturer or 'Not available'}\n"
            f"Usage: {usage or 'Not available'}\n"
            f"Dosage: {dosage or 'Not available'}\n"
            f"Simple Explanation: AI service is temporarily unavailable. This is a limited fallback summary."
        )


def translate_catalog_field(value: str | None) -> str:
    if not value:
        return "Not available"
    return value.strip()


def build_catalog_explanation(
    medicine: Medicine,
    raw_text: str | None = None,
) -> str:
    medicine_name = medicine.canonical_name_en or medicine.canonical_name_zh or "Unknown medicine"
    manufacturer_text = medicine.manufacturer_en or medicine.manufacturer or "Not available"
    usage_text = medicine.usage_en or medicine.usage or "Not available"
    dosage_text = medicine.dosage or "Not available"
    warning_text = medicine.warnings_en or medicine.warnings or "Not available"

    trust_text = (
        "Matched against a verified catalog record."
        if medicine.is_verified
        else "Matched against a catalog record that is not yet verified."
    )

    lines = [
        f"Medicine: {medicine_name}",
        f"Manufacturer: {manufacturer_text}",
        f"Usage: {usage_text}",
        f"Dosage: {dosage_text}",
        f"Warnings: {warning_text}",
        f"Trust: {trust_text}",
    ]

    if raw_text:
        lines.append("Source note: OCR text was also captured separately for reference.")

    return "\n".join(lines)

def extract_warning_text(raw_text: str | None, catalog_warning: str | None = None) -> str | None:
    if catalog_warning:
        return catalog_warning

    if not raw_text:
        return None

    keywords = ["禁忌", "注意", "慎用", "不良反应", "warning", "avoid", "caution"]
    lines = [line.strip() for line in raw_text.splitlines() if line.strip()]

    for line in lines:
        lower_line = line.lower()
        if any(keyword in line or keyword in lower_line for keyword in keywords):
            return line

    return None


def normalize_lookup_key(value: str | None) -> str:
    if not value:
        return ""
    return (
        value.replace(" ", "")
        .replace("　", "")
        .replace("-", "")
        .replace("_", "")
        .replace("（", "(")
        .replace("）", ")")
        .strip()
        .lower()
    )


def find_catalog_match(
    db: Session,
    barcode: str | None,
    extracted_name: str | None,
    raw_text: str | None,
) -> Medicine | None:
    clean_barcode = normalize_text(barcode)
    clean_name = normalize_text(extracted_name)
    normalized_name = normalize_lookup_key(clean_name)

    if clean_barcode:
        medicine = db.query(Medicine).filter(Medicine.barcode == clean_barcode).first()
        if medicine:
            return medicine

    medicines = (
        db.query(Medicine)
        .order_by(Medicine.is_verified.desc(), Medicine.id.desc())
        .all()
    )

    candidates: list[str] = []

    if clean_name:
        candidates.append(clean_name)

    if normalized_name and normalized_name != clean_name:
        candidates.append(normalized_name)

    if raw_text:
        lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
        candidates.extend(lines[:8])

    normalized_candidates = []
    for value in candidates:
        normalized = normalize_lookup_key(value)
        if normalized:
            normalized_candidates.append(normalized)

    for medicine in medicines:
        keys = [
            medicine.canonical_name_zh or "",
            medicine.canonical_name_en or "",
            medicine.aliases or "",
            medicine.barcode or "",
        ]

        normalized_keys = [normalize_lookup_key(key) for key in keys if key]

        for candidate in normalized_candidates:
            for key in normalized_keys:
                if not key:
                    continue
                if candidate == key or candidate in key or key in candidate:
                    return medicine

    return None


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
            medicine_id=getattr(scan, "medicine_id", None),
            medicine_name=scan.medicine_name,
            raw_ocr_text=scan.raw_ocr_text,
            translated_text=scan.translated_text,
            manufacturer=scan.manufacturer,
            usage=scan.usage,
            dosage=scan.dosage,
            warnings=getattr(scan, "warnings", None),
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
    extension = validate_image_upload_metadata(file)

    os.makedirs("uploads", exist_ok=True)
    _, save_path = build_upload_path(extension)

    try:
        file_bytes = file.file.read()
        validate_upload_bytes(file_bytes)

        with open(save_path, "wb") as buffer:
            buffer.write(file_bytes)

        barcode = extract_barcode(save_path)
        raw_text = extract_text(save_path)
        cleaned_text = clean_text(raw_text)

        extracted_name = extract_medicine_name(cleaned_text)
        extracted_manufacturer = extract_manufacturer(cleaned_text)
        extracted_usage = extract_usage(cleaned_text)
        extracted_dosage = extract_dosage(cleaned_text) or extract_dosage(raw_text)

        catalog_match = find_catalog_match(
            db=db,
            barcode=barcode,
            extracted_name=extracted_name,
            raw_text=cleaned_text,
        )

        if catalog_match:
            medicine_name = (
                catalog_match.canonical_name_zh
                or catalog_match.canonical_name_en
                or extracted_name
            )
            manufacturer = catalog_match.manufacturer or extracted_manufacturer
            usage = catalog_match.usage or extracted_usage
            dosage = catalog_match.dosage or extracted_dosage
            warnings = extract_warning_text(cleaned_text, catalog_match.warnings)
            translated_result = build_catalog_explanation(
                catalog_match,
                raw_text=cleaned_text,
            )
            medicine_id = catalog_match.id
        else:
            medicine_name = extracted_name
            manufacturer = extracted_manufacturer
            usage = extracted_usage
            dosage = extracted_dosage
            warnings = extract_warning_text(cleaned_text)
            translated_result = safe_explanation(
                medicine_name=medicine_name,
                manufacturer=manufacturer,
                usage=usage,
                dosage=dosage,
                raw_text=cleaned_text,
            )
            medicine_id = None

        new_scan = ScanRecord(
            user_id=current_user.id,
            image_path=save_path,
            barcode=barcode,
            medicine_id=medicine_id,
            medicine_name=medicine_name,
            raw_ocr_text=cleaned_text,
            translated_text=translated_result,
            manufacturer=manufacturer,
            usage=usage,
            dosage=dosage,
            warnings=warnings,
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


@router.post("/barcode", response_model=ScanResponse)
def scan_by_barcode(
    data: ScanBarcodeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    clean_barcode = (data.barcode or "").strip()

    if not clean_barcode:
        raise HTTPException(status_code=400, detail="Barcode is required")

    try:
        existing_scan = (
            db.query(ScanRecord)
            .filter(
                ScanRecord.user_id == current_user.id,
                ScanRecord.barcode == clean_barcode,
            )
            .order_by(ScanRecord.created_at.desc(), ScanRecord.id.desc())
            .first()
        )

        if existing_scan:
            return existing_scan

        catalog_match = find_catalog_match(
            db=db,
            barcode=clean_barcode,
            extracted_name=None,
            raw_text=None,
        )

        if catalog_match:
            medicine_name = (
                catalog_match.canonical_name_zh
                or catalog_match.canonical_name_en
                or f"Barcode {clean_barcode}"
            )
            manufacturer = catalog_match.manufacturer
            usage = catalog_match.usage or "Catalog match found for barcode input."
            dosage = catalog_match.dosage
            warnings = catalog_match.warnings
            translated_result = build_catalog_explanation(catalog_match)
            medicine_id = catalog_match.id
        else:
            medicine_name = f"Barcode {clean_barcode}"
            manufacturer = None
            usage = "Barcode-based lookup is limited in the current MVP."
            dosage = None
            warnings = None
            translated_result = safe_explanation(
                medicine_name=medicine_name,
                manufacturer=None,
                usage=usage,
                dosage=None,
                raw_text=f"Barcode input: {clean_barcode}",
            )
            medicine_id = None

        new_scan = ScanRecord(
            user_id=current_user.id,
            image_path=None,
            barcode=clean_barcode,
            medicine_id=medicine_id,
            medicine_name=medicine_name,
            raw_ocr_text=f"Barcode input: {clean_barcode}",
            translated_text=translated_result,
            manufacturer=manufacturer,
            usage=usage,
            dosage=dosage,
            warnings=warnings,
        )

        db.add(new_scan)
        db.commit()
        db.refresh(new_scan)

        return new_scan

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to process barcode: {str(e)}")


@router.post("/upload-prescription", response_model=ScanResponse)
def upload_prescription(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    extension = validate_image_upload_metadata(file)

    os.makedirs("uploads", exist_ok=True)
    _, save_path = build_upload_path(extension)

    try:
        file_bytes = file.file.read()
        validate_upload_bytes(file_bytes)

        with open(save_path, "wb") as f:
            f.write(file_bytes)

        raw_text = extract_text(save_path)
        cleaned_text = clean_text(raw_text)

        translated_result = safe_explanation(
            medicine_name=None,
            manufacturer=None,
            usage=None,
            dosage=None,
            raw_text=cleaned_text,
        )

        new_record = ScanRecord(
            user_id=current_user.id,
            image_path=save_path,
            barcode=None,
            medicine_id=None,
            medicine_name=None,
            raw_ocr_text=cleaned_text,
            translated_text=translated_result,
            manufacturer=None,
            usage=None,
            dosage=None,
            warnings=extract_warning_text(cleaned_text),
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
    scan = (
        db.query(ScanRecord)
        .filter(
            ScanRecord.id == data.scan_id,
            ScanRecord.user_id == current_user.id,
        )
        .first()
    )

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
            f"Medicine: {scan.medicine_name or 'Unknown medicine'}\n"
            f"Usage: {scan.usage or 'Not available'}\n"
            f"Dosage: {scan.dosage or 'Not available'}\n"
            f"Note: AI service is temporarily unavailable, so this is a limited fallback answer."
        )

    return {
        "scan_id": scan.id,
        "question": data.question,
        "answer": answer,
    }