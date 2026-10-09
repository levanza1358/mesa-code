// ============================================================
// OfficeDocumentAdapter — generic document reader
// ============================================================
// Format-agnostic fallback for rich-text containers that are not Word
// documents: `.rtf`, legacy binary `.doc`, and OpenDocument text `.odt`.

import { load, type CheerioAPI } from "cheerio";
import type { Element } from "domhandler";

import {
  OfficeDocumentPortError,
  type ReadDocumentResult,
  type WordDocumentBlock,
} from "@mesa-code/contracts";

import { collapseWhitespace, hasOleCompoundHeader, renderMarkdownTable } from "./shared.js";
import { extractRtfText } from "./rtf-reader.js";
import { readZipEntries } from "./zip.js";

export async function readRtfBuffer(buffer: Buffer): Promise<ReadDocumentResult> {
  if (buffer.byteLength === 0) {
    throw new OfficeDocumentPortError("corrupted", "The RTF document is empty.");
  }
  const text = extractRtfText(buffer);
  if (text.length === 0) {
    throw new OfficeDocumentPortError("unsupported_format", "The RTF document contains no extractable text.");
  }
  const blocks = textIntoBlocks(text);
  return {
    blocks,
    text,
    originalSize: buffer.byteLength,
    truncated: false,
    sourceFormat: "rtf",
  };
}

export async function readOdtBuffer(buffer: Buffer): Promise<ReadDocumentResult> {
  if (buffer.byteLength === 0) {
    throw new OfficeDocumentPortError("corrupted", "The OpenDocument file is empty.");
  }
  // Encrypted ODF is an OLE envelope rather than a ZIP container.
  if (hasOleCompoundHeader(buffer)) {
    throw new OfficeDocumentPortError(
      "password_protected",
      "The OpenDocument file is encrypted or password-protected.",
    );
  }
  const entries = await readZipEntries(buffer, (name) => name === "content.xml");
  const content = entries.get("content.xml");
  if (!content) {
    throw new OfficeDocumentPortError(
      "corrupted",
      "The OpenDocument container has no content.xml part.",
    );
  }
  const blocks = odfContentToBlocks(content.toString("utf8"));
  const text = blocks
    .map((block) => block.text)
    .filter((value) => value.length > 0)
    .join("\n\n");
  return {
    blocks,
    text,
    originalSize: buffer.byteLength,
    truncated: false,
    sourceFormat: "odt",
  };
}

/**
 * Legacy binary `.doc` is an OLE compound document. There is no pure-JS Word
 * binary format parser in this dependency set, so text is recovered by taking
 * the printable UTF-16LE runs out of the `WordDocument` stream region. This is
 * best-effort: it cannot distinguish headers from body text and it drops
 * embedded objects. When nothing usable is found the caller is told the format
 * is unsupported instead of receiving empty content.
 */
export function readLegacyDocBuffer(buffer: Buffer): ReadDocumentResult {
  if (!hasOleCompoundHeader(buffer)) {
    throw new OfficeDocumentPortError(
      "corrupted",
      "The file is not a valid Word binary document (missing OLE compound-file header).",
    );
  }
  const text = extractLegacyWordText(buffer);
  if (text.length === 0) {
    throw new OfficeDocumentPortError(
      "unsupported_format",
      "This legacy .doc file uses a binary Word format that yields no extractable text. Convert it to .docx and read again.",
    );
  }
  const blocks = textIntoBlocks(text);
  return {
    blocks,
    text,
    originalSize: buffer.byteLength,
    truncated: false,
    sourceFormat: "doc",
  };
}

// --- internals -------------------------------------------------------------

function textIntoBlocks(text: string): WordDocumentBlock[] {
  const blocks: WordDocumentBlock[] = [];
  for (const raw of text.split(/\n{2,}/u)) {
    const paragraph = collapseWhitespace(raw.replace(/\n/gu, " "));
    if (paragraph) blocks.push({ kind: "paragraph", text: paragraph });
  }
  return blocks;
}

function odfContentToBlocks(contentXml: string): WordDocumentBlock[] {
  const $ = load(contentXml, { xmlMode: true });
  const blocks: WordDocumentBlock[] = [];
  const body = $("office\\:text, text").first();
  const root = body.length > 0 ? body : $.root();
  walkOdf($, root, blocks);
  return blocks;
}

function walkOdf($: CheerioAPI, node: ReturnType<CheerioAPI>, blocks: WordDocumentBlock[]): void {
  node.children().each((_index, child) => {
    if (!isElement(child)) return;
    const tag = localName(child.tagName);

    const headingMatch = /^h$/u.exec(tag);
    if (headingMatch) {
      const level = Number($(child).attr("text:outline-level") ?? "1") || 1;
      const text = collapseWhitespace($(child).text());
      if (text) blocks.push({ kind: "heading", level: Math.min(Math.max(level, 1), 6), text });
      return;
    }

    if (tag === "p") {
      const text = collapseWhitespace($(child).text());
      if (text) blocks.push({ kind: "paragraph", text });
      return;
    }

    if (tag === "list") {
      $(child)
        .find("text\\:list-item")
        .each((_itemIndex, item) => {
          if (!isElement(item)) return;
          const text = collapseWhitespace($(item).text());
          if (text) blocks.push({ kind: "list-item", text });
        });
      return;
    }

    if (tag === "table") {
      const rows: string[][] = [];
      $(child)
        .find("text\\:table-row")
        .each((_rowIndex, row) => {
          if (!isElement(row)) return;
          const cells = $(row)
            .find("text\\:table-cell")
            .map((_cellIndex, cell) => collapseWhitespace($(cell).text()))
            .get();
          if (cells.length > 0) rows.push(cells);
        });
      if (rows.length > 0) blocks.push({ kind: "table", text: renderMarkdownTable(rows, 200) });
      return;
    }

    walkOdf($, $(child), blocks);
  });
}

function localName(tagName: string): string {
  const colon = tagName.indexOf(":");
  return colon >= 0 ? tagName.slice(colon + 1).toLowerCase() : tagName.toLowerCase();
}

function isElement(node: unknown): node is Element {
  return (
    typeof node === "object" &&
    node !== null &&
    "tagName" in node &&
    typeof (node as { tagName?: unknown }).tagName === "string"
  );
}

/** OLE structural names that are stored as UTF-16 but are not document text. */
const OLE_STRUCTURAL_NAMES = new Set([
  "worddocument",
  "powerpoint document",
  "workbook",
  "book",
  "root entry",
  "compobj",
  "objinfo",
  "1table",
  "0table",
  "datastream",
  "summaryinformation",
  "documentsummaryinformation",
]);

function extractLegacyWordText(buffer: Buffer): string {
  // Legacy `.doc` is an OLE compound file. There is no pure-JS Word binary
  // parser here, so the fallback scans for UTF-16LE runs of printable text.
  // OLE directory names are themselves stored as UTF-16, so runs must look
  // like prose (contain a space or sentence punctuation) and must not be a
  // structural stream name to avoid leaking container metadata as content.
  const runs: string[] = [];
  let current: number[] = [];
  const flush = (): void => {
    if (current.length >= 8) {
      const value = Buffer.from(current).toString("utf16le").split("\u0000").join("");
      const normalized = value.replace(/\s+/gu, " ").trim();
      if (isProseRun(normalized)) runs.push(normalized);
    }
    current = [];
  };
  for (let index = 0; index + 1 < buffer.length; index += 2) {
    const code = buffer.readUInt16LE(index);
    const printable =
      code === 0x0d || code === 0x07 || code === 0x09 || code === 0x0a || (code >= 0x20 && code <= 0xd7ff);
    if (printable) {
      current.push(code & 0xff, (code >> 8) & 0xff);
    } else {
      flush();
    }
  }
  flush();
  return runs.join("\n\n");
}

function isProseRun(value: string): boolean {
  if (value.length < 4) return false;
  if (OLE_STRUCTURAL_NAMES.has(value.toLowerCase())) return false;
  // Require at least three letters and either a space or sentence punctuation,
  // which separates real prose from short identifier-like binary noise.
  if (!/[\p{L}]{3}/u.test(value)) return false;
  return /\s/u.test(value) || /[.,;:!?]/u.test(value);
}
