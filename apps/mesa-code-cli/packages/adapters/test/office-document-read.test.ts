// Regression tests for the Office document readers and the bug fixes that
// accompanied the "full Office support" change:
//
//  1. Spreadsheet cells are read with `raw: true` and formatted locally, so
//     dates keep a stable ISO representation instead of SheetJS `raw: false`
//     formatted text. Quoted CSV cells keep their real value (no stray quote
//     pair) and trailing empty rows are dropped.
//  2. Word documents preserve heading levels, list items, and tables instead of
//     collapsing to `extractRawText` + a regex that never matched real headings.
//  3. Presentations render slide text, nested bullets, tables, and speaker notes.
//  4. RTF is tokenised (not regex-stripped), so skipped destinations such as
//     the colour table and generator never leak into the text.
//
// Fixtures live in `test/fixtures` and are produced by
// `scripts/make-office-fixtures.py`.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { readDocxBuffer } from "../src/office/docx-reader.js";
import { readOdtBuffer, readRtfBuffer } from "../src/office/document-reader.js";
import { readPptxBuffer } from "../src/office/presentation-reader.js";
import { extractRtfText } from "../src/office/rtf-reader.js";
import { readSpreadsheetBuffer } from "../src/office/spreadsheet-reader.js";
import {
  isDocumentExtension,
  isOfficeExtension,
  isPresentationExtension,
  isSpreadsheetExtension,
  isWordExtension,
} from "../src/office/index.js";

const fixture = (name: string): Promise<Buffer> =>
  readFile(new URL(`./fixtures/${name}`, import.meta.url));

const TOKEN_BUDGET = 25_000;

test("spreadsheet: quoted CSV cell keeps its real value", async () => {
  const result = readSpreadsheetBuffer(await fixture("quoted.csv"), "quoted.csv", TOKEN_BUDGET);
  const sheet = result.sheets[0]!;
  // Regression: `raw: false` through sheet_to_json emitted `"x,y"` (with quote
  // characters) for a quoted cell. The real value is `x,y`.
  assert.match(sheet.markdown, /x,y/u);
  assert.doesNotMatch(sheet.markdown, /"x,y"/u);
  // Trailing blank row is dropped: header + 2 data rows.
  assert.equal(sheet.rowCount, 3);
});

test("spreadsheet: xlsx dates and numbers survive a stable round-trip", async () => {
  const result = readSpreadsheetBuffer(await fixture("sample.xlsx"), "sample.xlsx", TOKEN_BUDGET);
  const markdown = result.markdown;
  // ISO date (not the locale-formatted `1/15/24` produced by `raw: false`).
  assert.match(markdown, /2024-01-15/u);
  assert.match(markdown, /1200/u);
  assert.match(markdown, /99\.5/u);
  // Pipe inside a cell must be escaped so it does not split the Markdown table.
  assert.match(markdown, /Bob \\\| Carol/u);
});

test("spreadsheet: empty sheet renders an explicit placeholder", async () => {
  const result = readSpreadsheetBuffer(await fixture("sample.xlsx"), "sample.xlsx", TOKEN_BUDGET);
  const empty = result.sheets.find((sheet) => sheet.sheetName === "Empty");
  assert.ok(empty, "empty sheet is present");
  assert.equal(empty!.rowCount, 0);
  assert.match(empty!.markdown, /Empty sheet/u);
});

test("spreadsheet: a tiny token budget marks truncation", async () => {
  const result = readSpreadsheetBuffer(await fixture("sample.xlsx"), "sample.xlsx", 1);
  assert.equal(result.truncated, true);
  assert.equal(typeof result.truncatedAtSheet, "number");
});

test("word: preserves heading levels, list items, and tables", async () => {
  const result = await readDocxBuffer(await fixture("sample.docx"), "sample.docx");
  const kinds = result.blocks.map((block) => block.kind);
  assert.ok(kinds.includes("heading"), "has headings");
  assert.ok(kinds.includes("table"), "has a table");
  assert.ok(kinds.includes("list-item"), "has list items");

  const h1 = result.blocks.find((block) => block.kind === "heading" && block.level === 1);
  assert.equal(h1?.text, "Document Title");
  const h2 = result.blocks.find((block) => block.kind === "heading" && block.level === 2);
  assert.equal(h2?.text, "Section A");

  // Regression: the old extractRawText path emitted headings as `# Title`
  // which classifyParagraph's `^#{1,6}\s` never saw, so no heading was found.
  const listTexts = result.blocks.filter((block) => block.kind === "list-item").map((b) => b.text);
  assert.deepEqual(listTexts, ["Bullet one", "Bullet two", "Numbered one"]);

  const table = result.blocks.find((block) => block.kind === "table");
  assert.match(table!.text, /H1/u);
  assert.match(table!.text, /H2/u);
});

test("presentation: renders slide text, nested bullets, tables, and notes", async () => {
  const result = await readPptxBuffer(await fixture("sample.pptx"), TOKEN_BUDGET);
  assert.equal(result.slides.length, 3);

  const first = result.slides[0]!;
  assert.match(first.markdown, /Quarterly Report/u);
  assert.match(first.markdown, /Revenue up 20%/u);
  // Nested bullet (level 1) is indented.
  assert.match(first.markdown, /  - Costs down 5%/u);
  assert.equal(first.notes, "Mention the APAC region");

  const second = result.slides[1]!;
  assert.match(second.markdown, /Region/u);
  assert.match(second.markdown, /1200/u);

  const third = result.slides[2]!;
  assert.match(third.markdown, /no extractable text/u);
});

test("rtf: skips destinations and decodes escapes and unicode", async () => {
  const text = extractRtfText(await fixture("sample.rtf"));
  assert.match(text, /Hello world/u);
  assert.match(text, /Caf\u00e9/u);
  // cp1252 smart quotes around "quoted".
  assert.match(text, /\u201cquoted\u201d/u);
  // `\u8364` is the euro sign (a negative parameter is valid RTF too).
  assert.match(text, /\u20ac/u);
  assert.match(text, /\u03b1/u);
  // Regression: the colour table / generator destinations must not leak.
  assert.doesNotMatch(text, /red0/iu);
  assert.doesNotMatch(text, /Riched20/u);
  assert.doesNotMatch(text, /fonttbl/iu);
});

test("document: rtf and odt readers return the detected source format", async () => {
  const rtf = await readRtfBuffer(await fixture("sample.rtf"));
  assert.equal(rtf.sourceFormat, "rtf");

  const odt = await readOdtBuffer(await fixture("sample.odt"));
  assert.equal(odt.sourceFormat, "odt");
  assert.match(odt.text, /Title/u);
  assert.match(odt.text, /Plain paragraph\./u);
  assert.match(odt.text, /Item one/u);
  const table = odt.blocks.find((block) => block.kind === "table");
  assert.ok(table, "odt table extracted");
});

test("extension predicates classify every supported family", () => {
  assert.equal(isSpreadsheetExtension("a.xlsx"), true);
  assert.equal(isSpreadsheetExtension("a.csv"), true);
  assert.equal(isWordExtension("a.docx"), true);
  assert.equal(isWordExtension("A.DOCX"), true);
  assert.equal(isPresentationExtension("a.pptx"), true);
  assert.equal(isPresentationExtension("a.ppt"), true);
  assert.equal(isDocumentExtension("a.rtf"), true);
  assert.equal(isDocumentExtension("a.odt"), true);

  assert.equal(isOfficeExtension("report.pptx"), true);
  assert.equal(isOfficeExtension("notes.rtf"), true);
  assert.equal(isOfficeExtension("readme.md"), false);
  assert.equal(isOfficeExtension("script.js"), false);
});
