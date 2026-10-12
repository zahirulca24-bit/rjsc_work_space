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

MONTH_MAP = {
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
    "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
}

def _date_iso(value: str) -> str | None:
    value = value.strip()
    m_num = re.fullmatch(r"(\d{1,2})[./-](\d{1,2})[./-](\d{4})", value)
    if m_num:
        try:
            return date(int(m_num[3]), int(m_num[2]), int(m_num[1])).isoformat()
        except ValueError:
            return None
    # Support dd-mon-yy or dd-mon-yyyy e.g. 14-SEP-14 or 14-SEP-2014
    m_alpha = re.fullmatch(r"(\d{1,2})[-/ ]([A-Za-z]{3})[-/ ](\d{2,4})", value)
    if m_alpha:
        day = int(m_alpha[1])
        mon_str = m_alpha[2].lower()
        if mon_str not in MONTH_MAP:
            return None
        month = MONTH_MAP[mon_str]
        year_str = m_alpha[3]
        if len(year_str) == 2:
            yr = int(year_str)
            year = 2000 + yr if yr < 50 else 1900 + yr
        else:
            year = int(year_str)
        try:
            return date(year, month, day).isoformat()
        except ValueError:
            return None
    return None

def extract_client_fields(text: str) -> dict:
    """Extract reliably labeled fields from Certificate of Incorporation, Form XII, or Schedule X."""
    result: dict[str, any] = {}

    # 1. Company / Legal Name
    name_patterns = [
        r"(?im)^\s*Name\s+of\s+the\s+Company\s*[:\-]\s*(.+)$",
        r"(?im)^\s*Company\s+(?:Legal\s+)?Name\s*[:\-]\s*(.+)$",
    ]
    for pattern in name_patterns:
        m = re.search(pattern, text)
        if m:
            raw = _clean(m[1])
            raw = re.split(r"\s*(?:Reg\.?\s*No\.?|Registration\s+No\.?|No\.\s*C[-–]\s*\d+|Incorporat(?:ed|ion))\s*[:\-]?", raw, maxsplit=1, flags=re.I)[0]
            raw = raw.strip(" ,.;:-")
            if 3 <= len(raw) <= 200:
                result["legal_name"] = raw
                break

    # 2. Registration Number
    registration = re.search(r"(?i)\b(?:Reg(?:istration)?\.?\s*(?:No\.?|Number)|Company\s+(?:Reg\.?\s*)?No\.?)\s*[:#-]?\s*(C\s*[-–]?\s*\d{3,10})\b", text)
    if not registration:
        registration = re.search(r"(?i)\b(C\s*[-–]?\s*\d{3,10})\b", text)
    if registration:
        digits = re.sub(r"\D", "", registration[1])
        result["registration_no"] = "C-" + digits

    # 3. Incorporation Date (Only explicit incorporation phrasing; never issue date)
    incorporated = re.search(r"(?i)\b(?:Date\s+of\s+Incorporation|Incorporated\s+on)\s*[:\-]?\s*(\d{1,2}[./-][A-Za-z0-9]{2,4}[./-]\d{2,4})", text)
    if incorporated:
        value = _date_iso(incorporated[1])
        if value:
            result["incorporation_date"] = value

    # 4. Entity Type Detection (Private / Public / Society / etc.)
    entity_str = ""
    if re.search(r"(?i)\b(?:Private\s+Company|Private\s+Limited|\bPvt\.?\s*Ltd\.?)\b", text):
        entity_str = "PRIVATE_COMPANY"
    elif re.search(r"(?i)\b(?:Public\s+Company|Public\s+Limited)\b", text):
        entity_str = "PUBLIC_COMPANY"
    elif re.search(r"(?i)\b(?:Society|Societies\s+Registration)\b", text):
        entity_str = "SOCIETY"
    if entity_str:
        result["entity_type"] = entity_str

    # 5. Registered Office Address
    office_m = re.search(r"(?im)^\s*(?:Registered\s+Office(?:\s+Address)?|Situation\s+of\s+Registered\s+Office)\s*[:\-]\s*(.+)$", text)
    if office_m:
        addr = _clean(office_m[1])
        if 5 <= len(addr) <= 250:
            result["registered_office"] = addr

    # 6. Capital Information (Authorized / Paid up)
    auth_cap_m = re.search(r"(?i)(?:Authorized|Authorised)\s+Capital\s*[:\-]?\s*(?:Tk\.?|BDT|৳)?\s*([\d,]+(?:\.\d+)?)", text)
    if auth_cap_m:
        try:
            val = float(auth_cap_m[1].replace(",", ""))
            if val > 0:
                result["authorized_capital"] = val
        except ValueError:
            pass

    paid_cap_m = re.search(r"(?i)Paid\s*[-]?\s*up\s+Capital\s*[:\-]?\s*(?:Tk\.?|BDT|৳)?\s*([\d,]+(?:\.\d+)?)", text)
    if paid_cap_m:
        try:
            val = float(paid_cap_m[1].replace(",", ""))
            if val > 0:
                result["paid_up_capital"] = val
        except ValueError:
            pass

    # 7. Document Issue / Filing Date
    doc_date_m = re.search(r"(?i)\b(?:Issue\s+Date|Date\s+of\s+Issue|Dated\s+this|Date)\s*[:\-]?\s*(\d{1,2}[./-][A-Za-z0-9]{2,4}[./-]\d{2,4})", text)
    if doc_date_m:
        iso = _date_iso(doc_date_m[1])
        if iso:
            result["document_date"] = iso

    # 8. Document Reference / Issue No
    issue_no_m = re.search(r"(?i)\b(?:Issue\s+No\.?|Ref(?:erence)?\s*No\.?)\s*[:\-]?\s*([A-Za-z0-9\-_/]+)", text)
    if issue_no_m:
        result["source_reference"] = issue_no_m[1].strip()

    # 9. Directors list (from Form XII blocks if present)
    directors = []
    # Match patterns like: Director Name: ... Designation: ...
    for m_dir in re.finditer(r"(?im)^\s*(?:Name\s+of\s+Director|Director(?:\s+Name)?)\s*[:\-]\s*([^\n\r]+)", text):
        d_name = _clean(m_dir[1])
        if 2 <= len(d_name) <= 100:
            directors.append({"full_name": d_name, "designation": "Director"})
    if directors:
        result["directors"] = directors

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
