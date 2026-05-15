import os

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.routes.auth import get_current_user
from app.core.database import get_db
from app.models.medicine import Medicine
from app.models.scan import ScanRecord
from app.models.user import User
from app.schemas.scan import ScanBarcodeRequest, ScanCreate, ScanResponse
from app.services.ai_service import answer_scan_question, explain_medicine_info
from app.services.openai_ocr_service import (
    extract_text_openai_vision,
    is_openai_ocr_enabled,
)
from app.services.ocr_service import (
    clean_text,
    extract_barcode,
    extract_dosage,
    extract_manufacturer,
    extract_medicine_name,
    extract_text_with_confidence,
    extract_usage,
)
from app.services.upload_validation import (
    build_upload_path,
    validate_image_upload_metadata,
    validate_upload_bytes,
)
from app.services.medicine_catalog_service import (
    CatalogMatchResult,
    match_catalog_medicine,
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
    ingredients: str | None,
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
            f"Ingredients: {ingredients or 'Not available'}\n"
            f"Usage: {usage or 'Not available'}\n"
            f"Dosage: {dosage or 'Not available'}\n"
            "Warnings: Not available\n"
            "Simple Explanation: AI service is temporarily unavailable. "
            "This is a limited fallback summary.\n"
            "Safety Note: This information supports medicine understanding only. "
            "Confirm important medicine decisions with a doctor or pharmacist."
        )


def get_ai_status(value: str | None) -> str:
    if not value:
        return "skipped"

    lowered = value.lower()
    if "ai service is temporarily unavailable" in lowered:
        return "fallback"

    return "succeeded"


def get_match_status(medicine: Medicine | None, fallback: str = "unknown") -> str:
    if not medicine:
        return fallback

    return "verified" if medicine.is_verified else "catalog_unverified"


def build_trust_notes(
    source_type: str,
    match_status: str,
    ocr_status: str,
    ai_status: str,
    ocr_error: str | None = None,
    catalog_reason: str | None = None,
    catalog_score: int | None = None,
) -> str:
    notes = [
        f"Source type: {source_type}.",
        f"Medicine match: {match_status}.",
        f"OCR status: {ocr_status}.",
        f"AI explanation status: {ai_status}.",
    ]

    if catalog_reason:
        notes.append(f"Catalog match reason: {catalog_reason}.")

    if catalog_score is not None:
        notes.append(f"Catalog match score: {catalog_score}.")

    if ocr_error:
        notes.append(
            "OCR fallback was unavailable, so the system used the best available extraction result."
        )

    if match_status == "verified":
        notes.append(
            "Verified catalog data should be trusted more than OCR or AI-generated text."
        )
    elif match_status == "catalog_unverified":
        notes.append("Catalog data was found but is not marked verified.")
    else:
        notes.append(
            "No verified medicine catalog match was found; review OCR and AI text carefully."
        )

    return " ".join(notes)


def display_medicine_name(medicine: Medicine) -> str:
    if medicine.canonical_name_zh and medicine.canonical_name_en:
        return f"{medicine.canonical_name_zh} / {medicine.canonical_name_en}"

    return (
        medicine.canonical_name_zh
        or medicine.canonical_name_en
        or "Unknown medicine"
    )


def build_catalog_explanation(
    medicine: Medicine,
    raw_text: str | None = None,
) -> str:
    name_zh = medicine.canonical_name_zh or "Not available"
    name_en = medicine.canonical_name_en or "Not available"
    manufacturer_text = medicine.manufacturer_en or medicine.manufacturer or "Not available"
    ingredients_text = medicine.ingredients_en or medicine.ingredients or "Not available"
    usage_text = medicine.usage_en or medicine.usage or "Not available"
    dosage_text = medicine.dosage or "Not available"
    warning_text = medicine.warnings_en or medicine.warnings or "Not available"

    trust_text = (
        "Matched against a verified local Chinese medicine catalogue record."
        if medicine.is_verified
        else "Matched against a catalogue record that is not yet verified."
    )

    lines = [
        f"Chinese name: {name_zh}",
        f"English name: {name_en}",
        f"Manufacturer: {manufacturer_text}",
        f"Ingredients: {ingredients_text}",
        f"Usage: {usage_text}",
        f"Dosage: {dosage_text}",
        f"Warnings: {warning_text}",
        f"Trust: {trust_text}",
    ]

    if raw_text:
        lines.append("Source note: OCR text was captured separately and may contain errors.")

    lines.append(
        "Safety Note: This information supports medicine understanding only. "
        "Confirm important medicine decisions with a doctor or pharmacist."
    )

    return "\n".join(lines)


def extract_warning_text(raw_text: str | None, catalog_warning: str | None = None) -> str | None:
    if catalog_warning:
        return catalog_warning

    if not raw_text:
        return None

    keywords = [
        "禁忌",
        "注意",
        "慎用",
        "不良反应",
        "警告",
        "warning",
        "avoid",
        "caution",
    ]

    lines = [line.strip() for line in raw_text.splitlines() if line.strip()]

    for line in lines:
        lower_line = line.lower()
        if any(keyword in line or keyword in lower_line for keyword in keywords):
            return line

    return None


def find_catalog_match(
    db: Session,
    barcode: str | None,
    extracted_name: str | None,
    raw_text: str | None,
    extracted_dosage: str | None = None,
    extracted_manufacturer: str | None = None,
) -> CatalogMatchResult:
    return match_catalog_medicine(
        db=db,
        barcode=barcode,
        extracted_name=extracted_name,
        extracted_dosage=extracted_dosage,
        extracted_manufacturer=extracted_manufacturer,
        raw_text=raw_text,
    )


def should_use_openai_ocr(
    cleaned_text: str | None,
    confidence: float | None,
    catalog_match: Medicine | None,
) -> bool:
    if not is_openai_ocr_enabled():
        return False

    if catalog_match:
        return False

    min_confidence = float(os.getenv("OPENAI_OCR_FALLBACK_CONFIDENCE", "0.75"))
    min_text_length = int(os.getenv("OPENAI_OCR_MIN_TEXT_LENGTH", "20"))

    if not cleaned_text:
        return True

    if len(cleaned_text.strip()) < min_text_length:
        return True

    if confidence is None:
        return True

    return confidence < min_confidence


def should_accept_openai_ocr(
    local_cleaned_text: str | None,
    local_confidence: float | None,
    openai_cleaned_text: str | None,
    openai_confidence: float | None,
    local_catalog_match: Medicine | None,
    openai_catalog_match: Medicine | None,
) -> bool:
    if not openai_cleaned_text:
        return False

    if openai_catalog_match and not local_catalog_match:
        return True

    local_length = len(local_cleaned_text or "")
    openai_length = len(openai_cleaned_text or "")

    if openai_length >= max(20, local_length + 5):
        return True

    if openai_confidence is not None and local_confidence is not None:
        return openai_confidence > local_confidence

    if openai_confidence is not None and local_confidence is None:
        return True

    return False


def save_upload_file(file: UploadFile) -> str:
    extension = validate_image_upload_metadata(file)

    os.makedirs("uploads", exist_ok=True)
    _, save_path = build_upload_path(extension)

    file_bytes = file.file.read()
    validate_upload_bytes(file_bytes)

    with open(save_path, "wb") as buffer:
        buffer.write(file_bytes)

    return save_path


@router.post("/", response_model=ScanResponse)
def create_scan(
    scan: ScanCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        source_type = scan.source_type or "manual_entry"
        match_status = scan.match_status or "manual"
        ocr_status = scan.ocr_status or "not_applicable"
        ai_status = scan.ai_status or get_ai_status(scan.translated_text)

        new_scan = ScanRecord(
            user_id=current_user.id,
            image_path=None,
            barcode=scan.barcode,
            medicine_id=getattr(scan, "medicine_id", None),
            medicine_name=scan.medicine_name,
            raw_ocr_text=scan.raw_ocr_text,
            translated_text=scan.translated_text,
            manufacturer=scan.manufacturer,
            ingredients=scan.ingredients,
            usage=scan.usage,
            dosage=scan.dosage,
            warnings=getattr(scan, "warnings", None),
            source_type=source_type,
            match_status=match_status,
            ocr_status=ocr_status,
            ai_status=ai_status,
            ocr_confidence=scan.ocr_confidence,
            ai_confidence=scan.ai_confidence,
            trust_notes=scan.trust_notes
            or build_trust_notes(
                source_type=source_type,
                match_status=match_status,
                ocr_status=ocr_status,
                ai_status=ai_status,
            ),
        )

        db.add(new_scan)
        db.commit()
        db.refresh(new_scan)

        return new_scan

    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create scan: {str(exc)}")


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

    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to fetch scans: {str(exc)}")


@router.post("/upload", response_model=ScanResponse)
def upload_scan_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        save_path = save_upload_file(file)

        barcode = extract_barcode(save_path)

        ocr_result = extract_text_with_confidence(save_path)
        raw_text = ocr_result.raw_text
        cleaned_text = ocr_result.cleaned_text or clean_text(raw_text)

        extracted_name = extract_medicine_name(cleaned_text)
        extracted_manufacturer = extract_manufacturer(cleaned_text)
        extracted_usage = extract_usage(cleaned_text)
        extracted_dosage = extract_dosage(cleaned_text) or extract_dosage(raw_text)

        catalog_result = find_catalog_match(
            db=db,
            barcode=barcode,
            extracted_name=extracted_name,
            raw_text=cleaned_text,
            extracted_dosage=extracted_dosage,
            extracted_manufacturer=extracted_manufacturer,
        )

        catalog_match = catalog_result.medicine
        ocr_engine = "tesseract"
        fallback_used = False
        fallback_error = None

        if should_use_openai_ocr(
            cleaned_text=cleaned_text,
            confidence=ocr_result.confidence,
            catalog_match=catalog_match,
        ):
            openai_result = extract_text_openai_vision(save_path)

            if openai_result.status == "succeeded" and openai_result.cleaned_text:
                openai_cleaned_text = openai_result.cleaned_text
                openai_raw_text = openai_result.raw_text

                openai_extracted_name = extract_medicine_name(openai_cleaned_text)
                openai_extracted_manufacturer = extract_manufacturer(openai_cleaned_text)
                openai_extracted_usage = extract_usage(openai_cleaned_text)
                openai_extracted_dosage = (
                    extract_dosage(openai_cleaned_text)
                    or extract_dosage(openai_raw_text)
                )

                openai_catalog_result = find_catalog_match(
                    db=db,
                    barcode=barcode,
                    extracted_name=openai_extracted_name,
                    raw_text=openai_cleaned_text,
                    extracted_dosage=openai_extracted_dosage,
                    extracted_manufacturer=openai_extracted_manufacturer,
                )

                if should_accept_openai_ocr(
                    local_cleaned_text=cleaned_text,
                    local_confidence=ocr_result.confidence,
                    openai_cleaned_text=openai_cleaned_text,
                    openai_confidence=openai_result.confidence,
                    local_catalog_match=catalog_match,
                    openai_catalog_match=openai_catalog_result.medicine,
                ):
                    ocr_result = openai_result
                    raw_text = openai_raw_text
                    cleaned_text = openai_cleaned_text

                    extracted_name = openai_extracted_name
                    extracted_manufacturer = openai_extracted_manufacturer
                    extracted_usage = openai_extracted_usage
                    extracted_dosage = openai_extracted_dosage

                    catalog_result = openai_catalog_result
                    catalog_match = openai_catalog_result.medicine

                    ocr_engine = "openai_vision"
                    fallback_used = True
            else:
                fallback_error = openai_result.error

        if catalog_match:
            medicine_name = display_medicine_name(catalog_match)
            manufacturer = (
                catalog_match.manufacturer_en
                or catalog_match.manufacturer
                or extracted_manufacturer
            )
            ingredients = catalog_match.ingredients_en or catalog_match.ingredients
            usage = catalog_match.usage_en or catalog_match.usage or extracted_usage
            dosage = catalog_match.dosage or extracted_dosage
            warnings = extract_warning_text(
                cleaned_text,
                catalog_match.warnings_en or catalog_match.warnings,
            )
            translated_result = build_catalog_explanation(
                catalog_match,
                raw_text=cleaned_text,
            )
            medicine_id = catalog_match.id
        else:
            medicine_name = extracted_name
            manufacturer = extracted_manufacturer
            ingredients = None
            usage = extracted_usage
            dosage = extracted_dosage
            warnings = extract_warning_text(cleaned_text)
            translated_result = safe_explanation(
                medicine_name=medicine_name,
                manufacturer=manufacturer,
                ingredients=ingredients,
                usage=usage,
                dosage=dosage,
                raw_text=cleaned_text,
            )
            medicine_id = None

        source_type = "image_upload"
        match_status = get_match_status(
            catalog_match,
            fallback="ocr_extracted" if cleaned_text else "unknown",
        )
        ai_status = (
            "not_used_catalog_match" if catalog_match else get_ai_status(translated_result)
        )

        trust_notes = build_trust_notes(
            source_type=source_type,
            match_status=match_status,
            ocr_status=ocr_result.status,
            ai_status=ai_status,
            ocr_error=ocr_result.error or fallback_error,
            catalog_reason=catalog_result.reason,
            catalog_score=catalog_result.score,
        )

        if fallback_used:
            trust_notes += (
                " Enhanced OCR fallback was used because the initial text extraction "
                "was unclear or incomplete."
            )
        else:
            trust_notes += " Standard OCR extraction was used."

        new_scan = ScanRecord(
            user_id=current_user.id,
            image_path=save_path,
            barcode=barcode,
            medicine_id=medicine_id,
            medicine_name=medicine_name,
            raw_ocr_text=cleaned_text,
            translated_text=translated_result,
            manufacturer=manufacturer,
            ingredients=ingredients,
            usage=usage,
            dosage=dosage,
            warnings=warnings,
            source_type=source_type,
            match_status=match_status,
            ocr_status=ocr_result.status,
            ai_status=ai_status,
            ocr_confidence=ocr_result.confidence,
            ai_confidence=None,
            trust_notes=trust_notes,
        )

        db.add(new_scan)
        db.commit()
        db.refresh(new_scan)

        return new_scan

    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to process uploaded image: {str(exc)}")


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

        catalog_result = find_catalog_match(
            db=db,
            barcode=clean_barcode,
            extracted_name=None,
            raw_text=None,
        )

        catalog_match = catalog_result.medicine

        if catalog_match:
            medicine_name = display_medicine_name(catalog_match)
            manufacturer = catalog_match.manufacturer_en or catalog_match.manufacturer
            ingredients = catalog_match.ingredients_en or catalog_match.ingredients
            usage = (
                catalog_match.usage_en
                or catalog_match.usage
                or "Catalog match found for barcode input."
            )
            dosage = catalog_match.dosage
            warnings = catalog_match.warnings_en or catalog_match.warnings
            translated_result = build_catalog_explanation(catalog_match)
            medicine_id = catalog_match.id
        else:
            medicine_name = f"Barcode {clean_barcode}"
            manufacturer = None
            ingredients = None
            usage = "Barcode-based lookup is limited in the current MVP."
            dosage = None
            warnings = None
            translated_result = safe_explanation(
                medicine_name=medicine_name,
                manufacturer=manufacturer,
                ingredients=ingredients,
                usage=usage,
                dosage=dosage,
                raw_text=f"Barcode input: {clean_barcode}",
            )
            medicine_id = None

        source_type = "barcode"
        match_status = get_match_status(catalog_match, fallback="barcode_unknown")
        ai_status = (
            "not_used_catalog_match" if catalog_match else get_ai_status(translated_result)
        )

        trust_notes = build_trust_notes(
            source_type=source_type,
            match_status=match_status,
            ocr_status="not_applicable",
            ai_status=ai_status,
            catalog_reason=catalog_result.reason,
            catalog_score=catalog_result.score,
        )

        new_scan = ScanRecord(
            user_id=current_user.id,
            image_path=None,
            barcode=clean_barcode,
            medicine_id=medicine_id,
            medicine_name=medicine_name,
            raw_ocr_text=f"Barcode input: {clean_barcode}",
            translated_text=translated_result,
            manufacturer=manufacturer,
            ingredients=ingredients,
            usage=usage,
            dosage=dosage,
            warnings=warnings,
            source_type=source_type,
            match_status=match_status,
            ocr_status="not_applicable",
            ai_status=ai_status,
            ocr_confidence=None,
            ai_confidence=None,
            trust_notes=trust_notes,
        )

        db.add(new_scan)
        db.commit()
        db.refresh(new_scan)

        return new_scan

    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to process barcode: {str(exc)}")


@router.post("/upload-prescription", response_model=ScanResponse)
def upload_prescription(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        save_path = save_upload_file(file)

        ocr_result = extract_text_with_confidence(save_path)
        raw_text = ocr_result.raw_text
        cleaned_text = ocr_result.cleaned_text or clean_text(raw_text)

        ocr_engine = "tesseract"
        fallback_used = False
        fallback_error = None

        if should_use_openai_ocr(
            cleaned_text=cleaned_text,
            confidence=ocr_result.confidence,
            catalog_match=None,
        ):
            openai_result = extract_text_openai_vision(save_path)

            if openai_result.status == "succeeded" and openai_result.cleaned_text:
                if should_accept_openai_ocr(
                    local_cleaned_text=cleaned_text,
                    local_confidence=ocr_result.confidence,
                    openai_cleaned_text=openai_result.cleaned_text,
                    openai_confidence=openai_result.confidence,
                    local_catalog_match=None,
                    openai_catalog_match=None,
                ):
                    ocr_result = openai_result
                    raw_text = openai_result.raw_text
                    cleaned_text = openai_result.cleaned_text
                    ocr_engine = "openai_vision"
                    fallback_used = True
            else:
                fallback_error = openai_result.error

        ingredients = None
        translated_result = safe_explanation(
            medicine_name=None,
            manufacturer=None,
            ingredients=ingredients,
            usage=None,
            dosage=None,
            raw_text=cleaned_text,
        )

        source_type = "prescription_upload"
        match_status = "ocr_extracted" if cleaned_text else "unknown"
        ai_status = get_ai_status(translated_result)

        trust_notes = build_trust_notes(
            source_type=source_type,
            match_status=match_status,
            ocr_status=ocr_result.status,
            ai_status=ai_status,
            ocr_error=ocr_result.error or fallback_error,
        )

        trust_notes += f" OCR engine used: {ocr_engine}."

        if fallback_used:
            trust_notes += (
                " OpenAI Vision OCR fallback was used because local OCR was weak."
            )

        new_record = ScanRecord(
            user_id=current_user.id,
            image_path=save_path,
            barcode=None,
            medicine_id=None,
            medicine_name="Prescription OCR",
            raw_ocr_text=cleaned_text,
            translated_text=translated_result,
            manufacturer=None,
            ingredients=ingredients,
            usage=None,
            dosage=None,
            warnings=extract_warning_text(cleaned_text),
            source_type=source_type,
            match_status=match_status,
            ocr_status=ocr_result.status,
            ai_status=ai_status,
            ocr_confidence=ocr_result.confidence,
            ai_confidence="medium" if ai_status == "succeeded" else None,
            trust_notes=trust_notes,
        )

        db.add(new_record)
        db.commit()
        db.refresh(new_record)

        return new_record

    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to process prescription image: {str(exc)}")
    
    

@router.post("/upload-report", response_model=ScanResponse)
def upload_report(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        save_path = save_upload_file(file)

        ocr_result = extract_text_with_confidence(save_path)
        raw_text = ocr_result.raw_text
        cleaned_text = ocr_result.cleaned_text or clean_text(raw_text)

        translated_result = safe_explanation(
            medicine_name=None,
            manufacturer=None,
            ingredients=None,
            usage=None,
            dosage=None,
            raw_text=cleaned_text,
        )

        source_type = "report_upload"
        match_status = "ocr_extracted" if cleaned_text else "unknown"
        ai_status = get_ai_status(translated_result)

        trust_notes = build_trust_notes(
            source_type=source_type,
            match_status=match_status,
            ocr_status=ocr_result.status,
            ai_status=ai_status,
            ocr_error=ocr_result.error,
        )

        trust_notes += " OCR engine used: tesseract."

        new_record = ScanRecord(
            user_id=current_user.id,
            image_path=save_path,
            barcode=None,
            medicine_id=None,
            medicine_name="Medical Report OCR",
            raw_ocr_text=cleaned_text,
            translated_text=translated_result,
            manufacturer=None,
            ingredients=None,
            usage=None,
            dosage=None,
            warnings=extract_warning_text(cleaned_text),
            source_type=source_type,
            match_status=match_status,
            ocr_status=ocr_result.status,
            ai_status=ai_status,
            ocr_confidence=ocr_result.confidence,
            ai_confidence="medium" if ai_status == "succeeded" else None,
            trust_notes=trust_notes,
        )

        db.add(new_record)
        db.commit()
        db.refresh(new_record)

        return new_record

    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process report image: {str(exc)}",
        )
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
            f"Manufacturer: {scan.manufacturer or 'Not available'}\n"
            f"Ingredients: {scan.ingredients or 'Not available'}\n"
            f"Usage: {scan.usage or 'Not available'}\n"
            f"Dosage: {scan.dosage or 'Not available'}\n"
            "Note: AI service is temporarily unavailable, so this is a limited fallback answer. "
            "Confirm important medicine decisions with a doctor or pharmacist."
        )

    return {
        "scan_id": scan.id,
        "question": data.question,
        "answer": answer,
    }