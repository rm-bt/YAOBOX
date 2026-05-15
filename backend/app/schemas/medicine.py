from datetime import datetime
from pydantic import BaseModel


class MedicineCreate(BaseModel):
    canonical_name_en: str | None = None
    canonical_name_zh: str | None = None
    barcode: str | None = None
    manufacturer: str | None = None
    manufacturer_en: str | None = None
    ingredients: str | None = None
    ingredients_en: str | None = None
    usage: str | None = None
    usage_en: str | None = None
    dosage: str | None = None
    warnings: str | None = None
    warnings_en: str | None = None
    aliases: str | None = None
    is_verified: bool = True


class MedicineResponse(BaseModel):
    id: int
    canonical_name_en: str | None = None
    canonical_name_zh: str | None = None
    barcode: str | None = None
    manufacturer: str | None = None
    manufacturer_en: str | None = None
    ingredients: str | None = None
    ingredients_en: str | None = None
    usage: str | None = None
    usage_en: str | None = None
    dosage: str | None = None
    warnings: str | None = None
    warnings_en: str | None = None
    aliases: str | None = None
    is_verified: bool
    created_at: datetime | None = None

    class Config:
        from_attributes = True