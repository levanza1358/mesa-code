// Robustness tests for the Office readers against adversarial input.
//
// The readers must never crash or hang on hostile files: every failure has to
// surface as an `OfficeDocumentPortError` with a meaningful code so the Read
// handler can produce an actionable message. Fixtures live in
// `test/fixtures/adversarial` and are produced by
// `scripts/make-adversarial-fixtures.py`.
//
// Cases covered:
//  - corrupt / non-ZIP / empty containers
//  - encrypted OOXML (an OLE envelope, not a ZIP) -> password_protected
//  - ZIP decompression bomb -> rejected before inflating
//  - very large single sheet -> bounded by the token budget
//  - wide/short cells and 5 000-char cells -> table stays small and valid
//  - pathological RTF nesting and truncated control words
//  - legacy OLE files with no recoverable text

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { OfficeDocumentPortError } from "@mesa-code/contracts";

import { readDocxBuffer } from "../src/office/docx-reader.js";
import { readLegacyDocBuffer, readOdtBuffer, readRtfBuffer } from "../src/office/document-reader.js";
import { readLegacyPptBuffer, readPptxBuffer } from "../src/office/presentation-reader.js";
import { readSpreadsheetBuffer } from "../src/office/spreadsheet-reader.js";

const fixture = (name: string): Promise<Buffer> =>
  readFile(new URL(`./fixtures/adversarial/${name}`, import.meta.url));

const TOKEN_BUDGET = 25_000;

/** Assert `fn` rejects with an OfficeDocumentPortError carrying `code`. */
async function assertPortError(fn: () => Promise<unknown>, code: string): Promise<void> {
  let caught: unknown;
  try {
    await fn();
  } catch (error) {
    caught = error;
  }
  assert.ok(
    caught instanceof OfficeDocumentPortError,
    `expected OfficeDocumentPortError, got ${String(caught)}`,
  );
  assert.equal((caught as OfficeDocumentPortError).code, code);
}

test("corrupt and non-container inputs fail with typed errors, never crash", async () => {
  const notAZip = await fixture("not-a-zip.docx");
  const corrupt = await fixture("corrupt.docx");

  await assertPortError(() => readDocxBuffer(Buffer.alloc(0), "empty.docx"), "corrupted");
  await assertPortError(() => readDocxBuffer(notAZip, "not-a-zip.docx"), "corrupted");
  await assertPortError(() => readDocxBuffer(corrupt, "corrupt.docx"), "corrupted");

  await assertPortError(() => readPptxBuffer(Buffer.alloc(0), TOKEN_BUDGET), "corrupted");
  await assertPortError(() => readPptxBuffer(notAZip, TOKEN_BUDGET), "corrupted");

  await assertPortError(() => readOdtBuffer(Buffer.alloc(0)), "corrupted");
});

test("encrypted OOXML reports password_protected, not corrupted", async () => {
  const encrypted = await fixture("encrypted.xlsx");
  // An encrypted OOXML file is an OLE compound document, so every OOXML reader
  // should recognise it before attempting to parse a ZIP.
  await assertPortError(() => readSpreadsheetBuffer(encrypted, "encrypted.xlsx", TOKEN_BUDGET), "password_protected");
  await assertPortError(() => readDocxBuffer(encrypted, "encrypted.docx"), "password_protected");
  await assertPortError(() => readPptxBuffer(encrypted, TOKEN_BUDGET), "password_protected");
  await assertPortError(() => readOdtBuffer(encrypted), "password_protected");
});

test("ZIP decompression bomb is rejected before inflating", async () => {
  const bomb = await fixture("zipbomb.pptx");
  // The oversized entry expands to ~200 MB; the reader must refuse it rather
  // than materialise the buffer.
  await assertPortError(() => readPptxBuffer(bomb, TOKEN_BUDGET), "unsupported_format");
});

test("a very large sheet is bounded by the token budget", async () => {
  const result = readSpreadsheetBuffer(await fixture("large.xlsx"), "large.xlsx", TOKEN_BUDGET);
  assert.equal(result.truncated, true);
  // Budget is 25 000 tokens ~ 100 000 chars; the render must stay well under it
  // plus the fixed header/notice overhead.
  assert.ok(
    result.markdown.length < 120_000,
    `markdown should stay bounded, got ${result.markdown.length} chars`,
  );
  assert.match(result.markdown, /data rows/u);
});

test("long cells are elided and the table stays small", async () => {
  const result = readSpreadsheetBuffer(await fixture("edge.xlsx"), "edge.xlsx", TOKEN_BUDGET);
  // Regression: a 5 000-char cell used to inflate the whole table to ~25 KB.
  assert.ok(result.markdown.length < 5_000, `edge.xlsx should stay small, got ${result.markdown.length}`);
  assert.match(result.markdown, /more chars\]/u);
  // Unicode beyond BMP from ordinary scripts still round-trips.
  assert.match(result.markdown, /中文/u);
  // Every body line of the table must carry the same column count for the
  // Markdown table to render.
  const tableLines = result.markdown.split("\n").filter((line) => line.includes("|"));
  const pipeCounts = new Set(tableLines.map((line) => (line.match(/\|/gu) ?? []).length));
  assert.equal(pipeCounts.size, 1, `table rows disagree on column count: ${[...pipeCounts]}`);
});

test("pathological RTF nesting and truncation do not crash", async () => {
  const deep = await readRtfBuffer(await fixture("deep.rtf"));
  assert.match(deep.text, /end/u);

  const malformed = await readRtfBuffer(await fixture("malformed.rtf"));
  assert.match(malformed.text, /Hello/u);
});

test("legacy OLE files with no text report unsupported_format", async () => {
  const legacyDoc = await fixture("legacy-empty.doc");
  await assertPortError(() => Promise.resolve(readLegacyDocBuffer(legacyDoc)), "unsupported_format");

  // A legacy .ppt with no recoverable text returns undefined so the adapter can
  // raise the actionable error itself.
  assert.equal(readLegacyPptBuffer(legacyDoc), undefined);
});

test("legacy .doc recovers real UTF-16 text and drops OLE metadata", async () => {
  const result = readLegacyDocBuffer(await fixture("legacy-text.doc"));
  assert.equal(result.sourceFormat, "doc");
  assert.match(result.text, /Hello from a legacy Word file\./u);
  assert.match(result.text, /Second paragraph here\./u);
  // The OLE directory entry name must not leak in as document content.
  assert.doesNotMatch(result.text, /^WordDocument$/mu);
});

test("extension-less and misnamed containers are handled without throwing raw errors", async () => {
  // A text file renamed to .docx must not escape as a non-port error.
  const notAZip = await fixture("not-a-zip.docx");
  await assertPortError(() => readDocxBuffer(notAZip, "fake.docx"), "corrupted");
  // A docx renamed to .xlsx still fails cleanly.
  const docxBytes = await readFile(new URL("./fixtures/sample.docx", import.meta.url));
  await assertPortError(() => readSpreadsheetBuffer(docxBytes, "mismatch.xlsx", TOKEN_BUDGET), "corrupted");
});
