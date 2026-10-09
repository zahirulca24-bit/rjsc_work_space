import base64
import json
from typing import Any, Optional

import httpx

from app.core.config import settings


GROQ_CHAT_URL = (
    "https://api.groq.com/openai/v1/chat/completions"
)

DOCUMENT_CATEGORIES = [
    "INCORPORATION",
    "MOA",
    "AOA",
    "FORM_XII",
    "FORM_VI",
    "ANNUAL_RETURN",
    "AGM",
    "SHARE_TRANSFER",
    "DIRECTOR_CHANGE",
    "REGISTERED_OFFICE",
    "CAPITAL",
    "MORTGAGE_CHARGE",
    "CERTIFIED_COPY",
    "PAYMENT_CHALLAN",
    "ACKNOWLEDGEMENT",
    "BOARD_RESOLUTION",
    "NID_PASSPORT",
    "TIN_BIN",
    "OTHER",
]


class AIUnavailableError(Exception):
    pass


class AIResponseError(Exception):
    pass


def is_configured() -> bool:
    return bool(
        settings.AI_PROVIDER == "groq"
        and settings.GROQ_API_KEY
    )


def _strip_json_fence(text: str) -> str:
    value = text.strip()

    if value.startswith("```"):
        lines = value.splitlines()

        if lines:
            lines = lines[1:]

        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]

        value = "\n".join(lines).strip()

    return value


def _normalize_result(data: dict[str, Any]) -> dict:
    category = str(
        data.get("suggested_category", "OTHER")
    ).upper()

    if category not in DOCUMENT_CATEGORIES:
        category = "OTHER"

    try:
        confidence = float(data.get("confidence", 0))
    except (TypeError, ValueError):
        confidence = 0

    confidence = max(0.0, min(confidence, 1.0))

    metadata = data.get("extracted_metadata")
    if not isinstance(metadata, dict):
        metadata = {}

    matches = data.get("checklist_matches")
    if not isinstance(matches, list):
        matches = []

    sanitized_matches = []

    for item in matches:
        if not isinstance(item, dict):
            continue

        item_id = item.get("item_id")
        if not item_id:
            continue

        sanitized_matches.append({
            "item_id": str(item_id),
            "reason": str(
                item.get("reason", "")
            )[:500],
        })

    needs_source_review = (
        confidence < 0.75
        or category == "OTHER"
        or bool(data.get("needs_source_review", False))
    )

    return {
        "suggested_category": category,
        "confidence": confidence,
        "extracted_metadata": metadata,
        "checklist_matches": sanitized_matches,
        "needs_source_review": needs_source_review,
    }


def _system_prompt() -> str:
    return """You classify internal RJSC office documents.

Strict rules:
1. Do not invent legal deadlines.
2. Do not calculate or invent government fees, VAT, penalties or late fees.
3. Do not make legal conclusions.
4. Use only facts visible in the supplied document/content.
5. Checklist matches may reference ONLY item_id values supplied by the system.
6. If uncertain, use suggested_category OTHER and needs_source_review true.
7. Return JSON only.

JSON shape:
{
  "suggested_category": "ONE_ALLOWED_CATEGORY",
  "confidence": 0.0,
  "extracted_metadata": {
    "company_name": null,
    "registration_number": null,
    "form_name": null,
    "document_date": null
  },
  "checklist_matches": [
    {
      "item_id": "provided-id",
      "reason": "short reason"
    }
  ],
  "needs_source_review": true
}
"""


def _user_prompt(
    filename: str,
    checklist: list[dict],
    text: Optional[str] = None,
) -> str:
    return (
        f"Filename: {filename}\n"
        f"Allowed categories: {json.dumps(DOCUMENT_CATEGORIES)}\n"
        f"Available checklist items: {json.dumps(checklist)}\n\n"
        "Document content follows:\n"
        f"{text or '[IMAGE PROVIDED SEPARATELY]'}"
    )


async def _call_groq(
    *,
    model: str,
    messages: list[dict],
) -> dict:
    if not is_configured():
        raise AIUnavailableError(
            "Groq AI is not configured"
        )

    headers = {
        "Authorization": (
            f"Bearer {settings.GROQ_API_KEY}"
        ),
        "Content-Type": "application/json",
    }

    payload = {
        "model": model,
        "messages": messages,
        "temperature": 0,
    }

    try:
        async with httpx.AsyncClient(
            timeout=60.0
        ) as client:
            response = await client.post(
                GROQ_CHAT_URL,
                headers=headers,
                json=payload,
            )
    except httpx.HTTPError as exc:
        raise AIUnavailableError(
            "Groq API is temporarily unavailable"
        ) from exc

    if response.status_code >= 400:
        raise AIUnavailableError(
            f"Groq API returned HTTP {response.status_code}"
        )

    try:
        body = response.json()
        content = body["choices"][0]["message"]["content"]
        parsed = json.loads(
            _strip_json_fence(content)
        )
    except (
        KeyError,
        IndexError,
        TypeError,
        ValueError,
        json.JSONDecodeError,
    ) as exc:
        raise AIResponseError(
            "Groq returned an invalid analysis response"
        ) from exc

    if not isinstance(parsed, dict):
        raise AIResponseError(
            "Groq analysis response must be an object"
        )

    return _normalize_result(parsed)


async def analyze_text_document(
    *,
    filename: str,
    text: str,
    checklist: list[dict],
) -> dict:
    messages = [
        {
            "role": "system",
            "content": _system_prompt(),
        },
        {
            "role": "user",
            "content": _user_prompt(
                filename,
                checklist,
                text,
            ),
        },
    ]

    result = await _call_groq(
        model=settings.GROQ_TEXT_MODEL,
        messages=messages,
    )

    result["model"] = settings.GROQ_TEXT_MODEL
    return result


async def analyze_image_document(
    *,
    filename: str,
    mime_type: str,
    data: bytes,
    checklist: list[dict],
) -> dict:
    encoded = base64.b64encode(data).decode("ascii")

    messages = [
        {
            "role": "system",
            "content": _system_prompt(),
        },
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": _user_prompt(
                        filename,
                        checklist,
                    ),
                },
                {
                    "type": "image_url",
                    "image_url": {
                        "url": (
                            f"data:{mime_type};base64,"
                            f"{encoded}"
                        )
                    },
                },
            ],
        },
    ]

    result = await _call_groq(
        model=settings.GROQ_VISION_MODEL,
        messages=messages,
    )

    result["model"] = settings.GROQ_VISION_MODEL
    return result
