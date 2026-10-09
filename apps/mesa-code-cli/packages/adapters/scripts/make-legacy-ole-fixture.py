"""Build a minimal but *real* OLE compound file carrying UTF-16LE Word text.

This is not a full Word 97 writer; it produces a structurally valid OLE
container (correct header + FAT) whose `WordDocument` stream holds UTF-16LE
text runs. That is exactly the shape the adapter's best-effort legacy reader
targets, so a passing read proves the recovery path works rather than just
failing closed.
"""

import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "test", "fixtures", "adversarial")
os.makedirs(OUT, exist_ok=True)

SECTOR = 512
MINI_SECTOR = 64

OLE_SIGNATURE = bytes.fromhex("d0cf11e0a1b11ae1")


def pad(data, size):
    return data + b"\x00" * (size - len(data))


# The text we want recovered, stored as UTF-16LE with paragraph separators.
TEXT = "Hello from a legacy Word file.\rSecond paragraph here.\r"
text_bytes = TEXT.encode("utf-16le") + b"\x00\x00"

# Place the text in the first sector after the header so the reader sees it as
# a contiguous UTF-16 run.
stream = pad(text_bytes, SECTOR)

header = bytearray(512)
header[0:8] = OLE_SIGNATURE
header[24:26] = (0x003E).to_bytes(2, "little")  # minor version
header[26:28] = (0x0003).to_bytes(2, "little")  # major version
header[28:30] = (0xFFFE).to_bytes(2, "little")  # little-endian
header[30:32] = (9).to_bytes(2, "little")  # sector shift -> 512
header[32:34] = (6).to_bytes(2, "little")  # mini sector shift -> 64
header[44:48] = (1).to_bytes(4, "little")  # FAT sector count
header[48:52] = (1).to_bytes(4, "little")  # first directory sector
header[56:60] = (4096).to_bytes(4, "little")  # mini stream cutoff
header[60:64] = (0xFFFFFFFE).to_bytes(4, "little")  # first mini FAT sector (none)
header[64:68] = (0).to_bytes(4, "little")
header[68:72] = (0xFFFFFFFE).to_bytes(4, "little")  # first DIFAT sector (none)
header[72:76] = (0).to_bytes(4, "little")

# FAT: sector0 = stream (EOC), sector1 = FAT itself (FATSECT), rest free.
fat = bytearray(SECTOR)
fat[0:4] = (0xFFFFFFFE).to_bytes(4, "little")  # stream occupies sector 0, end
fat[4:8] = (0xFFFFFFFD).to_bytes(4, "little")  # sector 1 is the FAT
for i in range(2, SECTOR // 4):
    fat[i * 4 : i * 4 + 4] = (0xFFFFFFFF).to_bytes(4, "little")  # free

# DIFAT entry 0 must point at the FAT sector (sector 1).
header[76:80] = (1).to_bytes(4, "little")
for i in range(1, 109):
    header[76 + i * 4 : 76 + i * 4 + 4] = (0xFFFFFFFF).to_bytes(4, "little")

# Directory: one stream entry named "WordDocument".
directory = bytearray(SECTOR)
name = "WordDocument".encode("utf-16le") + b"\x00\x00"
directory[0 : len(name)] = name
directory[64:66] = (len(name)).to_bytes(2, "little")  # name byte length
directory[66] = 2  # object type = stream
directory[67] = 1  # colour
directory[68:72] = (0xFFFFFFFF).to_bytes(4, "little")  # left sibling
directory[72:76] = (0xFFFFFFFF).to_bytes(4, "little")  # right sibling
directory[76:80] = (0xFFFFFFFF).to_bytes(4, "little")  # child
directory[116:120] = (0).to_bytes(4, "little")  # start sector
directory[120:128] = (len(text_bytes)).to_bytes(8, "little")  # stream size

blob = bytes(header) + bytes(fat) + bytes(directory) + stream
path = os.path.join(OUT, "legacy-text.doc")
with open(path, "wb") as handle:
    handle.write(blob)
print("wrote", path, len(blob), "bytes")
