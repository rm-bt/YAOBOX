import json
from dataclasses import dataclass
from pathlib import Path

from sqlalchemy.orm import Session

from app.models.medicine import Medicine


SEED_PATH = Path(__file__).resolve().parents[1] / "data" / "verified_medicines_seed.json"


@dataclass
class CatalogMatchResult:
    medicine: Medicine | None
    score: int
    reason: str


def normalize_text(value: str | None) -> str | None:
    if value is None:
        return None

    cleaned = str(value).strip()
    return cleaned or None


def normalize_key(value: str | None) -> str:
    if not value:
        return ""

    return (
        str(value)
        .replace(" ", "")
        .replace("　", "")
        .replace("-", "")
        .replace("_", "")
        .replace("（", "(")
        .replace("）", ")")
        .replace("：", ":")
        .replace("，", ",")
        .replace("。", ".")
        .strip()
        .lower()
    )


def split_aliases(value: str | None) -> list[str]:
    if not value:
        return []

    separators = [";", "；", ",", "，", "|", "/", "\n"]
    items = [value]

    for separator in separators:
        next_items: list[str] = []
        for item in items:
            next_items.extend(item.split(separator))
        items = next_items

    return [item.strip() for item in items if item.strip()]


def extract_digits(value: str | None) -> str:
    if not value:
        return ""

    return "".join(ch for ch in str(value) if ch.isdigit())


def dosage_matches(extracted_dosage: str | None, catalog_dosage: str | None) -> bool:
    extracted = normalize_key(extracted_dosage)
    catalog = normalize_key(catalog_dosage)

    if not extracted or not catalog:
        return False

    if extracted == catalog or extracted in catalog or catalog in extracted:
        return True

    extracted_digits = extract_digits(extracted)
    catalog_digits = extract_digits(catalog)

    return bool(extracted_digits and catalog_digits and extracted_digits == catalog_digits)


def text_contains(haystack: str | None, needle: str | None) -> bool:
    normalized_haystack = normalize_key(haystack)
    normalized_needle = normalize_key(needle)

    if not normalized_haystack or not normalized_needle:
        return False

    return normalized_needle in normalized_haystack or normalized_haystack in normalized_needle


def medicine_match_keys(medicine: Medicine) -> list[str]:
    keys = [
        medicine.canonical_name_zh,
        medicine.canonical_name_en,
        medicine.barcode,
        medicine.manufacturer,
        medicine.manufacturer_en,
    ]

    keys.extend(split_aliases(medicine.aliases))

    return [key for key in keys if key]


def build_query_candidates(
    extracted_name: str | None,
    raw_text: str | None,
) -> list[str]:
    candidates: list[str] = []

    if extracted_name:
        candidates.append(extracted_name)

    if raw_text:
        lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
        candidates.extend(lines[:12])
        candidates.append(raw_text[:1000])

    seen: set[str] = set()
    unique_candidates: list[str] = []

    for candidate in candidates:
        normalized = normalize_key(candidate)
        if normalized and normalized not in seen:
            seen.add(normalized)
            unique_candidates.append(candidate)

    return unique_candidates


def score_medicine(
    medicine: Medicine,
    barcode: str | None,
    extracted_name: str | None,
    extracted_dosage: str | None,
    extracted_manufacturer: str | None,
    raw_text: str | None,
) -> CatalogMatchResult:
    clean_barcode = normalize_text(barcode)

    if clean_barcode and medicine.barcode and clean_barcode == medicine.barcode:
        return CatalogMatchResult(medicine=medicine, score=120, reason="barcode_exact")

    candidates = build_query_candidates(extracted_name, raw_text)
    keys = medicine_match_keys(medicine)

    best_score = 0
    best_reason = ""

    for candidate in candidates:
        candidate_key = normalize_key(candidate)

        if not candidate_key:
            continue

        for key in keys:
            catalog_key = normalize_key(key)

            if not catalog_key:
                continue

            if candidate_key == catalog_key:
                if 90 > best_score:
                    best_score = 90
                    best_reason = "name_exact"
            elif candidate_key in catalog_key or catalog_key in candidate_key:
                if 75 > best_score:
                    best_score = 75
                    best_reason = "name_partial"

    if best_score == 0:
        return CatalogMatchResult(medicine=None, score=0, reason="no_name_match")

    if dosage_matches(extracted_dosage, medicine.dosage):
        best_score += 20
        best_reason += "_dosage_confirmed"

    if text_contains(extracted_manufacturer, medicine.manufacturer) or text_contains(
        extracted_manufacturer,
        medicine.manufacturer_en,
    ):
        best_score += 8
        best_reason += "_manufacturer_confirmed"

    if medicine.is_verified:
        best_score += 5

    return CatalogMatchResult(medicine=medicine, score=best_score, reason=best_reason)


def match_catalog_medicine(
    db: Session,
    barcode: str | None = None,
    extracted_name: str | None = None,
    extracted_dosage: str | None = None,
    extracted_manufacturer: str | None = None,
    raw_text: str | None = None,
) -> CatalogMatchResult:
    medicines = (
        db.query(Medicine)
        .order_by(Medicine.is_verified.desc(), Medicine.id.desc())
        .all()
    )

    best = CatalogMatchResult(medicine=None, score=0, reason="no_catalog_match")

    for medicine in medicines:
        result = score_medicine(
            medicine=medicine,
            barcode=barcode,
            extracted_name=extracted_name,
            extracted_dosage=extracted_dosage,
            extracted_manufacturer=extracted_manufacturer,
            raw_text=raw_text,
        )

        if result.score > best.score:
            best = result

    if best.score >= 75:
        return best

    return CatalogMatchResult(medicine=None, score=best.score, reason="below_match_threshold")


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
    return match_catalog_medicine(
        db=db,
        barcode=barcode,
        extracted_name=query_text,
        raw_text=query_text,
    ).medicine