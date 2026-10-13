"""Regression checks for large director/member lists using synthetic PDFs only."""
from pathlib import Path

import pypdf
from reportlab.pdfgen import canvas

from app.services.pdf.forms_engine import generate_form_xii, generate_schedule_x


def _blank_pdf(path: Path, size: tuple[int, int], pages: int) -> None:
    doc = canvas.Canvas(str(path), pagesize=size)
    for _ in range(pages):
        doc.showPage()
    doc.save()


def test_form_xii_preserves_all_30_directors(tmp_path):
    template = tmp_path / "form_xii_fixture.pdf"
    result = tmp_path / "output_form_xii.pdf"
    _blank_pdf(template, (1008, 612), 1)
    snapshot = {
        "company_data": {"legal_name": "TEST COMPANY LTD"},
        "directors_data": [
            {"full_name": f"Director Name {i}", "designation": "Director"}
            for i in range(30)
        ],
    }
    page_count, _ = generate_form_xii(str(template), str(result), snapshot, {})
    pdf = pypdf.PdfReader(str(result))
    assert page_count == len(pdf.pages) == 4
    text = "\n".join(page.extract_text() or "" for page in pdf.pages)
    assert "Director Name 29" in text
    assert "Director Name 6" in text


def test_schedule_x_preserves_all_75_shareholders(tmp_path):
    template = tmp_path / "schedule_x_fixture.pdf"
    result = tmp_path / "output_schedule_x.pdf"
    _blank_pdf(template, (612, 792), 2)
    snapshot = {
        "company_data": {
            "legal_name": "TEST COMPANY LTD",
            "authorized_capital": 100000,
            "paid_up_capital": 7500,
        },
        "directors_data": [],
        "shareholders_data": [
            {
                "shareholder_name": f"Shareholder {i}",
                "share_count": 1,
                "total_value": 100,
                "ownership_percentage": 1,
            }
            for i in range(75)
        ],
    }
    page_count, _ = generate_schedule_x(str(template), str(result), snapshot, {})
    pdf = pypdf.PdfReader(str(result))
    assert page_count == len(pdf.pages) == 5
    text = "\n".join(page.extract_text() or "" for page in pdf.pages)
    assert "Shareholder 74" in text
    assert "Shareholder 0" in text
