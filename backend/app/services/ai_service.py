import time
from google import genai
from app.core.config import settings


def _get_client():
    if not settings.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is missing in .env")
    return genai.Client(api_key=settings.GEMINI_API_KEY)


def explain_medicine_info(
    medicine_name: str | None,
    manufacturer: str | None,
    usage: str | None,
    dosage: str | None,
    raw_text: str | None = None,
) -> str:
    client = _get_client()

    prompt = f"""
You are a medical translation assistant for foreign users in China.

Translate the following Chinese medicine information into clear English.
Then explain it in simple, user-friendly language.

Rules:
- Answer in English only.
- Do not leave Chinese text in the output.
- Keep the explanation short and clear.
- If some information is missing, say "Not available".



Return plain text only with this structure:

Medicine:
Manufacturer:
Usage:
Dosage:
Simple Explanation:

Chinese input:
Medicine name: {medicine_name or ""}
Manufacturer: {manufacturer or ""}
Usage: {usage or ""}
Dosage: {dosage or ""}
Raw OCR text: {raw_text or ""}
""".strip()

    for _ in range(3):
        try:
            response = client.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=prompt,
            )
            return (response.text or "").strip()
        except Exception:
            time.sleep(1)

    safe_name = "Identified medicine" if medicine_name else "Unknown medicine"
    safe_manufacturer = "Recorded in the scan" if manufacturer else "Not available"
    safe_usage = "Recorded in the scan" if usage else "Not available"
    safe_dosage = "Recorded in the scan" if dosage else "Not available"

    return (
        f"Medicine: {safe_name}\n"
        f"Manufacturer: {safe_manufacturer}\n"
        f"Usage: {safe_usage}\n"
        f"Dosage: {safe_dosage}\n"
        f"Simple Explanation: AI service is temporarily unavailable. This is a limited fallback summary."
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
You are a medical information assistant for foreign users in China.

Answer the user's question in clear, simple English only.
Do not leave any Chinese in the answer.
Do not diagnose diseases.
Do not prescribe treatment.
Only use the information provided below.
If the information is insufficient, say that clearly.

Medicine name: {medicine_name or ""}
Manufacturer: {manufacturer or ""}
Usage: {usage or ""}
Dosage: {dosage or ""}
Existing explanation: {translated_text or ""}

User question:
{user_question}
""".strip()

    for _ in range(3):
        try:
            response = client.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=prompt,
            )
            return (response.text or "").strip()
        except Exception:
            time.sleep(1)

    safe_name = "Identified medicine" if medicine_name else "Unknown medicine"
    safe_dosage = "Recorded in the scan" if dosage else "Not available"

    return (
        f"Medicine: {safe_name}\n"
        f"Usage: This medicine is commonly used for the recorded indication.\n"
        f"Dosage: {safe_dosage}\n"
        f"Note: AI service is temporarily unavailable, so this is a limited fallback answer."
    )