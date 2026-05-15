import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from sqlalchemy.orm import Session

from app.models.medicine import Medicine


SEED_PATH = Path(__file__).resolve().parents[1] / "data" / "verified_medicines_seed.json"

MIN_MATCH_SCORE = 55

CHINESE_PHRASE_MIN_LENGTH = 2

MOJIBAKE_REPLACEMENTS = {
    "ã€€": "",
    "ã€‚": "。",
    "ï¼Œ": "，",
    "ï¼›": "；",
    "ï¼š": "：",
    "ï¼ˆ": "（",
    "ï¼‰": "）",
    "ï¼": "",
}

PUNCTUATION_PATTERN = re.compile(r"[\s\-_.,，。;；:：()（）【】\[\]{}<>《》/\\|]+")


@dataclass
class CatalogMatchResult:
    medicine: Medicine | None
    score: int
    reason: str


def normalize_text(value: Any) -> str | None:
    if value is None:
        return None

    if isinstance(value, list):
        value = ";".join(str(item).strip() for item in value if str(item).strip())

    cleaned = str(value).strip()
    return cleaned or None


def normalize_key(value: Any) -> str:
    if value is None:
        return ""

    text = str(value)

    for bad, good in MOJIBAKE_REPLACEMENTS.items():
        text = text.replace(bad, good)

    text = PUNCTUATION_PATTERN.sub("", text)
    return text.strip().lower()


def split_aliases(value: Any) -> list[str]:
    if value is None:
        return []

    if isinstance(value, list):
        raw_items = value
    else:
        text = str(value)
        for bad, good in MOJIBAKE_REPLACEMENTS.items():
            text = text.replace(bad, good)

        raw_items = re.split(r"[;,；，|/\n]+", text)

    aliases: list[str] = []

    for item in raw_items:
        cleaned = str(item).strip()
        if cleaned:
            aliases.append(cleaned)

    return list(dict.fromkeys(aliases))


def build_alias_text(item: dict) -> str | None:
    aliases: list[str] = []

    aliases.extend(split_aliases(item.get("aliases")))
    aliases.extend(split_aliases(item.get("search_aliases")))

    for key in [
        "canonical_name_zh",
        "canonical_name_en",
        "manufacturer",
        "manufacturer_en",
        "usage",
        "usage_en",
    ]:
        value = normalize_text(item.get(key))
        if value:
            aliases.append(value)

    aliases = list(dict.fromkeys(alias for alias in aliases if alias.strip()))
    return ";".join(aliases) if aliases else None


def extract_digits(value: str | None) -> str:
    if not value:
        return ""

    return "".join(ch for ch in str(value) if ch.isdigit())


def contains_chinese(value: str) -> bool:
    return bool(re.search(r"[\u3400-\u9fff]", value))


def useful_alias(alias: str) -> bool:
    key = normalize_key(alias)

    if not key:
        return False

    if key.isdigit():
        return len(key) >= 3

    if contains_chinese(key):
        return len(key) >= CHINESE_PHRASE_MIN_LENGTH

    return len(key) >= 4


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

    return list(dict.fromkeys(key for key in keys if key and useful_alias(key)))


def build_query_text(
    extracted_name: str | None,
    raw_text: str | None,
    extracted_manufacturer: str | None = None,
    extracted_dosage: str | None = None,
) -> str:
    parts = [
        extracted_name or "",
        extracted_manufacturer or "",
        extracted_dosage or "",
        raw_text or "",
    ]

    return "\n".join(part for part in parts if part.strip())


def score_alias_against_text(alias: str, query_text: str) -> int:
    alias_key = normalize_key(alias)
    query_key = normalize_key(query_text)

    if not alias_key or not query_key:
        return 0

    if alias_key == query_key:
        return 100

    if alias_key in query_key:
        if alias_key.isdigit():
            return 25

        if contains_chinese(alias_key):
            if len(alias_key) >= 5:
                return 95
            if len(alias_key) >= 3:
                return 85
            return 60

        return 70

    if query_key in alias_key and len(query_key) >= 4:
        return 55

    return 0


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
        return CatalogMatchResult(medicine=medicine, score=140, reason="barcode_exact")

    query_text = build_query_text(
        extracted_name=extracted_name,
        raw_text=raw_text,
        extracted_manufacturer=extracted_manufacturer,
        extracted_dosage=extracted_dosage,
    )

    if not normalize_key(query_text):
        return CatalogMatchResult(medicine=None, score=0, reason="empty_query")

    keys = medicine_match_keys(medicine)

    best_score = 0
    matched_keys: list[str] = []

    for key in keys:
        alias_score = score_alias_against_text(key, query_text)

        if alias_score > 0:
            matched_keys.append(key)
            best_score = max(best_score, alias_score)

    if not matched_keys:
        return CatalogMatchResult(medicine=None, score=0, reason="no_catalog_clue")

    # Add overlap score for multiple useful clues.
    # Example: 999 + 头痛 + 发热 + 鼻塞 + 流涕 + 咽痛 should beat bad OCR title text.
    clue_bonus = min(max(len(matched_keys) - 1, 0) * 7, 35)
    best_score += clue_bonus

    if dosage_matches(extracted_dosage, medicine.dosage):
        best_score += 15
        matched_keys.append("dosage")

    if text_contains(extracted_manufacturer, medicine.manufacturer) or text_contains(
        extracted_manufacturer,
        medicine.manufacturer_en,
    ):
        best_score += 12
        matched_keys.append("manufacturer")

    if medicine.is_verified:
        best_score += 8

    reason = "catalog_clues:" + ",".join(matched_keys[:8])

    return CatalogMatchResult(
        medicine=medicine,
        score=best_score,
        reason=reason,
    )


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
        .order_by(Medicine.is_verified.desc(), Medicine.id.asc())
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

    if best.medicine and best.score >= MIN_MATCH_SCORE:
        return best

    return CatalogMatchResult(
        medicine=None,
        score=best.score,
        reason=f"below_match_threshold:{best.reason}",
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
    medicine.aliases = build_alias_text(item)
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

    if not isinstance(items, list):
        return {
            "created": 0,
            "updated": 0,
            "skipped": 0,
            "message": "Seed file must contain a JSON list.",
        }

    created = 0
    updated = 0
    skipped = 0

    for item in items:
        if not isinstance(item, dict):
            skipped += 1
            continue

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