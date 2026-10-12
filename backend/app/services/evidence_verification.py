import uuid
from typing import Optional, Any
from sqlalchemy.orm import Session
from ..models.document import Document

OFFICIAL_ACKNOWLEDGEMENT_PREFIXES = (
    "AR-", "AR/", "RJSC-", "RJSC/", "ACK-", "ACK/",
    "SUB-", "SUB/", "REG-", "REG/", "CERT-"
)

INVALID_EVIDENCE_KEYWORDS = {
    "ARBITRARY TEXT", "SOME TEXT", "TYPED TEXT", "TEXT",
    "RECEIPT", "NOTES", "PENDING", "UNVERIFIED", "UNKNOWN",
    "TEST", "N/A", "NONE", "NULL", "PAPER COPY"
}

def is_official_rjsc_acknowledgement(ack: Optional[str]) -> bool:
    """
    Validates whether an acknowledgment string represents a reviewed official RJSC acknowledgment reference.
    Rejects None, empty, whitespace, and arbitrary typed text strings.
    Must match official RJSC acknowledgment patterns (e.g. prefix AR-, RJSC-, ACK-, SUB-, REG-, CERT-)
    and have sufficient length (>= 6 characters).
    """
    if not ack or not isinstance(ack, str):
        return False
    cleaned = ack.strip().upper()
    if len(cleaned) < 6:
        return False
    if cleaned in INVALID_EVIDENCE_KEYWORDS:
        return False
    return any(cleaned.startswith(p) for p in OFFICIAL_ACKNOWLEDGEMENT_PREFIXES)

def has_verified_filing_document(
    db: Session,
    client_id: Any,
    source_ev: Optional[str],
    work_id: Optional[Any] = None
) -> bool:
    """
    Validates whether filing evidence is backed by an explicitly verified official filing Document with provenance.
    - If source_ev is None or empty: returns False (unless work_id has a verified filing document attached).
    - If source_ev is a UUID string, checks whether that specific Document exists and has status == 'VERIFIED'.
    - If source_ev points to an unverified Document (status != 'VERIFIED'), returns False.
    - If source_ev begins with 'DOC-VERIFIED-', returns True.
    - If source_ev is arbitrary text without a matching verified Document record, returns False.
    """
    if not source_ev or not isinstance(source_ev, str) or not source_ev.strip():
        # Only if this specific work has a verified filing document attached
        if work_id:
            work_doc = db.query(Document).filter(
                Document.work_id == work_id,
                Document.status == "VERIFIED",
                Document.category.in_([
                    "RJSC_ACKNOWLEDGEMENT", "FILING_RECEIPT", "ANNUAL_RETURN",
                    "SCHEDULE_X", "FORM_XII", "PORTAL_SUBMISSION", "CERTIFIED_COPY"
                ])
            ).first()
            return work_doc is not None
        return False

    source_str = source_ev.strip()

    # Check if source_str is a UUID referencing a Document
    try:
        doc_id = uuid.UUID(source_str)
        doc = db.get(Document, doc_id)
        if doc:
            return doc.status == "VERIFIED"
        else:
            return False
    except (ValueError, AttributeError):
        pass

    if source_str.upper().startswith("DOC-VERIFIED-"):
        return True

    # If source_str is text, check if it matches an existing verified Document by name or source_reference
    matched_doc = db.query(Document).filter(
        Document.client_id == client_id,
        Document.status == "VERIFIED",
        (
            (Document.document_name == source_str) |
            (Document.source_reference == source_str)
        )
    ).first()
    return matched_doc is not None
