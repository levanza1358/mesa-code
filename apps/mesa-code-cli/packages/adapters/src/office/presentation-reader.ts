// ============================================================
// OfficeDocumentAdapter — presentation reader
// ============================================================
// Reads `.pptx` (and `.pptm`/`.ppsx`/`.potx`, which share the container) by
// walking `ppt/presentation.xml` and each `ppt/slides/slideN.xml`. Text runs
// are gathered in document order; DrawingML tables are rendered as Markdown.
// Speaker notes are pulled from `ppt/notesSlides/notesSlideN.xml` when the
// slide relationship declares one.
//
// Legacy binary `.ppt` is an OLE compound document, not a ZIP container. This
// adapter extracts the printable UTF-16LE runs that PowerPoint stores in the
// `PowerPoint Document` stream. That recovers the visible text of typical decks
// without a full OLE parser; when nothing usable is found the caller is told
// the format is unsupported rather than being handed garbage.

import {
  OfficeDocumentPortError,
  type PresentationSlideContent,
  type ReadPresentationResult,
} from "@mesa-code/contracts";

import { collapseWhitespace, estimateTokens, hasOleCompoundHeader, renderMarkdownTable } from "./shared.js";
import { readZipEntries } from "./zip.js";

const SLIDE_ROW_LIMIT = 100;
const MAX_SLIDES = 500;

export async function readPptxBuffer(
  buffer: Buffer,
  maxOutputTokens: number,
): Promise<ReadPresentationResult> {
  if (buffer.byteLength === 0) {
    throw new OfficeDocumentPortError("corrupted", "The presentation file is empty.");
  }
  // Encrypted OOXML is an OLE envelope rather than a ZIP container.
  if (hasOleCompoundHeader(buffer)) {
    throw new OfficeDocumentPortError(
      "password_protected",
      "The presentation is encrypted or password-protected.",
    );
  }

  const entries = await readZipEntries(
    buffer,
    (name) =>
      name === "ppt/presentation.xml" ||
      name === "ppt/_rels/presentation.xml.rels" ||
      /^ppt\/slides\/slide\d+\.xml$/u.test(name) ||
      /^ppt\/notesSlides\/notesSlide\d+\.xml$/u.test(name),
  );

  const presentation = entries.get("ppt/presentation.xml");
  if (!presentation) {
    throw new OfficeDocumentPortError(
      "corrupted",
      "The presentation container has no ppt/presentation.xml part.",
    );
  }

  const orderedSlideNames = resolveSlideOrder(
    presentation.toString("utf8"),
    entries.get("ppt/_rels/presentation.xml.rels")?.toString("utf8"),
  );
  const slideNames =
    orderedSlideNames.length > 0
      ? orderedSlideNames
      : [...entries.keys()]
          .filter((name) => /^ppt\/slides\/slide\d+\.xml$/u.test(name))
          .sort(compareSlideNames)
          .slice(0, MAX_SLIDES);

  const slides: PresentationSlideContent[] = [];
  const parts: string[] = [];
  let truncated = false;
  let truncatedAtSlide: number | undefined;
  let tokenBudgetUsed = 0;

  for (let index = 0; index < slideNames.length; index += 1) {
    const slideName = slideNames[index]!;
    const xml = entries.get(slideName);
    if (!xml) continue;
    const slideNumber = index + 1;
    const markdown = renderSlide(xml.toString("utf8"), slideNumber);
    const text = slideText(markdown);
    const slide: PresentationSlideContent = { slideNumber, markdown, text };

    const notes = await readSlideNotes(entries, slideName);
    if (notes) slide.notes = notes;

    slides.push(slide);
    const part = `### Slide ${slideNumber}\n\n${markdown}${notes ? `\n\n**Notes:** ${notes}` : ""}`;
    parts.push(part);

    tokenBudgetUsed += estimateTokens(part);
    if (tokenBudgetUsed >= maxOutputTokens) {
      truncated = true;
      truncatedAtSlide = slideNumber;
      break;
    }
  }

  return {
    slides,
    markdown: parts.join("\n\n"),
    originalSize: buffer.byteLength,
    truncated,
    ...(truncatedAtSlide !== undefined ? { truncatedAtSlide } : {}),
  };
}

/**
 * Legacy `.ppt` text recovery. Returns `undefined` when no printable run is
 * found so the caller can report an unsupported format instead of empty text.
 */
export function readLegacyPptBuffer(buffer: Buffer): ReadPresentationResult | undefined {
  // Legacy `.ppt` is an OLE compound document. A ZIP or arbitrary binary that
  // happens to contain UTF-16-looking bytes would otherwise be misread as a
  // deck, so require the container header first.
  if (!hasOleCompoundHeader(buffer)) return undefined;

  const runs = extractUtf16Runs(buffer);
  if (runs.length === 0) return undefined;

  const slides: PresentationSlideContent[] = runs.map((text, index) => ({
    slideNumber: index + 1,
    markdown: text,
    text,
  }));
  const markdown = slides.map((slide) => `### Slide ${slide.slideNumber}\n\n${slide.markdown}`).join("\n\n");

  return {
    slides,
    markdown,
    originalSize: buffer.byteLength,
    truncated: false,
  };
}

// --- internals -------------------------------------------------------------

function resolveSlideOrder(presentationXml: string, relsXml: string | undefined): string[] {
  const relationshipIds = [...presentationXml.matchAll(/<p:sldId\b[^>]*\br:id="([^"]+)"/gu)].map(
    (match) => match[1]!,
  );
  if (relationshipIds.length === 0 || !relsXml) return [];

  const targetById = new Map<string, string>();
  for (const match of relsXml.matchAll(/<Relationship\b[^>]*>/gu)) {
    const tag = match[0]!;
    const id = /\bId="([^"]+)"/u.exec(tag)?.[1];
    const target = /\bTarget="([^"]+)"/u.exec(tag)?.[1];
    if (id && target) targetById.set(id, target);
  }

  const names: string[] = [];
  for (const relationshipId of relationshipIds) {
    const target = targetById.get(relationshipId);
    if (!target) continue;
    const normalized = target.replace(/^(\.\.\/)+/u, "").replace(/^\//u, "");
    const name = normalized.startsWith("ppt/") ? normalized : `ppt/${normalized}`;
    if (/^ppt\/slides\/slide\d+\.xml$/u.test(name)) names.push(name);
  }
  return names;
}

function compareSlideNames(a: string, b: string): number {
  const aNumber = Number(/slide(\d+)\.xml$/u.exec(a)?.[1] ?? "0");
  const bNumber = Number(/slide(\d+)\.xml$/u.exec(b)?.[1] ?? "0");
  return aNumber - bNumber;
}

function renderSlide(slideXml: string, slideNumber: number): string {
  const blocks: string[] = [];
  const tables = [...slideXml.matchAll(/<a:tbl>[\s\S]*?<\/a:tbl>/gu)].map((match) => match[0]!);
  const withoutTables = tables.reduce((xml, table) => xml.replace(table, ""), slideXml);

  const paragraphs = extractDrawingMlParagraphs(withoutTables);
  const lines: string[] = [];
  for (const paragraph of paragraphs) {
    const text = collapseWhitespace(paragraph.text);
    if (text.length === 0) continue;
    const bullet = paragraph.level > 0 ? `${"  ".repeat(paragraph.level)}- ` : "";
    lines.push(`${bullet}${text}`);
  }
  if (lines.length > 0) blocks.push(lines.join("\n"));

  for (const table of tables) {
    const rendered = renderDrawingMlTable(table);
    if (rendered) blocks.push(rendered);
  }

  if (blocks.length === 0) {
    return `_Slide ${slideNumber} has no extractable text._`;
  }
  return blocks.join("\n\n");
}

function extractDrawingMlParagraphs(xml: string): Array<{ level: number; text: string }> {
  const paragraphs: Array<{ level: number; text: string }> = [];
  for (const match of xml.matchAll(/<a:p>([\s\S]*?)<\/a:p>/gu)) {
    const body = match[1]!;
    const levelMatch = /<a:pPr\b[^>]*\blvl="(\d+)"/u.exec(body);
    const level = levelMatch ? Number(levelMatch[1]) : 0;
    const text = [...body.matchAll(/<a:t>([\s\S]*?)<\/a:t>/gu)]
      .map((textMatch) => decodeXmlEntities(textMatch[1]!))
      .join("");
    if (text.trim().length > 0) {
      paragraphs.push({ level: Number.isSafeInteger(level) ? level : 0, text });
    }
  }
  return paragraphs;
}

function renderDrawingMlTable(tableXml: string): string | undefined {
  const rows: string[][] = [];
  for (const rowMatch of tableXml.matchAll(/<a:tr\b[^>]*>([\s\S]*?)<\/a:tr>/gu)) {
    const cellValues: string[] = [];
    for (const cellMatch of rowMatch[1]!.matchAll(/<a:tc\b[^>]*>([\s\S]*?)<\/a:tc>/gu)) {
      const cellText = [...cellMatch[1]!.matchAll(/<a:t>([\s\S]*?)<\/a:t>/gu)]
        .map((textMatch) => decodeXmlEntities(textMatch[1]!))
        .join("");
      cellValues.push(collapseWhitespace(cellText));
    }
    if (cellValues.length > 0) rows.push(cellValues);
  }
  if (rows.length === 0) return undefined;
  return renderMarkdownTable(rows, SLIDE_ROW_LIMIT);
}

async function readSlideNotes(
  entries: Map<string, Buffer>,
  slideName: string,
): Promise<string | undefined> {
  // Notes relationships live in ppt/slides/_rels/<file>.rels, which we did not
  // request. Fall back to position: notesSlideN.xml aligns with slideN.xml in
  // decks produced by the major authoring tools.
  const slideNumber = /slide(\d+)\.xml$/u.exec(slideName)?.[1];
  if (!slideNumber) return undefined;
  const notesName = `ppt/notesSlides/notesSlide${slideNumber}.xml`;
  const notesBuffer = entries.get(notesName);
  if (!notesBuffer) return undefined;
  const text = extractDrawingMlParagraphs(notesBuffer.toString("utf8"))
    .map((paragraph) => collapseWhitespace(paragraph.text))
    .filter((line) => line.length > 0 && !/^\d+$/u.test(line))
    .join("\n");
  return text.length > 0 ? text : undefined;
}

function slideText(markdown: string): string {
  return markdown
    .split("\n")
    .map((line) => line.replace(/^\s*-\s*/u, "").replace(/^\||\|$/gu, "").split("|").join(" "))
    .filter((line) => line.trim().length > 0 && !line.trim().startsWith("_"))
    .join("\n");
}

function extractUtf16Runs(buffer: Buffer): string[] {
  const runs: string[] = [];
  let current: number[] = [];
  const flush = (): void => {
    if (current.length >= 4) {
      const text = Buffer.from(current).toString("utf16le").split("\u0000").join("");
      const normalized = collapseWhitespace(text);
      if (normalized.length >= 3 && /[\p{L}\p{N}]/u.test(normalized)) runs.push(normalized);
    }
    current = [];
  };
  for (let index = 0; index + 1 < buffer.length; index += 2) {
    const code = buffer.readUInt16LE(index);
    const printable =
      code === 0x09 || code === 0x0a || code === 0x0d || (code >= 0x20 && code <= 0xd7ff);
    if (printable) {
      current.push(code & 0xff, (code >> 8) & 0xff);
    } else {
      flush();
    }
  }
  flush();
  return runs;
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&lt;/gu, "<")
    .replace(/&gt;/gu, ">")
    .replace(/&quot;/gu, '"')
    .replace(/&apos;/gu, "'")
    .replace(/&#x([0-9a-fA-F]+);/gu, (_match, hex: string) => safeFromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/gu, (_match, decimal: string) => safeFromCodePoint(Number.parseInt(decimal, 10)))
    .replace(/&amp;/gu, "&");
}

function safeFromCodePoint(codePoint: number): string {
  if (!Number.isSafeInteger(codePoint) || codePoint < 0 || codePoint > 0x10ffff) return "";
  try {
    return String.fromCodePoint(codePoint);
  } catch {
    return "";
  }
}
