// ============================================================
// OfficeDocumentAdapter — Word (docx) reader
// ============================================================
// Uses `mammoth` to convert `.docx` to semantic HTML, then walks that HTML
// with `cheerio` to produce ordered blocks (headings, paragraphs, list items,
// tables) and a plain-text rendering. Cheerio is already a declared dependency
// of this package; using the HTML pivot keeps the reader honest about document
// order, unlike the previous `extractRawText` + heuristic splitter which lost
// heading levels, list nesting, and tables entirely.

import { load, type CheerioAPI } from "cheerio";
import type { Element } from "domhandler";
import mammoth from "mammoth";

import {
  OfficeDocumentPortError,
  type ReadWordDocumentResult,
  type WordDocumentBlock,
} from "@mesa-code/contracts";

import { collapseWhitespace, hasOleCompoundHeader, renderMarkdownTable } from "./shared.js";

const TABLE_ROW_LIMIT = 200;

/** Subset of mammoth's message shape; the module exports no public type for it. */
interface MammothMessage {
  type: "warning" | "error";
  message: string;
}

export async function readDocxBuffer(
  buffer: Buffer,
  fileName: string,
): Promise<ReadWordDocumentResult> {
  if (buffer.byteLength === 0) {
    throw new OfficeDocumentPortError("corrupted", `The Word document '${fileName}' is empty.`);
  }
  // Encrypted OOXML is wrapped in an OLE envelope, not a ZIP. mammoth reports
  // this as a generic parse failure, so detect it first for a useful message.
  if (hasOleCompoundHeader(buffer)) {
    throw new OfficeDocumentPortError(
      "password_protected",
      `The Word document '${fileName}' is encrypted or password-protected.`,
    );
  }

  let html: string;
  let messages: MammothMessage[];
  try {
    const result = await mammoth.convertToHtml({ buffer });
    html = result.value;
    messages = result.messages;
  } catch (error) {
    throw new OfficeDocumentPortError(
      "corrupted",
      `Could not parse the Word document '${fileName}': ${(error as Error).message}`,
      { cause: error as Error },
    );
  }

  if (messages.some((message) => /password/iu.test(message.message))) {
    throw new OfficeDocumentPortError(
      "password_protected",
      `The Word document '${fileName}' is password-protected.`,
    );
  }

  const blocks = htmlToBlocks(html);
  const text = blocks
    .map((block) => block.text)
    .filter((value) => value.length > 0)
    .join("\n\n");

  return {
    blocks,
    text,
    originalSize: buffer.byteLength,
    truncated: messages.some((message) => /truncat|limit/iu.test(message.message)),
  };
}

/** Convert mammoth's semantic HTML into the shared document block model. */
export function htmlToBlocks(html: string): WordDocumentBlock[] {
  const $ = load(html);
  const blocks: WordDocumentBlock[] = [];
  const body = $("body").length > 0 ? $("body") : $.root();
  walk($, body, blocks);
  return blocks;
}

function walk($: CheerioAPI, node: ReturnType<CheerioAPI>, blocks: WordDocumentBlock[]): void {
  node.children().each((_index, child) => {
    if (!isElement(child)) return;
    visitElement($, child, blocks);
  });
}

function visitElement($: CheerioAPI, element: Element, blocks: WordDocumentBlock[]): void {
  const tag = element.tagName.toLowerCase();

  const headingMatch = /^h([1-6])$/u.exec(tag);
  if (headingMatch) {
    const text = collapseWhitespace($(element).text());
    if (text) blocks.push({ kind: "heading", level: Number(headingMatch[1]), text });
    return;
  }

  if (tag === "p") {
    const text = collapseWhitespace($(element).text());
    if (text) blocks.push({ kind: "paragraph", text });
    return;
  }

  if (tag === "ul" || tag === "ol") {
    $(element)
      .children("li")
      .each((_index, item) => {
        if (!isElement(item)) return;
        const text = collapseWhitespace($(item).text());
        if (text) blocks.push({ kind: "list-item", text });
      });
    return;
  }

  if (tag === "table") {
    const rows: string[][] = [];
    $(element)
      .find("tr")
      .each((_rowIndex, row) => {
        if (!isElement(row)) return;
        const cells = $(row)
          .find("th,td")
          .map((_cellIndex, cell) => collapseWhitespace($(cell).text()))
          .get();
        if (cells.length > 0) rows.push(cells);
      });
    if (rows.length > 0) {
      blocks.push({ kind: "table", text: renderMarkdownTable(rows, TABLE_ROW_LIMIT) });
    }
    return;
  }

  // Unknown wrappers (div, section, body) are traversed transparently.
  walk($, $(element), blocks);
}

function isElement(node: unknown): node is Element {
  return (
    typeof node === "object" &&
    node !== null &&
    "tagName" in node &&
    typeof (node as { tagName?: unknown }).tagName === "string"
  );
}
