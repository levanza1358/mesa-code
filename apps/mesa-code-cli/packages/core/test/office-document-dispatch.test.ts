// Regression tests for Office document dispatch and attachment classification.
//
// Before the "full Office support" change, `.pptx`/`.rtf`/`.odt`/legacy `.doc`
// fell through to the text reader (producing mojibake or an error), and Office
// attachments were decoded as UTF-8 text because they were not recognised as
// binary containers. These tests pin the routing and classification rules.

import assert from "node:assert/strict";
import test from "node:test";

import {
  inferAttachmentMimeFromPath,
  isOfficeDocumentPath,
} from "../src/runtime/helpers/attachment-path-reference.js";
import { isDocumentPath } from "../src/tool/handlers/read-document.js";
import { isWordPath } from "../src/tool/handlers/read-docx.js";
import { isPresentationPath } from "../src/tool/handlers/read-presentation.js";
import { isSpreadsheetPath } from "../src/tool/handlers/read-spreadsheet.js";

test("read dispatch routes every supported extension to a single handler", () => {
  const cases: Array<[string, (path: string) => boolean]> = [
    ["book.xlsx", isSpreadsheetPath],
    ["book.xls", isSpreadsheetPath],
    ["book.xlsm", isSpreadsheetPath],
    ["book.xlsb", isSpreadsheetPath],
    ["book.ods", isSpreadsheetPath],
    ["book.csv", isSpreadsheetPath],
    ["doc.docx", isWordPath],
    ["doc.doc", isWordPath],
    ["doc.dotx", isWordPath],
    ["deck.pptx", isPresentationPath],
    ["deck.ppt", isPresentationPath],
    ["notes.rtf", isDocumentPath],
    ["notes.odt", isDocumentPath],
  ];
  for (const [path, predicate] of cases) {
    assert.equal(predicate(path), true, `${path} is routed`);
  }

  // Each family must be claimed by exactly one predicate so dispatch order is
  // not load-bearing.
  const predicates = [isSpreadsheetPath, isWordPath, isPresentationPath, isDocumentPath];
  for (const [path] of cases) {
    const owners = predicates.filter((predicate) => predicate(path));
    assert.equal(owners.length, 1, `${path} has exactly one owner, got ${owners.length}`);
  }

  // `.csv` is claimed only by the spreadsheet handler, never by the document
  // handler, even though it is also a text-like extension elsewhere.
  assert.equal(isDocumentPath("data.csv"), false);
  assert.equal(isSpreadsheetPath("data.csv"), true);
});

test("office attachments are classified as documents, not text", () => {
  for (const path of [
    "a.docx",
    "a.doc",
    "a.xlsx",
    "a.csv",
    "a.pptx",
    "a.rtf",
    "a.odt",
    "A.PPTX",
  ]) {
    assert.equal(isOfficeDocumentPath(path), true, `${path} is an office document`);
  }
  for (const path of ["a.md", "a.ts", "a.json", "a.png", "a.pdf", "a.zip"]) {
    assert.equal(isOfficeDocumentPath(path), false, `${path} is not an office document`);
  }
});

test("office attachments infer their real MIME type", () => {
  assert.equal(
    inferAttachmentMimeFromPath("report.docx"),
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  );
  assert.equal(
    inferAttachmentMimeFromPath("sheet.xlsx"),
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  assert.equal(
    inferAttachmentMimeFromPath("deck.pptx"),
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  );
  assert.equal(inferAttachmentMimeFromPath("notes.rtf"), "application/rtf");
  assert.equal(inferAttachmentMimeFromPath("legacy.doc"), "application/msword");
  assert.equal(inferAttachmentMimeFromPath("data.csv"), "text/csv");
});
