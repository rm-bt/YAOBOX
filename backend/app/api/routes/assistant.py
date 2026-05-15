import logging
import os
from pathlib import Path

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.api.routes.auth import get_current_user
from app.models.user import User

try:
    from google import genai

    GENAI_IMPORT_ERROR = ""
except Exception as exc:
    genai = None
    GENAI_IMPORT_ERROR = str(exc)


router = APIRouter()

logger = logging.getLogger(__name__)

MAX_ASSISTANT_QUESTION_LENGTH = 500
MAX_ASSISTANT_CONTEXT_LENGTH = 700
MAX_ASSISTANT_RESPONSE_CHARS = 1800

SAFETY_NOTE = (
    "YAOBOX provides general medicine-understanding support only. It does not "
    "diagnose disease, prescribe treatment, confirm medicine safety, or replace "
    "a doctor or pharmacist."
)

SAFE_FALLBACK_ANSWER = (
    "I cannot generate a full AI answer right now.\n\n"
    "General safety guidance:\n"
    "- Follow the medicine label and instructions from a doctor or pharmacist.\n"
    "- Do not start, stop, mix, or change medicine doses based only on this app.\n"
    "- If the medicine label is unclear, ask a pharmacist to confirm dosage, timing, "
    "contraindications, and side effects.\n"
    "- If symptoms are severe, worsening, unusual, or urgent, seek medical help instead "
    "of using this assistant.\n\n"
    "This response is a safe fallback, not medical advice."
)

EMERGENCY_KEYWORDS = [
    "chest pain",
    "can't breathe",
    "cannot breathe",
    "difficulty breathing",
    "shortness of breath",
    "severe allergic",
    "anaphylaxis",
    "swelling face",
    "swollen face",
    "swelling throat",
    "fainting",
    "passed out",
    "unconscious",
    "seizure",
    "overdose",
    "took too much",
    "suicide",
    "self harm",
    "blood in stool",
    "vomiting blood",
    "severe rash",
    "急救",
    "胸痛",
    "呼吸困难",
    "过敏性休克",
    "昏倒",
    "抽搐",
    "服药过量",
]

MEDICATION_DECISION_PATTERNS = [
    "can i stop",
    "should i stop",
    "stop taking",
    "can i quit",
    "should i quit",
    "can i take",
    "should i take",
    "can i combine",
    "can i mix",
    "mix with",
    "take together",
    "increase dose",
    "decrease dose",
    "change dose",
    "change dosage",
    "replace my medicine",
    "switch medicine",
    "is it safe for me",
    "safe for me",
    "how many should i take",
    "what dose",
    "what dosage",
    "我可以停",
    "能不能停",
    "可以一起吃",
    "能一起吃",
    "剂量",
    "加量",
    "减量",
    "换药",
]


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


def normalize_text(value: str | None) -> str:
    return (value or "").strip().lower()


def contains_any(text: str, patterns: list[str]) -> bool:
    return any(pattern.lower() in text for pattern in patterns)


def build_emergency_answer() -> str:
    return (
        "This could be urgent. Do not rely on this app for emergency symptoms.\n\n"
        "What to do now:\n"
        "- Seek urgent medical help immediately.\n"
        "- Contact local emergency services or go to the nearest emergency department.\n"
        "- If possible, bring the medicine package, prescription, or scan result with you.\n"
        "- Do not take more medicine while waiting unless a medical professional tells you to.\n\n"
        "YAOBOX cannot assess emergency symptoms or decide whether a medicine caused them."
    )


def build_medication_decision_answer() -> str:
    return (
        "I cannot tell you to start, stop, combine, replace, or change the dose of a medicine.\n\n"
        "Safer next steps:\n"
        "- Ask a doctor or pharmacist before changing how you take it.\n"
        "- Show them the medicine package, prescription, and any scan result.\n"
        "- Ask whether it interacts with other medicines, alcohol, supplements, or health conditions.\n"
        "- If you feel worse or have unusual symptoms, seek medical help promptly.\n\n"
        "I can help you prepare questions for a pharmacist, but I cannot make the medication decision for you."
    )


def deterministic_safety_answer(question: str, context: str | None) -> str | None:
    combined = normalize_text(f"{question}\n{context or ''}")

    if contains_any(combined, EMERGENCY_KEYWORDS):
        return build_emergency_answer()

    if contains_any(combined, MEDICATION_DECISION_PATTERNS):
        return build_medication_decision_answer()

    return None


def shorten_answer(answer: str) -> str:
    if len(answer) <= MAX_ASSISTANT_RESPONSE_CHARS:
        return answer

    return (
        answer[:MAX_ASSISTANT_RESPONSE_CHARS].rstrip()
        + "\n\n[Answer shortened for safety and readability.]"
    )


def fallback_answer(reason: str) -> str:
    logger.warning("Assistant fallback used: %s", reason)
    return SAFE_FALLBACK_ANSWER


def build_prompt(question: str, context: str | None) -> str:
    return f"""
You are YAOBOX Medicine Understanding Assistant.

Purpose:
- Help foreign users in China understand medicine-related information in simple English.
- Explain general medicine-label concepts, safer routines, reminder habits, and when to ask a professional.
- Stay within general educational support.

Hard safety rules:
- Do NOT diagnose the user.
- Do NOT prescribe medication.
- Do NOT recommend a dose.
- Do NOT tell the user to start, stop, replace, combine, or change medication.
- Do NOT claim a medicine is safe for the user personally.
- Do NOT claim certainty from OCR, AI translation, or incomplete user context.
- For emergency symptoms, tell the user to seek urgent medical help immediately.
- If the question needs personal medical judgment, tell the user to ask a doctor or pharmacist.
- If information is missing or unclear, say so directly.

Answer style:
- English only.
- Short sections.
- Clear bullets.
- Under 250 words unless the user asks for more detail.
- Include a short caution at the end when medicine decisions are involved.

Optional user context:
{context or "No extra context provided."}

User question:
{question}
""".strip()


@router.post("/chat", response_model=AssistantResponse)
def chat_with_assistant(
    payload: AssistantRequest,
    current_user: User = Depends(get_current_user),
):
    guardrail_answer = deterministic_safety_answer(
        question=payload.question,
        context=payload.context,
    )

    if guardrail_answer:
        return AssistantResponse(
            answer=guardrail_answer,
            safety_note=SAFETY_NOTE,
        )

    load_backend_env()

    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash").strip() or "gemini-2.5-flash"

    if not api_key:
        return AssistantResponse(
            answer=fallback_answer("GEMINI_API_KEY is missing."),
            safety_note=SAFETY_NOTE,
        )

    if genai is None:
        return AssistantResponse(
            answer=fallback_answer(f"google-genai import failed: {GENAI_IMPORT_ERROR}"),
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
            answer = fallback_answer("Gemini returned an empty response.")
        else:
            answer = shorten_answer(answer.strip())

        return AssistantResponse(
            answer=answer,
            safety_note=SAFETY_NOTE,
        )

    except Exception as exc:
        return AssistantResponse(
            answer=fallback_answer(f"{type(exc).__name__}: {exc}"),
            safety_note=SAFETY_NOTE,
        )