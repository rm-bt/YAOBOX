import os
from pathlib import Path

from fastapi import APIRouter
from pydantic import BaseModel, Field

try:
    from google import genai
    GENAI_IMPORT_ERROR = ""
except Exception as exc:
    genai = None
    GENAI_IMPORT_ERROR = str(exc)


router = APIRouter()

MAX_ASSISTANT_QUESTION_LENGTH = 500
MAX_ASSISTANT_CONTEXT_LENGTH = 700
MAX_ASSISTANT_RESPONSE_CHARS = 1800

SAFETY_NOTE = (
    "YAOBOX can explain general health and medicine information, but it does not "
    "diagnose disease, prescribe treatment, or replace a doctor or pharmacist."
)


class AssistantRequest(BaseModel):
    question: str = Field(..., min_length=3, max_length=MAX_ASSISTANT_QUESTION_LENGTH)
    context: str | None = Field(default=None, max_length=MAX_ASSISTANT_CONTEXT_LENGTH)


class AssistantResponse(BaseModel):
    answer: str
    safety_note: str


def load_backend_env() -> None:
    possible_paths = [
        Path.cwd() / ".env",
        Path(__file__).resolve().parents[3] / ".env",
    ]

    for env_path in possible_paths:
        if not env_path.exists():
            continue

        for raw_line in env_path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()

            if not line or line.startswith("#") or "=" not in line:
                continue

            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")

            if key and key not in os.environ:
                os.environ[key] = value


def shorten_answer(answer: str) -> str:
    if len(answer) <= MAX_ASSISTANT_RESPONSE_CHARS:
        return answer

    return (
        answer[:MAX_ASSISTANT_RESPONSE_CHARS].rstrip()
        + "\n\n[Answer shortened to reduce API usage.]"
    )


def fallback_answer(question: str, reason: str) -> str:
    answer = (
        "I can give general wellness guidance, but the Gemini AI service is not available right now.\n\n"
        f"Technical reason: {reason}\n\n"
        "General advice:\n"
        "- Follow the medicine label or doctor/pharmacist instructions.\n"
        "- Avoid mixing medicines without professional advice.\n"
        "- Keep a simple routine for sleep, hydration, meals, and medication timing.\n"
        "- If symptoms are severe, worsening, or unusual, contact a healthcare professional.\n\n"
        f"Your question was: {question}"
    )

    return shorten_answer(answer)


def build_prompt(question: str, context: str | None) -> str:
    return f"""
You are YAOBOX Medicine & Wellness Assistant.

Your job:
- Explain general health and medicine information in simple language.
- Give safe lifestyle and habit advice.
- Mention bad habits that may worsen common health problems.
- Suggest when the user should contact a doctor or pharmacist.
- Stay cautious and honest.

Rules:
- Do NOT diagnose the user.
- Do NOT prescribe medication.
- Do NOT tell the user to stop or change prescribed medicine.
- Do NOT claim certainty about diseases.
- For emergency symptoms, tell the user to seek urgent medical help.
- Keep the answer useful for a normal patient, not overly technical.
- Use short sections and clear bullets.
- Keep the answer under 250 words unless the user asks for more detail.

Optional user context:
{context or "No extra context provided."}

User question:
{question}
""".strip()


@router.post("/chat", response_model=AssistantResponse)
def chat_with_assistant(payload: AssistantRequest):
    load_backend_env()

    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash").strip() or "gemini-2.5-flash"

    if not api_key:
        return AssistantResponse(
            answer=fallback_answer(
                payload.question,
                "GEMINI_API_KEY was not loaded. Check backend/.env and restart uvicorn.",
            ),
            safety_note=SAFETY_NOTE,
        )

    if genai is None:
        return AssistantResponse(
            answer=fallback_answer(
                payload.question,
                f"google-genai import failed: {GENAI_IMPORT_ERROR}",
            ),
            safety_note=SAFETY_NOTE,
        )

    try:
        client = genai.Client(api_key=api_key)

        response = client.models.generate_content(
            model=model,
            contents=build_prompt(payload.question, payload.context),
        )

        answer = getattr(response, "text", None)

        if not answer:
            answer = fallback_answer(
                payload.question,
                "Gemini returned an empty response.",
            )
        else:
            answer = shorten_answer(answer)

        return AssistantResponse(
            answer=answer,
            safety_note=SAFETY_NOTE,
        )

    except Exception as exc:
        return AssistantResponse(
            answer=fallback_answer(
                payload.question,
                f"{type(exc).__name__}: {exc}",
            ),
            safety_note=SAFETY_NOTE,
        )