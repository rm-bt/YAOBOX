from datetime import datetime
from pydantic import BaseModel


class ScanCreate(BaseModel):
    medicine_name: str | None = None
    raw_ocr_text: str | None = None
    translated_text: str | None = None
    barcode: str | None = None
    manufacturer: str | None = None
    usage: str | None = None
    dosage: str | None = None


class ScanResponse(BaseModel):
    id: int
    user_id: int
    image_path: str | None = None
    barcode: str | None = None
    medicine_name: str | None = None
    raw_ocr_text: str | None = None
    translated_text: str | None = None
    manufacturer: str | None = None
    usage: str | None = None
    dosage: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True