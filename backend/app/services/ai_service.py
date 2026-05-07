import logging
import time

from google import genai

from app.core.config import settings

logger = logging.getLogger(__name__)

MAX_AI_OUTPUT_CHARS = 1800

GENERAL_SAFETY_NOTE = (
    "This is an AI-generated explanation based on available scan/catalog text. "
    "It may be incomplete or wrong. Confirm important medicine decisions with a "
    "doctor or pharmacist."
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


def explain_medicine_info(
    medicine_name: str | None,
    manufacturer: str | None,
    usage: str | None,
    dosage: str | None,
    raw_text: str | None = None,
) -> str:
    client = _get_client()

    prompt = f"""
You are a medical translation and medicine-label explanation assistant for foreign users in China.

Task:
Translate and explain the provided medicine information in clear English.

Hard safety rules:
- Do not diagnose disease.
- Do not prescribe treatment.
- Do not tell the user to start, stop, combine, replace, or change medicine.
- Do not claim the medicine is safe for the user personally.
- Do not invent missing dosage, warnings, ingredients, or usage.
- If information is missing, write "Not available".
- Treat OCR text as possibly incomplete or inaccurate.
- Keep warnings and uncertainty visible.

Return plain text only using this structure:

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
""".strip()

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

    safe_name = medicine_name or "Unknown medicine"
    safe_manufacturer = manufacturer or "Not available"
    safe_usage = usage or "Not available"
    safe_dosage = dosage or "Not available"

    return (
        f"Medicine: {safe_name}\n"
        f"Manufacturer: {safe_manufacturer}\n"
        f"Usage: {safe_usage}\n"
        f"Dosage: {safe_dosage}\n"
        "Warnings: Not available\n"
        "Simple Explanation: AI explanation is temporarily unavailable. "
        "The fields above are only the available recorded scan/catalog values.\n"
        f"Safety Note: {GENERAL_SAFETY_NOTE}"
    )


def answer_scan_question(
    medicine_name: str | None,
    manufacturer: str | None,
    usage: str | None,
    dosage: str | None,
    translated_text: str | None,
    user_question: str,
) -> str:
    client = _get_client()

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

    safe_name = medicine_name or "Unknown medicine"
    safe_usage = usage or "Not available"
    safe_dosage = dosage or "Not available"

    return (
        f"Medicine: {safe_name}\n"
        f"Usage: {safe_usage}\n"
        f"Dosage: {safe_dosage}\n"
        "Answer: AI question answering is temporarily unavailable. I cannot safely "
        "infer more than the recorded scan/catalog fields above.\n"
        f"Safety Note: {GENERAL_SAFETY_NOTE}"
    )