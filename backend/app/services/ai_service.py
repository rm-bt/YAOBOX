import logging
import time

from deep_translator import GoogleTranslator
from google import genai

from app.core.config import settings

logger = logging.getLogger(__name__)

MAX_AI_OUTPUT_CHARS = 1800

GENERAL_SAFETY_NOTE = (
    "This is an AI-generated or machine-translated explanation based on OCR/catalog text. "
    "OCR and translation may be incomplete or wrong. Confirm important medicine decisions "
    "with a doctor or pharmacist."
)


def _get_client():
    if not settings.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is missing in .env")

    return genai.Client(api_key=settings.GEMINI_API_KEY)


def _shorten_output(value: str) -> str:
    cleaned = value.strip()

    if len(cleaned) <= MAX_AI_OUTPUT_CHARS:
        return cleaned

    return cleaned[:MAX_AI_OUTPUT_CHARS].rstrip() + "\n\n[Output shortened.]"


def _translate_text_fallback(text: str | None) -> str:
    if not text or not text.strip():
        return ""

    try:
        translated = GoogleTranslator(source="auto", target="en").translate(text.strip())
        return translated.strip() if translated else ""
    except Exception as exc:
        logger.warning("Fallback translation failed: %s", exc)
        return ""


def _build_translation_fallback(raw_text: str | None) -> str:
    translated = _translate_text_fallback(raw_text)

    if translated:
        return _shorten_output(
            "English Translation:\n"
            f"{translated}\n\n"
            "Simple Explanation:\n"
            "The text above is a direct machine translation of the OCR-extracted Chinese document text. "
            "Use it to understand the visible content, but verify important medicine details with a professional.\n\n"
            f"Safety Note: {GENERAL_SAFETY_NOTE}"
        )

    return (
        "English Translation: Not available\n"
        "Simple Explanation: AI explanation and machine translation are temporarily unavailable. "
        "Review the original OCR text directly.\n"
        f"Safety Note: {GENERAL_SAFETY_NOTE}"
    )


def explain_medicine_info(
    medicine_name: str | None,
    manufacturer: str | None,
    usage: str | None,
    dosage: str | None,
     ingredients: str | None = None,
    raw_text: str | None = None,
) -> str:
    prompt = f"""
You are a medical translation and medicine-label explanation assistant for foreign users in China.

Task:
Translate and explain the provided medicine/document information in clear English.

Hard safety rules:
- Do not diagnose disease.
- Do not prescribe treatment.
- Do not tell the user to start, stop, combine, replace, or change medicine.
- Do not claim the medicine is safe for the user personally.
- Do not invent missing dosage, warnings, ingredients, or usage.
- If information is missing, write "Not available".
- Treat OCR text as possibly incomplete or inaccurate.
- Keep warnings and uncertainty visible.
- If the input is a prescription or medical report, translate/explain the visible text only.

Return plain text only using this structure:

English Translation:
Medicine:
Manufacturer:
Usage:
Dosage:
Warnings:
Simple Explanation:
Safety Note:

Input:
Medicine name: {medicine_name or ""}
Manufacturer: {manufacturer or ""}
Usage: {usage or ""}
Dosage: {dosage or ""}
Raw OCR text: {raw_text or ""}
Ingredients: {ingredients or ""}
""".strip()

    try:
        client = _get_client()
    except Exception as exc:
        logger.warning("Gemini client unavailable, using translation fallback: %s", exc)
        return _build_translation_fallback(raw_text)

    for attempt in range(3):
        try:
            response = client.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=prompt,
            )

            text = getattr(response, "text", "") or ""
            if text.strip():
                return _shorten_output(text)

        except Exception as exc:
            logger.warning(
                "Medicine explanation attempt %s failed: %s",
                attempt + 1,
                exc,
            )
            time.sleep(1)

    return _build_translation_fallback(raw_text)


def answer_scan_question(
    medicine_name: str | None,
    manufacturer: str | None,
    usage: str | None,
    dosage: str | None,
    translated_text: str | None,
    user_question: str,
) -> str:
    prompt = f"""
You are a medicine-information assistant for foreign users in China.

Answer the user's question using ONLY the scan/catalog information below.

Hard safety rules:
- English only.
- Do not diagnose disease.
- Do not prescribe treatment.
- Do not recommend a dose.
- Do not tell the user to start, stop, combine, replace, or change medication.
- Do not claim this medicine is safe for the user personally.
- Do not invent missing facts.
- If the provided information is insufficient, say that clearly.
- If the question requires personal medical judgment, tell the user to ask a doctor or pharmacist.
- Treat OCR and AI-translated text as possibly incomplete.

Available scan/catalog information:
Medicine name: {medicine_name or "Not available"}
Manufacturer: {manufacturer or "Not available"}
Usage: {usage or "Not available"}
Dosage: {dosage or "Not available"}
Existing explanation: {translated_text or "Not available"}

User question:
{user_question}

Return a clear answer under 200 words, followed by a short safety note.
""".strip()

    try:
        client = _get_client()
    except Exception as exc:
        logger.warning("Gemini client unavailable for scan question: %s", exc)
        return (
            "Answer: AI question answering is temporarily unavailable.\n"
            f"Safety Note: {GENERAL_SAFETY_NOTE}"
        )

    for attempt in range(3):
        try:
            response = client.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=prompt,
            )

            text = getattr(response, "text", "") or ""
            if text.strip():
                return _shorten_output(text)

        except Exception as exc:
            logger.warning(
                "Scan question attempt %s failed: %s",
                attempt + 1,
                exc,
            )
            time.sleep(1)

    return (
        "Answer: AI question answering is temporarily unavailable.\n"
        f"Safety Note: {GENERAL_SAFETY_NOTE}"
    )