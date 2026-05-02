import json
from pathlib import Path

from sqlalchemy.orm import Session

from app.models.medicine import Medicine


SEED_PATH = Path(__file__).resolve().parents[1] / "data" / "verified_medicines_seed.json"


def normalize_text(value: str | None) -> str | None:
    if value is None:
        return None

    cleaned = str(value).strip()
    return cleaned or None


def normalize_key(value: str | None) -> str:
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


def find_existing_medicine(db: Session, item: dict) -> Medicine | None:
    barcode = normalize_text(item.get("barcode"))
    name_zh = normalize_text(item.get("canonical_name_zh"))
    name_en = normalize_text(item.get("canonical_name_en"))

    if barcode:
        existing = db.query(Medicine).filter(Medicine.barcode == barcode).first()
        if existing:
            return existing

    if name_zh:
        existing = (
            db.query(Medicine)
            .filter(Medicine.canonical_name_zh == name_zh)
            .first()
        )
        if existing:
            return existing

    if name_en:
        existing = (
            db.query(Medicine)
            .filter(Medicine.canonical_name_en == name_en)
            .first()
        )
        if existing:
            return existing

    return None


def apply_medicine_fields(medicine: Medicine, item: dict) -> Medicine:
    medicine.canonical_name_en = normalize_text(item.get("canonical_name_en"))
    medicine.canonical_name_zh = normalize_text(item.get("canonical_name_zh"))
    medicine.barcode = normalize_text(item.get("barcode"))
    medicine.manufacturer = normalize_text(item.get("manufacturer"))
    medicine.manufacturer_en = normalize_text(item.get("manufacturer_en"))
    medicine.usage = normalize_text(item.get("usage"))
    medicine.usage_en = normalize_text(item.get("usage_en"))
    medicine.dosage = normalize_text(item.get("dosage"))
    medicine.warnings = normalize_text(item.get("warnings"))
    medicine.warnings_en = normalize_text(item.get("warnings_en"))
    medicine.aliases = normalize_text(item.get("aliases"))
    medicine.is_verified = bool(item.get("is_verified", True))

    return medicine


def seed_verified_medicines(db: Session) -> dict:
    if not SEED_PATH.exists():
        return {
            "created": 0,
            "updated": 0,
            "skipped": 0,
            "message": f"Seed file not found: {SEED_PATH}",
        }

    items = json.loads(SEED_PATH.read_text(encoding="utf-8"))

    created = 0
    updated = 0
    skipped = 0

    for item in items:
        if not item.get("canonical_name_en") and not item.get("canonical_name_zh"):
            skipped += 1
            continue

        existing = find_existing_medicine(db, item)

        if existing:
            apply_medicine_fields(existing, item)
            updated += 1
        else:
            medicine = apply_medicine_fields(Medicine(), item)
            db.add(medicine)
            created += 1

    db.commit()

    return {
        "created": created,
        "updated": updated,
        "skipped": skipped,
        "total": len(items),
    }


def find_best_catalog_match(
    db: Session,
    barcode: str | None = None,
    query_text: str | None = None,
) -> Medicine | None:
    clean_barcode = normalize_text(barcode)

    if clean_barcode:
        medicine = db.query(Medicine).filter(Medicine.barcode == clean_barcode).first()
        if medicine:
            return medicine

    normalized_query = normalize_key(query_text)

    if not normalized_query:
        return None

    medicines = (
        db.query(Medicine)
        .order_by(Medicine.is_verified.desc(), Medicine.id.desc())
        .all()
    )

    for medicine in medicines:
        keys = [
            medicine.canonical_name_zh,
            medicine.canonical_name_en,
            medicine.aliases,
            medicine.barcode,
            medicine.manufacturer,
            medicine.manufacturer_en,
        ]

        for key in keys:
            normalized_key = normalize_key(key)

            if not normalized_key:
                continue

            if (
                normalized_query == normalized_key
                or normalized_query in normalized_key
                or normalized_key in normalized_query
            ):
                return medicine

    return None