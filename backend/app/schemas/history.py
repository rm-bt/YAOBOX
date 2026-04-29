from datetime import datetime
from pydantic import BaseModel


class HistoryResponse(BaseModel):
    id: int
    medicine_name: str | None = None
    barcode: str | None = None
    translated_text: str | None = None
    raw_text: str | None = None
    manufacturer: str | None = None
    usage: str | None = None
    dosage: str | None = None
    image_url: str | None = None
    source_type: str | None = None
    match_status: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True