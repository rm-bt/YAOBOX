from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.api.routes.auth import get_current_user
from app.core.database import get_db
from app.models.medicine import Medicine
from app.models.user import User
from app.schemas.medicine import MedicineCreate, MedicineResponse
from app.services.medicine_catalog_service import seed_verified_medicines

router = APIRouter(prefix="/medicines", tags=["Medicines"])


def normalize_text(value: str | None) -> str | None:
    if value is None:
        return None

    cleaned = value.strip()
    return cleaned or None


@router.post("/", response_model=MedicineResponse)
def create_medicine(
    data: MedicineCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    medicine = Medicine(
        canonical_name_en=normalize_text(data.canonical_name_en),
        canonical_name_zh=normalize_text(data.canonical_name_zh),
        barcode=normalize_text(data.barcode),
        manufacturer=normalize_text(data.manufacturer),
        manufacturer_en=normalize_text(data.manufacturer_en),
        usage=normalize_text(data.usage),
        usage_en=normalize_text(data.usage_en),
        dosage=normalize_text(data.dosage),
        warnings=normalize_text(data.warnings),
        warnings_en=normalize_text(data.warnings_en),
        aliases=normalize_text(data.aliases),
        is_verified=data.is_verified,
        ingredients=normalize_text(data.ingredients),
        ingredients_en=normalize_text(data.ingredients_en),
    )

    db.add(medicine)
    db.commit()
    db.refresh(medicine)

    return medicine


@router.post("/seed")
def seed_medicine_catalog(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = seed_verified_medicines(db)

    return {
        "message": "Verified medicine catalog seed completed.",
        **result,
    }


@router.get("/search", response_model=list[MedicineResponse])
def search_medicines(
    q: str | None = Query(default=None),
    barcode: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Medicine)

    clean_barcode = normalize_text(barcode)
    clean_q = normalize_text(q)

    if clean_barcode:
        query = query.filter(Medicine.barcode == clean_barcode)
    elif clean_q:
        like_value = f"%{clean_q}%"
        query = query.filter(
            or_(
                Medicine.canonical_name_en.ilike(like_value),
                Medicine.canonical_name_zh.ilike(like_value),
                Medicine.aliases.ilike(like_value),
                Medicine.manufacturer.ilike(like_value),
                Medicine.manufacturer_en.ilike(like_value),
                Medicine.usage.ilike(like_value),
                Medicine.usage_en.ilike(like_value),
            )
        )

    return (
        query.order_by(Medicine.is_verified.desc(), Medicine.id.desc())
        .limit(25)
        .all()
    )


@router.get("/{medicine_id}", response_model=MedicineResponse)
def get_medicine(
    medicine_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    medicine = db.query(Medicine).filter(Medicine.id == medicine_id).first()

    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found")

    return medicine