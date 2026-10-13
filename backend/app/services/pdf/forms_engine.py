"""
RJSC Forms Lab PDF Generation Engine.
Performs pixel-aligned, non-destructive coordinate overlays onto official RJSC vector templates.
Never modifies original source templates.
Supports multi-page continuation sheets for boards and member lists.
"""

import os
import io
import datetime
from typing import Dict, Any, List, Tuple
import pypdf
from reportlab.pdfgen import canvas
from reportlab.lib.colors import black, HexColor, white
from reportlab.lib.pagesizes import letter, legal, landscape

DEFAULT_TEMPLATE_DIR = os.getenv("RJSC_TEMPLATE_DIR", r"E:\RJSC\rjsc FROM")
DEFAULT_STORAGE_DIR = os.getenv("RJSC_STORAGE_DIR", r"E:\RJSC\rjsc_work_space\storage\generated_forms")

def _format_date(date_str: str | None) -> str:
    if not date_str:
        return "—"
    try:
        dt = datetime.datetime.fromisoformat(date_str.replace("Z", ""))
        return dt.strftime("%d/%m/%Y")
    except Exception:
        return str(date_str)

def _split_date_dmy(date_str: str | None) -> Tuple[str, str, str]:
    if not date_str:
        return ("", "", "")
    try:
        dt = datetime.datetime.fromisoformat(date_str.replace("Z", ""))
        day_suffix = "th"
        if dt.day in [1, 21, 31]: day_suffix = "st"
        elif dt.day in [2, 22]: day_suffix = "nd"
        elif dt.day in [3, 23]: day_suffix = "rd"
        return (f"{dt.day}{day_suffix}", dt.strftime("%B"), str(dt.year))
    except Exception:
        parts = date_str.split("-")
        if len(parts) == 3:
            return (parts[2], parts[1], parts[0])
        return (date_str, "", "")

def _num_to_words(n: int) -> str:
    """Converts positive integer up to crores into standard English words."""
    if n <= 0:
        return "Zero"
    units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
             "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
             "Seventeen", "Eighteen", "Nineteen"]
    tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]

    def _helper(val: int) -> str:
        if val >= 10000000:
            return f"{_helper(val // 10000000)} Crore {_helper(val % 10000000)}".strip()
        elif val >= 100000:
            return f"{_helper(val // 100000)} Lac {_helper(val % 100000)}".strip()
        elif val >= 1000:
            return f"{_helper(val // 1000)} Thousand {_helper(val % 1000)}".strip()
        elif val >= 100:
            return f"{_helper(val // 100)} Hundred {_helper(val % 100)}".strip()
        elif val >= 20:
            rem = val % 10
            return f"{tens[val // 10]}{(' ' + units[rem]) if rem else ''}"
        elif val > 0:
            return units[val]
        return ""

    return _helper(int(n)).strip()

def generate_form_xii(
    template_path: str,
    output_path: str,
    snapshot: Dict[str, Any],
    options: Dict[str, Any]
) -> Tuple[int, List[str]]:
    """
    Overlays Form XII (Landscape Legal: 1008 x 612 pt).
    Appends Continuation Sheet if directors > 6.
    """
    company = snapshot.get("company_data") or {}
    directors = snapshot.get("directors_data") or []
    overrides = options.get("overrides") or {}

    company_name = overrides.get("company_name") or company.get("legal_name") or "COMPANY NAME PENDING"
    filing_by = overrides.get("filing_by") or options.get("filing_by") or "Zahir & Associate (Chartered Accountants)"
    dated_str = overrides.get("dated_str") or options.get("dated_str") or datetime.date.today().isoformat()
    day_str, month_str, year_str = _split_date_dmy(dated_str)

    missing = []
    if not company.get("legal_name"):
        missing.append("Company legal name missing from master")
    if not directors:
        missing.append("No active directors found in master snapshot")

    # Read base template
    reader = pypdf.PdfReader(template_path)
    base_page = reader.pages[0]
    w = float(base_page.mediabox.width)
    h = float(base_page.mediabox.height)

    # 1. Overlay Page 1
    packet1 = io.BytesIO()
    can1 = canvas.Canvas(packet1, pagesize=(w, h))
    can1.setFillColor(black)

    # Header: Company Name & Filing Agent
    can1.setFont("Helvetica-Bold", 10)
    can1.drawString(245, 497, company_name[:65])
    can1.setFont("Helvetica", 9)
    can1.drawString(245, 473, filing_by[:65])

    # Directors Table on Page 1 (Up to 6 directors)
    y_row = 380
    row_height = 34
    page1_dirs = directors[:6]
    for d in page1_dirs:
        can1.setFont("Helvetica", 8)
        # Col 1: Name
        name = d.get("full_name") or d.get("name") or "—"
        desig = d.get("designation") or "Director"
        can1.drawString(90, y_row + 4, name[:28])
        can1.drawString(90, y_row - 6, f"({desig})"[:28])

        # Col 2: Former Name
        can1.drawString(270, y_row, (d.get("former_name") or "—")[:12])

        # Col 3: Nationality
        can1.drawString(345, y_row, (d.get("nationality") or "Bangladeshi")[:24])

        # Col 4: Residential Address (2 lines)
        addr = d.get("residential_address") or company.get("registered_office") or "—"
        if len(addr) > 26:
            can1.drawString(515, y_row + 4, addr[:26])
            can1.drawString(515, y_row - 6, addr[26:52])
        else:
            can1.drawString(515, y_row, addr)

        # Col 5: Occupation & Other Directorship
        occ = d.get("occupation") or "Business"
        can1.drawString(650, y_row, occ[:24])

        # Col 6: Appt Date
        appt = _format_date(d.get("appointment_date"))
        can1.drawString(780, y_row, appt[:14])

        # Col 7: Changes
        changes = d.get("changes") or "—"
        can1.drawString(880, y_row, changes[:18])

        y_row -= row_height

    # Date at bottom
    can1.setFont("Helvetica-Bold", 9)
    can1.drawString(165, 142, day_str)
    can1.drawString(380, 142, f"{month_str}, {year_str}")

    # Managing Director signature marker
    first_dir = directors[0].get("full_name") if directors else "Managing Director"
    can1.drawString(750, 142, f"{first_dir} (MD)")

    can1.save()
    packet1.seek(0)
    p1_overlay = pypdf.PdfReader(packet1).pages[0]
    base_page.merge_page(p1_overlay)

    writer = pypdf.PdfWriter()
    writer.add_page(base_page)

    # 2. If > 6 directors, generate Continuation Sheet
    if len(directors) > 6:
        packet_cont = io.BytesIO()
        can_cont = canvas.Canvas(packet_cont, pagesize=(w, h))
        can_cont.setFillColor(black)

        # Continuation Header
        can_cont.setFont("Helvetica-Bold", 11)
        can_cont.drawString(85, 550, f"FORM XII — CONTINUATION SHEET: {company_name}")
        can_cont.setFont("Helvetica", 8)
        can_cont.drawString(85, 535, "Particulars of Remaining Directors pursuant to Section 115 of the Companies Act, 1994")

        # Table Header Box
        can_cont.setStrokeColor(HexColor("#333333"))
        can_cont.setLineWidth(1)
        can_cont.rect(80, 495, 890, 25)
        can_cont.setFont("Helvetica-Bold", 8)
        can_cont.drawString(90, 505, "Present Name & Designation")
        can_cont.drawString(270, 505, "Former Name")
        can_cont.drawString(345, 505, "Nationality")
        can_cont.drawString(515, 505, "Residential Address")
        can_cont.drawString(650, 505, "Occupation")
        can_cont.drawString(780, 505, "Date of Appt")
        can_cont.drawString(880, 505, "Changes")

        y_c = 470
        for d in directors[6:]:
            can_cont.setFont("Helvetica", 8)
            name = d.get("full_name") or d.get("name") or "—"
            desig = d.get("designation") or "Director"
            can_cont.drawString(90, y_c + 3, name[:28])
            can_cont.drawString(90, y_c - 7, f"({desig})"[:28])
            can_cont.drawString(270, y_c, (d.get("former_name") or "—")[:12])
            can_cont.drawString(345, y_c, (d.get("nationality") or "Bangladeshi")[:24])
            addr = d.get("residential_address") or "—"
            if len(addr) > 26:
                can_cont.drawString(515, y_c + 3, addr[:26])
                can_cont.drawString(515, y_c - 7, addr[26:52])
            else:
                can_cont.drawString(515, y_c, addr)
            can_cont.drawString(650, y_c, (d.get("occupation") or "Business")[:24])
            can_cont.drawString(780, y_c, _format_date(d.get("appointment_date"))[:14])
            can_cont.drawString(880, y_c, (d.get("changes") or "—")[:18])
            y_c -= row_height
            if y_c < 100:
                break

        can_cont.setFont("Helvetica-Bold", 9)
        can_cont.drawString(750, 80, f"{first_dir} (MD) — Signed")
        can_cont.save()
        packet_cont.seek(0)
        writer.add_page(pypdf.PdfReader(packet_cont).pages[0])

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "wb") as f:
        writer.write(f)

    return len(writer.pages), missing

def generate_schedule_x(
    template_path: str,
    output_path: str,
    snapshot: Dict[str, Any],
    options: Dict[str, Any]
) -> Tuple[int, List[str]]:
    """
    Overlays Schedule X (Portrait: 612 x 792 pt, 2 pages).
    Appends Member Register continuation if shareholders > 6.
    """
    company = snapshot.get("company_data") or {}
    directors = snapshot.get("directors_data") or []
    shareholders = snapshot.get("shareholders_data") or []
    overrides = options.get("overrides") or {}

    company_name = overrides.get("company_name") or company.get("legal_name") or "COMPANY NAME PENDING"
    actual_agm = overrides.get("actual_agm_date") or options.get("actual_agm_date")
    agm_day, agm_month, agm_year = _split_date_dmy(actual_agm)

    missing = []
    if not actual_agm:
        missing.append("Actual AGM date is not evidenced or verified (Review Required under Sec 36)")
    if not company.get("authorized_capital"):
        missing.append("Authorized share capital missing")
    if not company.get("paid_up_capital"):
        missing.append("Paid-up share capital missing")

    auth_cap = float(overrides.get("authorized_capital") or company.get("authorized_capital") or 10000000)
    paid_cap = float(overrides.get("paid_up_capital") or company.get("paid_up_capital") or 5000000)
    nominal_val = float(overrides.get("nominal_value_per_share") or 100)
    total_shares = int(auth_cap / nominal_val) if nominal_val else 100000
    issued_shares = int(paid_cap / nominal_val) if nominal_val else 50000

    # Cross-validate member shares sum against issued shares
    sum_sh_shares = sum(s.get("share_count", 0) for s in shareholders)
    if shareholders and issued_shares > 0 and sum_sh_shares != issued_shares:
        missing.append(
            f"Shareholding mismatch: Sum of member shares ({sum_sh_shares:,}) does not equal issued shares derived from paid-up capital ({issued_shares:,}). Discrepancy flagged under Sec 36."
        )

    reader = pypdf.PdfReader(template_path)
    writer = pypdf.PdfWriter()

    # --- Page 1 Overlay ---
    page1 = reader.pages[0]
    w1, h1 = float(page1.mediabox.width), float(page1.mediabox.height)
    packet1 = io.BytesIO()
    can1 = canvas.Canvas(packet1, pagesize=(w1, h1))
    can1.setFillColor(black)

    # Company Name
    can1.setFont("Helvetica-Bold", 9)
    can1.drawString(220, 703, company_name[:48])

    # AGM Date (if evidenced)
    if actual_agm:
        can1.setFont("Helvetica", 8)
        can1.drawString(140, 689, agm_day)
        can1.drawString(235, 689, agm_month)
        can1.drawString(410, 674, agm_year)
    else:
        can1.setFont("Helvetica-Bold", 7)
        can1.setFillColor(HexColor("#880000"))
        can1.drawString(200, 689, "[REVIEW REQUIRED: AGM DATE UNEVIDENCED]")
        can1.setFillColor(black)

    # Capital Summary
    can1.setFont("Helvetica-Bold", 8)
    can1.drawString(145, 624, f"{auth_cap:,.0f}")
    can1.drawString(260, 624, f"{total_shares:,.0f}")
    can1.drawString(425, 624, f"{nominal_val:,.0f}")

    # Lines 1-7
    can1.setFont("Helvetica", 8)
    can1.drawString(340, 608, f"{issued_shares:,.0f}")      # Total shares taken
    can1.drawString(340, 583, f"{issued_shares:,.0f}")      # Issued wholly in cash
    can1.drawString(340, 568, "0 (Nil)")                    # Otherwise than cash
    can1.drawString(245, 553, f"{issued_shares:,.0f}")      # Called up shares
    can1.drawString(340, 553, f"{nominal_val:,.0f}")        # Called per share
    can1.drawString(340, 538, f"{paid_cap:,.0f}")          # Calls received
    can1.drawString(340, 523, "0 (Nil)")                    # Calls non-cash
    can1.drawString(340, 508, "0 (Nil)")                    # Calls unpaid

    can1.save()
    packet1.seek(0)
    page1.merge_page(pypdf.PdfReader(packet1).pages[0])
    writer.add_page(page1)

    # --- Page 2 Overlay ---
    page2 = reader.pages[1]
    w2, h2 = float(page2.mediabox.width), float(page2.mediabox.height)
    packet2 = io.BytesIO()
    can2 = canvas.Canvas(packet2, pagesize=(w2, h2))
    can2.setFillColor(black)

    # Section 20 Directors header & clean century mask
    can2.setFont("Helvetica-Bold", 8)
    can2.drawString(295, 657, company_name[:25])
    if actual_agm:
        can2.setFillColor(white)
        can2.rect(460, 653, 45, 12, fill=1, stroke=0)
        can2.setFillColor(black)
        can2.setFont("Helvetica", 8)
        can2.drawString(390, 657, agm_day)
        can2.drawString(428, 657, agm_month)
        can2.drawString(462, 657, agm_year)
    else:
        can2.setFont("Helvetica-Bold", 7)
        can2.setFillColor(HexColor("#880000"))
        can2.drawString(390, 657, "[REVIEW REQUIRED]")
        can2.setFillColor(black)

    # Section 20 Directors rows
    y_dir = 570
    can2.setFont("Helvetica", 8)
    for d in directors[:4]:
        name = d.get("full_name") or d.get("name") or "—"
        addr = d.get("residential_address") or company.get("registered_office") or "—"
        can2.drawString(40, y_dir, name[:28])
        can2.drawString(200, y_dir, addr[:45])
        y_dir -= 20

    # Section 21 Managing Director / Manager header & century mask
    can2.setFillColor(white)
    can2.rect(350, 476, 45, 12, fill=1, stroke=0)
    can2.setFillColor(black)
    if actual_agm:
        can2.setFont("Helvetica", 8)
        can2.drawString(265, 480, agm_day)
        can2.drawString(305, 480, agm_month)
        can2.drawString(352, 480, agm_year)

    # Section 22 / Verification at bottom & century mask
    can2.setFillColor(white)
    can2.rect(320, 285, 45, 12, fill=1, stroke=0)
    can2.setFillColor(black)
    if actual_agm:
        can2.setFont("Helvetica", 8)
        can2.drawString(235, 289, agm_day)
        can2.drawString(275, 289, agm_month)
        can2.drawString(322, 289, agm_year)

    # Signature block
    first_dir = directors[0].get("full_name") if directors else "Managing Director"
    can2.setFont("Helvetica-Bold", 8)
    can2.drawString(440, 75, f"{first_dir} (MD)")

    can2.save()
    packet2.seek(0)
    page2.merge_page(pypdf.PdfReader(packet2).pages[0])
    writer.add_page(page2)

    # --- Page 3 (Optional): Member Register Continuation Sheet ---
    if len(shareholders) > 0:
        packet_sh = io.BytesIO()
        can_sh = canvas.Canvas(packet_sh, pagesize=letter)
        can_sh.setFillColor(black)

        can_sh.setFont("Helvetica-Bold", 10)
        can_sh.drawString(50, 740, f"SCHEDULE X — LIST OF MEMBERS / SHAREHOLDERS: {company_name}")
        can_sh.setFont("Helvetica", 8)
        can_sh.drawString(50, 725, f"List of persons holding shares in the company as on AGM date ({actual_agm or 'Pending Verification'})")

        # Table header
        can_sh.setStrokeColor(HexColor("#333333"))
        can_sh.setLineWidth(1)
        can_sh.rect(50, 695, 510, 20)
        can_sh.setFont("Helvetica-Bold", 8)
        can_sh.drawString(55, 702, "Sl.")
        can_sh.drawString(80, 702, "Member / Shareholder Name")
        can_sh.drawString(280, 702, "Shares Held")
        can_sh.drawString(380, 702, "Nominal Value (BDT)")
        can_sh.drawString(490, 702, "% Holding")

        y_sh = 675
        for idx, s in enumerate(shareholders):
            can_sh.setFont("Helvetica", 8)
            can_sh.drawString(55, y_sh, str(idx + 1))
            can_sh.drawString(80, y_sh, (s.get("shareholder_name") or "—")[:35])
            can_sh.drawString(280, y_sh, f"{s.get('share_count', 0):,}")
            can_sh.drawString(380, y_sh, f"Tk. {s.get('total_value', 0):,}")
            can_sh.drawString(490, y_sh, f"{s.get('ownership_percentage', 0)}%")
            y_sh -= 18
            if y_sh < 60:
                break

        can_sh.save()
        packet_sh.seek(0)
        writer.add_page(pypdf.PdfReader(packet_sh).pages[0])

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "wb") as f:
        writer.write(f)

    return len(writer.pages), missing

def generate_form_117(
    template_path: str,
    output_path: str,
    snapshot: Dict[str, Any],
    options: Dict[str, Any]
) -> Tuple[int, List[str]]:
    """
    Overlays Form 117 (Portrait: 522 x 756 pt, 1 page).
    Instrument of Transfer of Shares pursuant to Section 38.
    Cleanly masks outdated year (2003) and browser print artifacts.
    """
    company = snapshot.get("company_data") or {}
    directors = snapshot.get("directors_data") or []
    shareholders = snapshot.get("shareholders_data") or []
    overrides = options.get("overrides") or {}

    company_name = overrides.get("company_name") or company.get("legal_name") or "COMPANY NAME PENDING"
    transfer_no = overrides.get("transfer_no") or options.get("transfer_no") or "1"

    # Transferor
    transferor_name = (
        overrides.get("transferor_name") or
        options.get("transferor_name") or
        (shareholders[0].get("shareholder_name") if shareholders else "TRANSFEROR NAME PENDING")
    )
    transferor_address = (
        overrides.get("transferor_address") or
        options.get("transferor_address") or
        company.get("registered_office") or "ADDRESS PENDING"
    )

    # Transferee
    transferee_name = (
        overrides.get("transferee_name") or
        options.get("transferee_name") or
        (shareholders[1].get("shareholder_name") if len(shareholders) > 1 else "TRANSFEREE NAME PENDING")
    )
    transferee_address = (
        overrides.get("transferee_address") or
        options.get("transferee_address") or
        company.get("registered_office") or "ADDRESS PENDING"
    )

    # Share and capital values
    nominal_val = float(overrides.get("nominal_value") or options.get("nominal_value") or company.get("nominal_value_per_share") or 100)
    paid_val = float(overrides.get("paid_up_per_share") or options.get("paid_up_per_share") or nominal_val)

    share_count = int(
        overrides.get("share_count") or
        options.get("share_count") or
        (shareholders[0].get("share_count") if shareholders else 100)
    )
    consideration_amt = float(
        overrides.get("consideration_amount") or
        options.get("consideration_amount") or
        (share_count * paid_val)
    )

    distinctive_from = int(overrides.get("distinctive_from") or options.get("distinctive_from") or 1)
    distinctive_to = int(overrides.get("distinctive_to") or options.get("distinctive_to") or share_count)

    dated_str = overrides.get("dated_str") or options.get("dated_str") or datetime.date.today().isoformat()
    day_str, month_str, year_str = _split_date_dmy(dated_str)

    board_approval_date = overrides.get("board_approval_date") or options.get("board_approval_date")

    missing = []
    if not company.get("legal_name") and not overrides.get("company_name"):
        missing.append("Company legal name missing")
    if not options.get("transferor_name") and not shareholders:
        missing.append("Transferor name not specified")
    if not options.get("transferee_name") and len(shareholders) < 2:
        missing.append("Transferee name not specified")
    if not board_approval_date:
        missing.append("Board resolution approval date for share transfer is unevidenced (Review Required)")

    reader = pypdf.PdfReader(template_path)
    page = reader.pages[0]
    w, h = float(page.mediabox.width), float(page.mediabox.height)

    packet = io.BytesIO()
    can = canvas.Canvas(packet, pagesize=(w, h))

    # 1. Mask browser header artifact (at y=720..756)
    can.setFillColor(white)
    can.rect(0, 720, w, 36, fill=1, stroke=0)
    can.setFillColor(black)

    # 2. Header: Company Name & Transfer No
    can.setFont("Helvetica-Bold", 10)
    can.drawString(145, 642, company_name[:52])
    can.setFont("Helvetica", 9)
    can.drawString(395, 625, str(transfer_no)[:15])

    # 3. Transferor block (I/We ... of ...)
    can.setFont("Helvetica-Bold", 9)
    can.drawString(75, 591, transferor_name[:32])
    can.setFont("Helvetica", 8)
    can.drawString(285, 591, transferor_address[:36])

    # 4. Consideration & Transferee
    can.setFont("Helvetica-Bold", 9)
    can.drawString(210, 574, f"{consideration_amt:,.0f}/=")
    can.drawString(415, 574, transferee_name[:20])

    # 5. Transferee Address
    can.setFont("Helvetica", 8)
    can.drawString(65, 557, transferee_address[:65])

    # 6. Share count & Nominal / Paid up amounts
    share_words = _num_to_words(share_count)
    can.setFont("Helvetica-Bold", 9)
    can.drawString(300, 522, f"{share_count:,} ({share_words})"[:30])
    can.setFont("Helvetica", 8)
    can.drawString(115, 507, f"{nominal_val:,.0f}")
    can.drawString(260, 507, f"{paid_val:,.0f}")

    # 7. Distinctive numbers & repeated company name
    can.setFont("Helvetica-Bold", 8)
    can.drawString(55, 492, str(distinctive_from)[:14])
    can.drawString(155, 492, str(distinctive_to)[:14])
    short_name = (
        company_name
        .replace(" LIMITED", "").replace(" Limited", "")
        .replace(" LTD.", "").replace(" LTD", "").replace(" Ltd", "")
    )
    can.drawString(255, 492, short_name[:26])

    # 8. Execution Date — Cleanly mask old '2003' text and overlay current date
    can.setFillColor(white)
    can.rect(430, 420, 40, 14, fill=1, stroke=0)
    can.setFillColor(black)

    can.setFont("Helvetica-Bold", 9)
    can.drawString(180, 425, day_str)
    can.drawString(370, 425, month_str)
    can.drawString(433, 425, year_str)

    # 9. Signatures
    can.setFont("Helvetica", 8)
    can.drawString(330, 390, f"({transferor_name})"[:28])
    can.drawString(330, 248, f"({transferee_name})"[:28])

    # 10. Board Approval Meeting Date
    if board_approval_date:
        can.setFont("Helvetica-Bold", 9)
        can.drawString(392, 155, _format_date(board_approval_date))
    else:
        can.setFont("Helvetica-Bold", 7)
        can.setFillColor(HexColor("#880000"))
        can.drawString(392, 155, "[REVIEW REQUIRED]")
        can.setFillColor(black)

    # 11. Managing Director signatory line
    first_dir = directors[0].get("full_name") if directors else "Managing Director"
    can.setFont("Helvetica-Bold", 8)
    can.drawString(275, 120, f"{first_dir} (Managing Director)"[:36])

    can.save()
    packet.seek(0)
    page.merge_page(pypdf.PdfReader(packet).pages[0])

    writer = pypdf.PdfWriter()
    writer.add_page(page)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "wb") as f:
        writer.write(f)

    return 1, missing

def generate_form_23b(
    template_path: str,
    output_path: str,
    snapshot: Dict[str, Any],
    options: Dict[str, Any]
) -> Tuple[int, List[str]]:
    """
    Overlays Form 23B (Portrait: 612 x 792 pt, 1 page).
    Notice by Auditor pursuant to Section 210(2).
    """
    company = snapshot.get("company_data") or {}
    overrides = options.get("overrides") or {}

    company_name = overrides.get("company_name") or company.get("legal_name") or "COMPANY NAME PENDING"
    reg_no = overrides.get("registration_no") or company.get("registration_no") or "—"
    auditor_name = overrides.get("auditor_name") or options.get("auditor_name") or "Zahir & Associate (Chartered Accountants)"
    dated_str = overrides.get("dated_str") or options.get("dated_str") or datetime.date.today().isoformat()
    day_str, month_str, year_str = _split_date_dmy(dated_str)

    missing = []
    if not company.get("legal_name"):
        missing.append("Company legal name missing")

    reader = pypdf.PdfReader(template_path)
    page = reader.pages[0]
    w, h = float(page.mediabox.width), float(page.mediabox.height)

    packet = io.BytesIO()
    can = canvas.Canvas(packet, pagesize=(w, h))
    can.setFillColor(black)

    # Company name & reg no
    can.setFont("Helvetica-Bold", 9)
    can.drawString(225, 712, company_name[:50])
    can.drawString(225, 692, str(reg_no)[:30])

    # Auditor name in body
    can.setFont("Helvetica", 9)
    can.drawString(90, 580, f"We, {auditor_name}, Chartered Accountants, hereby give notice")
    can.drawString(90, 560, f"to the Registrar of Joint Stock Companies that we have accepted appointment")
    can.drawString(90, 540, f"as auditors of {company_name} for the statutory audit period.")

    # Date line
    can.setFont("Helvetica-Bold", 8)
    can.drawString(90, 430, f"Dated this {day_str} day of {month_str}, {year_str}")
    can.drawString(400, 390, f"{auditor_name}\nChartered Accountants")

    can.save()
    packet.seek(0)
    page.merge_page(pypdf.PdfReader(packet).pages[0])

    writer = pypdf.PdfWriter()
    writer.add_page(page)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "wb") as f:
        writer.write(f)

    return 1, missing

def generate_form_vi(
    template_path: str,
    output_path: str,
    snapshot: Dict[str, Any],
    options: Dict[str, Any]
) -> Tuple[int, List[str]]:
    """
    Overlays Form VI (Portrait: 612 x 792 pt, 2 pages).
    Notice of situation of Registered Office or change therein (Section 77).
    """
    company = snapshot.get("company_data") or {}
    directors = snapshot.get("directors_data") or []
    overrides = options.get("overrides") or {}

    company_name = overrides.get("company_name") or company.get("legal_name") or "COMPANY NAME PENDING"
    reg_no = overrides.get("registration_no") or company.get("registration_no") or "—"
    reg_office = overrides.get("registered_office") or company.get("registered_office") or "ADDRESS PENDING"
    effective_date = overrides.get("effective_date") or options.get("effective_date") or datetime.date.today().isoformat()
    day_str, month_str, year_str = _split_date_dmy(effective_date)

    missing = []
    if not company.get("registered_office") and not overrides.get("registered_office"):
        missing.append("Registered office address missing")

    reader = pypdf.PdfReader(template_path)
    writer = pypdf.PdfWriter()

    # Page 1
    page1 = reader.pages[0]
    w1, h1 = float(page1.mediabox.width), float(page1.mediabox.height)
    packet1 = io.BytesIO()
    can1 = canvas.Canvas(packet1, pagesize=(w1, h1))
    can1.setFillColor(black)

    # Reg No and Company Name
    can1.setFont("Helvetica-Bold", 8)
    can1.drawString(200, 725, str(reg_no)[:25])
    can1.setFont("Helvetica-Bold", 9)
    can1.drawString(225, 638, company_name[:45])

    # Address block (multi-line)
    can1.setFont("Helvetica", 8)
    addr_lines = [reg_office[i:i+45] for i in range(0, min(len(reg_office), 135), 45)]
    y_addr = 540
    for l in addr_lines:
        can1.drawString(90, y_addr, l)
        y_addr -= 16

    can1.drawString(90, 460, f"Effective from: {day_str} day of {month_str}, {year_str}")

    can1.save()
    packet1.seek(0)
    page1.merge_page(pypdf.PdfReader(packet1).pages[0])
    writer.add_page(page1)

    # Page 2
    if len(reader.pages) > 1:
        page2 = reader.pages[1]
        w2, h2 = float(page2.mediabox.width), float(page2.mediabox.height)
        packet2 = io.BytesIO()
        can2 = canvas.Canvas(packet2, pagesize=(w2, h2))
        can2.setFillColor(black)

        first_dir = directors[0].get("full_name") if directors else "Managing Director"
        can2.setFont("Helvetica-Bold", 8)
        can2.drawString(380, 200, f"{first_dir}\nManaging Director")
        can2.save()
        packet2.seek(0)
        page2.merge_page(pypdf.PdfReader(packet2).pages[0])
        writer.add_page(page2)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "wb") as f:
        writer.write(f)

    return len(writer.pages), missing

def generate_form_pdf(
    form_code: str,
    work_id: str,
    snapshot: Dict[str, Any],
    options: Dict[str, Any] | None = None,
    template_dir: str = DEFAULT_TEMPLATE_DIR,
    storage_dir: str = DEFAULT_STORAGE_DIR
) -> Dict[str, Any]:
    """
    Master generation dispatcher.
    """
    options = options or {}
    form_code = form_code.upper().replace("-", "_")

    template_mapping = {
        "FORM_XII": ("FORM XII.pdf", generate_form_xii, "Form XII: Particulars of Directors"),
        "SCHEDULE_X": ("RJSC_Schedule X.pdf", generate_schedule_x, "Schedule X: Annual Summary of Share Capital"),
        "FORM_117": ("FORM-117.pdf", generate_form_117, "Form 117: Instrument of Transfer of Shares"),
        "FORM_23B": ("___ RJSC ___ Form 23B.pdf", generate_form_23b, "Form 23B: Notice by Auditor"),
        "FORM_VI": ("RJSC __ Form VI.pdf", generate_form_vi, "Form VI: Notice of Registered Office")
    }

    if form_code not in template_mapping:
        raise ValueError(
            f"Form {form_code} does not have an active template overlay implementation yet. "
            f"Format mapping pending for this template in Phase 05."
        )

    template_filename, gen_func, form_title = template_mapping[form_code]
    template_path = os.path.join(template_dir, template_filename)

    if not os.path.exists(template_path):
        raise FileNotFoundError(f"Original template not found at {template_path}")

    timestamp_str = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    version = options.get("version", 1)
    file_name = f"{form_code}_Work_{work_id[:8]}_v{version}_{timestamp_str}.pdf"
    work_storage_dir = os.path.join(storage_dir, str(work_id))
    output_path = os.path.join(work_storage_dir, file_name)

    page_count, missing = gen_func(template_path, output_path, snapshot, options)
    file_size = os.path.getsize(output_path)

    return {
        "form_code": form_code,
        "form_title": form_title,
        "file_path": output_path,
        "file_name": file_name,
        "file_size": file_size,
        "page_count": page_count,
        "missing_fields": missing,
        "timestamp": timestamp_str
    }
