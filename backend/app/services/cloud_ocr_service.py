import os
from dataclasses import dataclass

from dotenv import load_dotenv
from google.cloud import vision

from app.services.ocr_service import clean_text


load_dotenv()


@dataclass(frozen=True)
class CloudOCRResult:
    raw_text: str
    cleaned_text: str
    confidence: float | None
    status: str
    engine: str = "google_vision"
    error: str | None = None


def is_google_vision_enabled() -> bool:
    return os.getenv("GOOGLE_VISION_ENABLED", "false").strip().lower() == "true"


def extract_text_google_vision(image_path: str) -> CloudOCRResult:
    if not is_google_vision_enabled():
        return CloudOCRResult(
            raw_text="",
            cleaned_text="",
            confidence=None,
            status="disabled",
            error="Google Vision OCR is disabled. Set GOOGLE_VISION_ENABLED=true.",
        )

    credentials_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "").strip()

    if not credentials_path:
        return CloudOCRResult(
            raw_text="",
            cleaned_text="",
            confidence=None,
            status="failed",
            error="GOOGLE_APPLICATION_CREDENTIALS is missing in backend/.env.",
        )

    if not os.path.exists(credentials_path):
        return CloudOCRResult(
            raw_text="",
            cleaned_text="",
            confidence=None,
            status="failed",
            error=f"Google Vision credentials file not found: {credentials_path}",
        )

    if not os.path.exists(image_path):
        return CloudOCRResult(
            raw_text="",
            cleaned_text="",
            confidence=None,
            status="failed",
            error=f"Image file not found: {image_path}",
        )

    try:
        client = vision.ImageAnnotatorClient()

        with open(image_path, "rb") as image_file:
            content = image_file.read()

        image = vision.Image(content=content)
        response = client.document_text_detection(image=image)

        if response.error.message:
            return CloudOCRResult(
                raw_text="",
                cleaned_text="",
                confidence=None,
                status="failed",
                error=response.error.message,
            )

        annotation = response.full_text_annotation
        raw_text = annotation.text.strip() if annotation and annotation.text else ""
        cleaned_text = clean_text(raw_text)

        confidence_values: list[float] = []

        if annotation:
            for page in annotation.pages:
                if page.confidence:
                    confidence_values.append(float(page.confidence))

                for block in page.blocks:
                    if block.confidence:
                        confidence_values.append(float(block.confidence))

                    for paragraph in block.paragraphs:
                        if paragraph.confidence:
                            confidence_values.append(float(paragraph.confidence))

        confidence = (
            round(sum(confidence_values) / len(confidence_values), 3)
            if confidence_values
            else None
        )

        return CloudOCRResult(
            raw_text=raw_text,
            cleaned_text=cleaned_text,
            confidence=confidence,
            status="succeeded" if cleaned_text else "empty",
        )

    except Exception as exc:
        return CloudOCRResult(
            raw_text="",
            cleaned_text="",
            confidence=None,
            status="failed",
            error=str(exc),
        )