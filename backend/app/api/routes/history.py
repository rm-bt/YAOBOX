from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.api.routes.auth import get_current_user
from app.core.database import get_db
from app.models.scan import ScanRecord
from app.models.user import User
from app.schemas.history import HistoryResponse

router = APIRouter(prefix="/history", tags=["History"])


def build_image_url(image_path: str | None) -> str | None:
    if not image_path:
        return None

    normalized = image_path.replace("\\", "/")

    if normalized.startswith("http://") or normalized.startswith("https://"):
        return normalized

    if normalized.startswith("/uploads/"):
        return normalized

    if normalized.startswith("uploads/"):
        return f"/{normalized}"

    return f"/uploads/{normalized.split('/')[-1]}"


def normalize_source_type(scan: ScanRecord) -> str:
    if scan.source_type:
        return scan.source_type

    if scan.image_path:
        return "image_upload"

    if scan.barcode:
        return "barcode"

    return "manual_entry"


def normalize_match_status(scan: ScanRecord) -> str:
    if scan.match_status:
        return scan.match_status

    if scan.medicine_name:
        return "identified"

    if scan.raw_ocr_text:
        return "ocr_extracted"

    return "saved"


def build_history_response(scan: ScanRecord) -> dict:
    image_url = build_image_url(scan.image_path)

    return {
        "id": scan.id,
        "user_id": scan.user_id,
        "image_path": scan.image_path,
        "image_url": image_url,
        "barcode": scan.barcode,
        "medicine_id": scan.medicine_id,
        "medicine_name": scan.medicine_name,
        "raw_ocr_text": scan.raw_ocr_text,
        "raw_text": scan.raw_ocr_text,
        "translated_text": scan.translated_text,
        "manufacturer": scan.manufacturer,
        "usage": scan.usage,
        "dosage": scan.dosage,
        "warnings": scan.warnings,
        "source_type": normalize_source_type(scan),
        "match_status": normalize_match_status(scan),
        "ocr_status": scan.ocr_status,
        "ai_status": scan.ai_status,
        "ocr_confidence": scan.ocr_confidence,
        "ai_confidence": scan.ai_confidence,
        "trust_notes": scan.trust_notes,
        "created_at": scan.created_at,
        "ingredients": scan.ingredients,
    }


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
        raise HTTPException(status_code=404, detail="History record not found")

    return scan


@router.get("/", response_model=list[HistoryResponse])
def get_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    scans = (
        db.query(ScanRecord)
        .filter(ScanRecord.user_id == current_user.id)
        .order_by(ScanRecord.created_at.desc(), ScanRecord.id.desc())
        .all()
    )

    return [build_history_response(scan) for scan in scans]


@router.get("/{scan_id}", response_model=HistoryResponse)
def get_history_item(
    scan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    scan = get_user_scan_or_404(scan_id, db, current_user)
    return build_history_response(scan)


@router.delete("/{scan_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_history_item(
    scan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    scan = get_user_scan_or_404(scan_id, db, current_user)

    db.delete(scan)
    db.commit()

    return Response(status_code=status.HTTP_204_NO_CONTENT)