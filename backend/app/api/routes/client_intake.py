"""Read-only client onboarding extraction. Never persists files or client data."""
import re
from datetime import date
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile
from app.services.document_extraction import extract_document_text, IMAGE_EXTENSIONS
from app.services.groq_ai import (
    is_configured, analyze_image_document, AIUnavailableError, AIResponseError,
)

router = APIRouter()
MAX_BYTES = 20 * 1024 * 1024
TYPES = {".pdf": "application/pdf", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg"}

def _clean(value: str) -> str:
    return " ".join(value.strip().split()).strip(" .:-")

def _date_iso(value: str) -> str | None:
    value = value.strip()
    m = re.fullmatch(r"(\d{1,2})[./-](\d{1,2})[./-](\d{4})", value)
    if not m:
        return None
    try:
        return date(int(m[3]), int(m[2]), int(m[1])).isoformat()
    except ValueError:
        return None

def extract_client_fields(text: str) -> dict:
    """Extract only explicitly labelled fields; never confuse Form XII issue date with incorporation."""
    result: dict[str, str] = {}
    name_patterns = [
        r"(?im)^\s*Name\s+of\s+the\s+Company\s*[:\-]\s*(.+)$",
        r"(?im)^\s*Company\s+(?:Legal\s+)?Name\s*[:\-]\s*(.+)$",
    ]
    for pattern in name_patterns:
        m = re.search(pattern, text)
        if m:
            raw = _clean(m[1])
            raw = re.split(r"\s*(?:Reg\.?\s*No\.?|Registration\s+No\.?|No\.\s*C[-–]\s*\d+|Incorporat(?:ed|ion))\s*[:\-]?", raw, maxsplit=1, flags=re.I)[0]
            if 3 <= len(raw) <= 200:
                result["legal_name"] = raw
                break
    registration = re.search(r"(?i)\b(?:Reg(?:istration)?\.?\s*(?:No\.?|Number)|Company\s+(?:Reg\.?\s*)?No\.?)\s*[:#-]?\s*(C\s*[-–]?\s*\d{3,10})\b", text)
    if not registration:
        registration = re.search(r"(?i)\b(C\s*[-–]\s*\d{3,10})\b", text)
    if registration:
        digits = re.sub(r"\D", "", registration[1])
        result["registration_no"] = "C-" + digits
    # Only explicit incorporation wording can produce incorporation_date.
    incorporated = re.search(r"(?i)\b(?:Date\s+of\s+Incorporation|Incorporated\s+on)\s*[:\-]?\s*(\d{1,2}[./-]\d{1,2}[./-]\d{4})", text)
    if incorporated:
        value = _date_iso(incorporated[1])
        if value:
            result["incorporation_date"] = value
    return result

@router.post("/extract-client")
async def extract_client_onboarding(file: UploadFile = File(...)):
    extension = Path(file.filename or "").suffix.lower()
    if extension not in TYPES:
        raise HTTPException(status_code=400, detail="Only PDF, JPG and PNG are supported")
    if file.content_type != TYPES[extension]:
        raise HTTPException(status_code=400, detail="File MIME type does not match extension")
    data = await file.read(MAX_BYTES + 1)
    if not data or len(data) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="File must be between 1 byte and 20 MB")
    result = {"fields": {}, "method": "none", "review_required": True,
              "message": "Could not extract reliable details. Enter missing fields manually."}
    if extension == ".pdf":
        try:
            text = extract_document_text(data, file.filename, 40000)
        except Exception:
            raise HTTPException(status_code=422, detail="Cannot read this PDF. Please use a readable PDF or screenshot.")
        if text.strip():
            fields = extract_client_fields(text)
            result.update(fields=fields, method="pdf_text", message="Review extracted PDF fields against the source before saving.")
        else:
            result["message"] = "This PDF appears to be scanned. Text extraction is unavailable; upload a screenshot or enter fields manually."
    elif extension in IMAGE_EXTENSIONS:
        if not is_configured():
            result["message"] = "Image extraction is unavailable (AI not configured). Enter source details manually."
            return result
        try:
            analysis = await analyze_image_document(
                filename=file.filename or "onboarding.png",
                mime_type=file.content_type or "image/png", data=data, checklist=[]
            )
            metadata = analysis.get("extracted_metadata") or {}
            fields = {}
            name = metadata.get("company_name")
            if isinstance(name, str) and 3 <= len(name.strip()) <= 200:
                fields["legal_name"] = _clean(name)
            reg = metadata.get("registration_number")
            if isinstance(reg, str):
                match = re.search(r"(?i)C\s*[-–]?\s*(\d{3,10})", reg)
                if match:
                    fields["registration_no"] = "C-" + match[1]
            # Do not fill incorporation date from generic document date.
            result.update(fields=fields, method="image_ai", message="AI suggested these values; verify every field against the image.")
        except (AIUnavailableError, AIResponseError):
            result["message"] = "Image AI could not read this file. Please enter details manually."
    return result
