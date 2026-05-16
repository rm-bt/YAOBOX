from datetime import datetime
from pydantic import BaseModel


class HistoryResponse(BaseModel):
    id: int
    user_id: int

    image_path: str | None = None
    image_url: str | None = None

    barcode: str | None = None
    medicine_id: int | None = None
    medicine_name: str | None = None

    raw_ocr_text: str | None = None
    raw_text: str | None = None
    translated_text: str | None = None

    manufacturer: str | None = None
    usage: str | None = None
    dosage: str | None = None
    warnings: str | None = None

    source_type: str | None = None
    match_status: str | None = None
    ocr_status: str | None = None
    ai_status: str | None = None
    ocr_confidence: float | None = None
    ai_confidence: str | None = None
    trust_notes: str | None = None
    ingredients: str | None = None

    created_at: datetime

    class Config:
        from_attributes = True