from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.api.routes.auth import get_current_user
from app.core.database import get_db
from app.models.scan import ScanRecord
from app.models.user import User
from app.schemas.history import HistoryResponse

router = APIRouter(prefix="/history", tags=["History"])


def build_history_response(scan: ScanRecord) -> dict:
    image_url = None
    if scan.image_path:
        normalized = scan.image_path.replace("\\", "/")
        if normalized.startswith("uploads/"):
            image_url = f"/{normalized}"
        else:
            image_url = f"/uploads/{normalized.split('/')[-1]}"

    return {
        "id": scan.id,
        "medicine_name": scan.medicine_name,
        "barcode": scan.barcode,
        "translated_text": scan.translated_text,
        "raw_text": scan.raw_ocr_text,
        "manufacturer": scan.manufacturer,
        "usage": scan.usage,
        "dosage": scan.dosage,
        "image_url": image_url,
        "source_type": "image_upload" if scan.image_path else "manual_entry",
        "match_status": "identified" if scan.medicine_name else "saved",
        "created_at": scan.created_at,
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