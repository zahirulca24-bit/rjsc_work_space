"""Generate synthetic PDF fixtures strictly for CI tests; never official RJSC forms."""
from pathlib import Path
import os
from reportlab.pdfgen import canvas

root = Path(os.environ["RJSC_TEMPLATE_DIR"])
root.mkdir(parents=True, exist_ok=True)
fixtures = {
    "FORM XII.pdf": (1008, 612, 1),
    "RJSC_Schedule X.pdf": (612, 792, 2),
    "FORM-117.pdf": (522, 756, 1),
    "___ RJSC ___ Form 23B.pdf": (612, 792, 1),
    "RJSC __ Form VI.pdf": (612, 792, 2),
    "___ RJSC ___ Form XVIII.pdf": (612, 792, 1),
    "___ RJSC ___ Form XIX.pdf": (612, 792, 2),
    "___ RJSC ___ Form XXVIII.pdf": (612, 792, 1),
}
for filename, (width, height, count) in fixtures.items():
    pdf = canvas.Canvas(str(root / filename), pagesize=(width, height))
    for idx in range(count):
        pdf.setFont("Helvetica", 8)
        pdf.drawString(30, height - 25, f"CI SYNTHETIC FIXTURE - NOT AN OFFICIAL RJSC FORM - {idx+1}")
        pdf.showPage()
    pdf.save()
print(f"Created {len(fixtures)} synthetic non-statutory CI template files at {root}")
