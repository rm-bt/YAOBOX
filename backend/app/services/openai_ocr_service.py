import base64
import json
import mimetypes
import os
from dataclasses import dataclass

from dotenv import load_dotenv
from openai import OpenAI

from app.services.ocr_service import clean_text


load_dotenv()


@dataclass(frozen=True)
class OpenAIOCRResult:
    raw_text: str
    cleaned_text: str
    confidence: float | None
    status: str
    engine: str = "openai_vision"
    error: str | None = None


def is_openai_ocr_enabled() -> bool:
    return os.getenv("OPENAI_OCR_ENABLED", "false").strip().lower() == "true"


def _guess_mime_type(image_path: str) -> str:
    mime_type, _ = mimetypes.guess_type(image_path)
    return mime_type or "image/jpeg"


def _image_to_data_url(image_path: str) -> str:
    mime_type = _guess_mime_type(image_path)

    with open(image_path, "rb") as image_file:
        encoded = base64.b64encode(image_file.read()).decode("utf-8")

    return f"data:{mime_type};base64,{encoded}"


def _extract_json_object(text: str) -> dict:
    cleaned = text.strip()

    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        cleaned = cleaned.replace("json", "", 1).strip()

    start = cleaned.find("{")
    end = cleaned.rfind("}")

    if start == -1 or end == -1 or end <= start:
        raise ValueError("OpenAI OCR response did not contain a JSON object.")

    return json.loads(cleaned[start : end + 1])


def extract_text_openai_vision(image_path: str) -> OpenAIOCRResult:
    if not is_openai_ocr_enabled():
        return OpenAIOCRResult(
            raw_text="",
            cleaned_text="",
            confidence=None,
            status="disabled",
            error="OpenAI OCR is disabled. Set OPENAI_OCR_ENABLED=true.",
        )

    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    model = os.getenv("OPENAI_OCR_MODEL", "gpt-4.1-mini").strip() or "gpt-4.1-mini"

    if not api_key:
        return OpenAIOCRResult(
            raw_text="",
            cleaned_text="",
            confidence=None,
            status="failed",
            error="OPENAI_API_KEY is missing in backend/.env.",
        )

    if not os.path.exists(image_path):
        return OpenAIOCRResult(
            raw_text="",
            cleaned_text="",
            confidence=None,
            status="failed",
            error=f"Image file not found: {image_path}",
        )

    try:
        client = OpenAI(api_key=api_key)
        image_url = _image_to_data_url(image_path)

        prompt = """
You are an OCR extraction engine for Chinese medicine packages, prescriptions, and medical reports.

Task:
Extract visible text from the image as accurately as possible.

Rules:
- Return JSON only.
- Do not explain.
- Do not diagnose.
- Do not invent missing text.
- Preserve Chinese text exactly when visible.
- Preserve English, numbers, dosage units, manufacturer names, and warnings.
- If text is unclear, include only what is reasonably visible.
- Do not translate in raw_text.
- confidence must be a number between 0 and 1.

Return this JSON shape:
{
  "raw_text": "all visible text, line by line",
  "confidence": 0.0
}
""".strip()

        response = client.responses.create(
            model=model,
            input=[
                {
                    "role": "user",
                    "content": [
                        {"type": "input_text", "text": prompt},
                        {
                            "type": "input_image",
                            "image_url": image_url,
                        },
                    ],
                }
            ],
        )

        output_text = getattr(response, "output_text", "") or ""

        data = _extract_json_object(output_text)
        raw_text = str(data.get("raw_text", "") or "").strip()
        cleaned_text = clean_text(raw_text)

        try:
            confidence = float(data.get("confidence"))
        except (TypeError, ValueError):
            confidence = None

        if confidence is not None:
            confidence = max(0.0, min(1.0, round(confidence, 3)))

        return OpenAIOCRResult(
            raw_text=raw_text,
            cleaned_text=cleaned_text,
            confidence=confidence,
            status="succeeded" if cleaned_text else "empty",
        )

    except Exception as exc:
        return OpenAIOCRResult(
            raw_text="",
            cleaned_text="",
            confidence=None,
            status="failed",
            error=str(exc),
        )