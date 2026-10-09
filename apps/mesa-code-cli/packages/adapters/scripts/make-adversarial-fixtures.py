"""Generate adversarial Office fixtures to probe reader robustness.

Run: python scripts/make-adversarial-fixtures.py
Output goes to test/fixtures/adversarial/ (committed).
"""

import os
import struct
import zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "test", "fixtures", "adversarial")
os.makedirs(OUT, exist_ok=True)


def write(name, data):
    path = os.path.join(OUT, name)
    if isinstance(data, str):
        data = data.encode("utf-8")
    with open(path, "wb") as handle:
        handle.write(data)
    print("wrote", os.path.basename(path), len(data), "bytes")


# 1. Truncated / corrupt docx: a real zip but slide XML is garbage.
with zipfile.ZipFile(os.path.join(OUT, "corrupt.docx"), "w") as z:
    z.writestr("[Content_Types].xml", "<?xml?><Types/>")
    z.writestr("word/document.xml", b"\x00\x01\x02 not xml at all")

# 2. Not a zip at all, but claims .docx.
write("not-a-zip.docx", b"this is plainly not a zip archive\n" * 5)

# 3. Empty file.
write("empty.docx", b"")

# 4. A zip bomb: one entry that decompresses to a huge size.
def make_zip_bomb(path, name, uncompressed_mb=200):
    payload = b"\x00" * (uncompressed_mb * 1024 * 1024)
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("ppt/presentation.xml", "<p:presentation/>")
        z.writestr(name, payload)


make_zip_bomb(os.path.join(OUT, "zipbomb.pptx"), "ppt/slides/slide1.xml", 200)

# 5. Huge spreadsheet: many rows / columns.
import openpyxl

wb = openpyxl.Workbook()
ws = wb.active
ws.title = "Wide"
for col in range(1, 300):
    ws.cell(row=1, column=col, value=f"c{col}")
for row in range(2, 5000):
    for col in range(1, 40):
        ws.cell(row=row, column=col, value=row * col)
wb.save(os.path.join(OUT, "large.xlsx"))
print("wrote large.xlsx")

# 6. Merged cells + formula + unicode + very long cell.
wb2 = openpyxl.Workbook()
ws2 = wb2.active
ws2["A1"] = "Merged"
ws2.merge_cells("A1:C1")
ws2["A2"] = 1
ws2["B2"] = 2
ws2["C2"] = "=SUM(A2:B2)"
ws2["A3"] = "emoji \U0001f600 and 中文 and \u0416"
ws2["A4"] = "x" * 5000
wb2.save(os.path.join(OUT, "edge.xlsx"))
print("wrote edge.xlsx")

# 7. Encrypted xlsx (password-protected).
import msoffcrypto
from msoffcrypto.format.ooxml import OOXMLFile

plain_path = os.path.join(OUT, "edge.xlsx")
enc_path = os.path.join(OUT, "encrypted.xlsx")
with open(plain_path, "rb") as src:
    office = OOXMLFile(src)
    with open(enc_path, "wb") as dst:
        office.encrypt("secret", dst)
print("wrote encrypted.xlsx")

# 8. RTF with deeply nested groups and pathological escapes (no crash).
deep = r"{\rtf1\ansi " + ("{" * 500) + "deep" + ("}" * 500) + r"\par end}"
write("deep.rtf", deep.encode("latin1"))

# 9. RTF with malformed trailing escape (truncated control word).
write("malformed.rtf", b"{\\rtf1\\ansi Hello \\u8")

# 10. An OLE header faking a legacy .doc with no real text.
ole_header = bytes.fromhex("d0cf11e0a1b11ae1") + b"\x00" * 512
write("legacy-empty.doc", ole_header)

# 11. A pptx whose slide XML has no text at all.
with zipfile.ZipFile(os.path.join(OUT, "empty-slides.pptx"), "w") as z:
    z.writestr(
        "ppt/presentation.xml",
        '<?xml version="1.0"?><p:presentation xmlns:p="x" xmlns:r="y">'
        '<p:sldIdLst><p:sldId id="256" r:id="rId1"/></p:sldIdLst></p:presentation>',
    )
    z.writestr(
        "ppt/_rels/presentation.xml.rels",
        '<Relationships xmlns="z"><Relationship Id="rId1" '
        'Type="t" Target="slides/slide1.xml"/></Relationships>',
    )
    z.writestr("ppt/slides/slide1.xml", "<p:sld xmlns:p='x'><p:cSld/></p:sld>")

# 12. A docx with only a table, no paragraphs.
from docx import Document

d = Document()
t = d.add_table(rows=1, cols=1)
t.cell(0, 0).text = "only-cell"
d.save(os.path.join(OUT, "table-only.docx"))
print("wrote table-only.docx")

print("done")
