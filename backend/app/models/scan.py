from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.core.database import Base


class ScanRecord(Base):
    __tablename__ = "scan_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    image_path = Column(String(500), nullable=True)
    barcode = Column(String(128), nullable=True, index=True)

    medicine_id = Column(Integer, ForeignKey("medicines.id"), nullable=True)

    medicine_name = Column(String(255), nullable=True)
    raw_ocr_text = Column(Text, nullable=True)
    translated_text = Column(Text, nullable=True)

    manufacturer = Column(String(255), nullable=True)
    usage = Column(Text, nullable=True)
    dosage = Column(String(255), nullable=True)
    warnings = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())