from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean
from sqlalchemy.sql import func

from app.core.database import Base


class Medicine(Base):
    __tablename__ = "medicines"

    id = Column(Integer, primary_key=True, index=True)

    canonical_name_en = Column(String(255), nullable=True, index=True)
    canonical_name_zh = Column(String(255), nullable=True, index=True)
    barcode = Column(String(128), nullable=True, index=True)

    manufacturer = Column(String(255), nullable=True)
    manufacturer_en = Column(String(255), nullable=True)

    ingredients = Column(Text, nullable=True)
    ingredients_en = Column(Text, nullable=True)

    usage = Column(Text, nullable=True)
    usage_en = Column(Text, nullable=True)

    dosage = Column(String(255), nullable=True)

    warnings = Column(Text, nullable=True)
    warnings_en = Column(Text, nullable=True)

    aliases = Column(Text, nullable=True)

    is_verified = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())