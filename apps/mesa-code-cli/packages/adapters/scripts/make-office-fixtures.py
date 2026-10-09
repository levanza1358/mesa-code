"""Generate Office test fixtures for the adapters package.

Run from apps/mesa-code-cli/packages/adapters:
    python scripts/make-office-fixtures.py

The generated files are committed under test/fixtures so the Node test suite
does not depend on Python at run time.
"""

import os
import zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "test", "fixtures")
os.makedirs(OUT, exist_ok=True)


def write(name, data):
    path = os.path.join(OUT, name)
    if isinstance(data, str):
        data = data.encode("utf-8")
    with open(path, "wb") as handle:
        handle.write(data)
    print("wrote", path, len(data), "bytes")


# --- Spreadsheets via openpyxl -------------------------------------------------
import openpyxl

wb = openpyxl.Workbook()
ws = wb.active
ws.title = "Data"
ws.append(["Name", "Amount", "Date", "Note"])
ws.append(["Alice", 1200, "2024-01-15", "ok"])
ws.append(["Bob | Carol", 99.5, "2024-02-01", 'has "quote"'])
ws.append([None, None, None, None])  # trailing empty row
wb.create_sheet("Empty")
wb.save(os.path.join(OUT, "sample.xlsx"))

# --- CSV with quoted comma + trailing blank lines ------------------------------
write("quoted.csv", 'a,b\n"x,y",z\n1,2\n\n,,\n')

# --- DOCX via python-docx ------------------------------------------------------
from docx import Document

doc = Document()
doc.add_heading("Document Title", level=1)
doc.add_heading("Section A", level=2)
doc.add_paragraph("First paragraph text.")
doc.add_paragraph("Bullet one", style="List Bullet")
doc.add_paragraph("Bullet two", style="List Bullet")
doc.add_paragraph("Numbered one", style="List Number")
t = doc.add_table(rows=2, cols=2)
t.cell(0, 0).text = "H1"
t.cell(0, 1).text = "H2"
t.cell(1, 0).text = "a"
t.cell(1, 1).text = "b"
doc.save(os.path.join(OUT, "sample.docx"))

# --- PPTX via python-pptx ------------------------------------------------------
from pptx import Presentation
from pptx.util import Inches

prs = Presentation()
slide = prs.slides.add_slide(prs.slide_layouts[1])
slide.shapes.title.text = "Quarterly Report"
tf = slide.placeholders[1].text_frame
tf.text = "Revenue up 20%"
p = tf.add_paragraph()
p.text = "Costs down 5%"
p.level = 1
slide.notes_slide.notes_text_frame.text = "Mention the APAC region"

slide2 = prs.slides.add_slide(prs.slide_layouts[5])
slide2.shapes.title.text = "Numbers"
table = slide2.shapes.add_table(2, 2, Inches(1), Inches(2), Inches(6), Inches(1)).table
table.cell(0, 0).text = "Region"
table.cell(0, 1).text = "Sales"
table.cell(1, 0).text = "APAC"
table.cell(1, 1).text = "1200"

prs.slides.add_slide(prs.slide_layouts[6])
prs.save(os.path.join(OUT, "sample.pptx"))

# --- ODT (minimal but valid content.xml) --------------------------------------
CONTENT_XML = """<?xml version="1.0" encoding="UTF-8"?>
<office:document-content
    xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
    xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
    xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
    office:version="1.2">
  <office:body>
    <office:text>
      <text:h text:outline-level="1">Title</text:h>
      <text:p>Plain paragraph.</text:p>
      <text:list>
        <text:list-item><text:p>Item one</text:p></text:list-item>
        <text:list-item><text:p>Item two</text:p></text:list-item>
      </text:list>
      <text:table>
        <text:table-row>
          <text:table-cell><text:p>A</text:p></text:table-cell>
          <text:table-cell><text:p>B</text:p></text:table-cell>
        </text:table-row>
        <text:table-row>
          <text:table-cell><text:p>1</text:p></text:table-cell>
          <text:table-cell><text:p>2</text:p></text:table-cell>
        </text:table-row>
      </text:table>
    </text:text>
  </office:body>
</office:document-content>
"""

odt_path = os.path.join(OUT, "sample.odt")
with zipfile.ZipFile(odt_path, "w", zipfile.ZIP_DEFLATED) as z:
    z.writestr("mimetype", "application/vnd.oasis.opendocument.text")
    z.writestr("content.xml", CONTENT_XML)
print("wrote", odt_path)

# --- RTF with formatting, cp1252 escapes, unicode escapes, skipped groups ------
rtf = (
    r"{\rtf1\ansi\deff0"
    r"{\fonttbl{\f0 Arial;}}"
    r"{\*\generator Riched20 10.0;}"
    r"{\colortbl;\red0\green0\blue0;}"
    r"\fs20 Hello \b world\b0\par "
    r"Caf\'e9 \'93quoted\'94 line\par "
    r"Unicode: \u8364? and \u945? end\par"
    r"}"
)
write("sample.rtf", rtf.encode("latin1"))

print("done")
