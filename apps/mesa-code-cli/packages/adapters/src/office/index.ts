// ============================================================
// OfficeDocumentAdapter
// ============================================================
// Pure-JS adapter implementing OfficeDocumentPort. It reads spreadsheets
// (SheetJS), Word documents (mammoth + cheerio), presentations (a bounded ZIP
// reader over the OOXML parts), and rich-text containers (a tokenising RTF
// reader plus best-effort legacy binary text recovery). No external processes
// are spawned and Microsoft Office is not required.
//
// The adapter targets model-grade Markdown/plain-text output. It does not
// attempt to preserve full visual fidelity (fonts, colours, positioning) — the
// model reads structure and content, not rendering.

import { readFile, stat } from "node:fs/promises";
import { basename } from "node:path";

import {
  OfficeDocumentPortError,
  READ_OFFICE_MAX_INPUT_BYTES,
  READ_OFFICE_MAX_OUTPUT_TOKENS,
  type OfficeDocumentPort,
  type OfficeDocumentReadDocumentRequest,
  type OfficeDocumentReadPresentationRequest,
  type OfficeDocumentReadSpreadsheetRequest,
  type OfficeDocumentReadWordDocumentRequest,
  type ReadDocumentResult,
  type ReadPresentationResult,
  type ReadSpreadsheetResult,
  type ReadWordDocumentResult,
} from "@mesa-code/contracts";

import { readDocxBuffer } from "./docx-reader.js";
import { readLegacyDocBuffer, readOdtBuffer, readRtfBuffer } from "./document-reader.js";
import { readLegacyPptBuffer, readPptxBuffer } from "./presentation-reader.js";
import { readSpreadsheetBuffer } from "./spreadsheet-reader.js";

export const SPREADSHEET_EXTENSIONS = new Set([
  ".xlsx",
  ".xlsm",
  ".xlsb",
  ".xls",
  ".ods",
  ".csv",
]);

export const WORD_EXTENSIONS = new Set([".docx", ".dotx", ".docm", ".dotm", ".doc"]);

export const PRESENTATION_EXTENSIONS = new Set([
  ".pptx",
  ".pptm",
  ".ppsx",
  ".ppsm",
  ".potx",
  ".potm",
  ".ppt",
]);

export const DOCUMENT_EXTENSIONS = new Set([".rtf", ".odt"]);

const OOXML_PRESENTATION_EXTENSIONS = new Set([".pptx", ".pptm", ".ppsx", ".ppsm", ".potx", ".potm"]);
const OOXML_WORD_EXTENSIONS = new Set([".docx", ".dotx", ".docm", ".dotm"]);

export interface OfficeDocumentAdapterOptions {
  /** Per-call input byte limit; defaults to READ_OFFICE_MAX_INPUT_BYTES. */
  maxInputBytes?: number;
  /** Rendering token budget; defaults to READ_OFFICE_MAX_OUTPUT_TOKENS. */
  maxOutputTokens?: number;
}

export function createOfficeDocumentAdapter(
  options: OfficeDocumentAdapterOptions = {},
): OfficeDocumentPort {
  return new OfficeDocumentAdapter(
    options.maxInputBytes ?? READ_OFFICE_MAX_INPUT_BYTES,
    options.maxOutputTokens ?? READ_OFFICE_MAX_OUTPUT_TOKENS,
  );
}

class OfficeDocumentAdapter implements OfficeDocumentPort {
  constructor(
    private readonly defaultMaxInputBytes: number,
    private readonly maxOutputTokens: number,
  ) {}

  async readSpreadsheet(
    request: OfficeDocumentReadSpreadsheetRequest,
    options?: { signal?: AbortSignal; maxInputBytes?: number },
  ): Promise<ReadSpreadsheetResult> {
    const buffer = await this.readBuffer(request, options);
    return readSpreadsheetBuffer(buffer, basename(request.filePath), this.maxOutputTokens);
  }

  async readWordDocument(
    request: OfficeDocumentReadWordDocumentRequest,
    options?: { signal?: AbortSignal; maxInputBytes?: number },
  ): Promise<ReadWordDocumentResult> {
    const buffer = await this.readBuffer(request, options);
    const extension = extensionOf(request.filePath);
    if (OOXML_WORD_EXTENSIONS.has(extension)) {
      return await readDocxBuffer(buffer, basename(request.filePath));
    }
    // Legacy `.doc` has no block-level structure available here; reuse the
    // generic reader and flatten its blocks into the Word result shape.
    const document = readLegacyDocBuffer(buffer);
    return {
      blocks: document.blocks,
      text: document.text,
      originalSize: document.originalSize,
      truncated: document.truncated,
    };
  }

  async readPresentation(
    request: OfficeDocumentReadPresentationRequest,
    options?: { signal?: AbortSignal; maxInputBytes?: number },
  ): Promise<ReadPresentationResult> {
    const buffer = await this.readBuffer(request, options);
    const extension = extensionOf(request.filePath);
    if (OOXML_PRESENTATION_EXTENSIONS.has(extension)) {
      return await readPptxBuffer(buffer, this.maxOutputTokens);
    }
    const legacy = readLegacyPptBuffer(buffer);
    if (!legacy) {
      throw new OfficeDocumentPortError(
        "unsupported_format",
        "This legacy .ppt file uses a binary format that yields no extractable text. Convert it to .pptx and read again.",
      );
    }
    return legacy;
  }

  async readDocument(
    request: OfficeDocumentReadDocumentRequest,
    options?: { signal?: AbortSignal; maxInputBytes?: number },
  ): Promise<ReadDocumentResult> {
    const buffer = await this.readBuffer(request, options);
    const extension = extensionOf(request.filePath);
    if (extension === ".rtf") return await readRtfBuffer(buffer);
    if (extension === ".odt") return await readOdtBuffer(buffer);
    if (extension === ".doc") return readLegacyDocBuffer(buffer);
    throw new OfficeDocumentPortError(
      "unsupported_format",
      `The extension '${extension || "(none)"}' is not supported by the generic document reader.`,
    );
  }

  private async readBuffer(
    request: { filePath: string },
    options?: { signal?: AbortSignal; maxInputBytes?: number },
  ): Promise<Buffer> {
    const maxInputBytes = options?.maxInputBytes ?? this.defaultMaxInputBytes;
    let size: number;
    try {
      size = (await stat(request.filePath)).size;
    } catch (error) {
      throw new OfficeDocumentPortError(
        "io_error",
        `Cannot stat '${request.filePath}': ${(error as Error).message}`,
        { cause: error as Error },
      );
    }
    if (size > maxInputBytes) {
      throw new OfficeDocumentPortError(
        "io_error",
        `The file '${request.filePath}' is ${size} bytes which exceeds the configured ` +
          `maximum of ${maxInputBytes} bytes for Office document reads.`,
      );
    }
    if (options?.signal?.aborted) {
      throw new OfficeDocumentPortError("cancelled", "Office document read was cancelled.");
    }
    try {
      return await readFile(request.filePath);
    } catch (error) {
      throw new OfficeDocumentPortError(
        "io_error",
        `Cannot read '${request.filePath}': ${(error as Error).message}`,
        { cause: error as Error },
      );
    }
  }
}

function extensionOf(filePath: string): string {
  const lower = filePath.toLowerCase();
  const slash = Math.max(lower.lastIndexOf("/"), lower.lastIndexOf("\\"));
  const base = lower.slice(slash + 1);
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(dot) : "";
}

export function isOfficeExtension(filePath: string): boolean {
  const extension = extensionOf(filePath);
  return (
    SPREADSHEET_EXTENSIONS.has(extension) ||
    WORD_EXTENSIONS.has(extension) ||
    PRESENTATION_EXTENSIONS.has(extension) ||
    DOCUMENT_EXTENSIONS.has(extension)
  );
}

export function isSpreadsheetExtension(filePath: string): boolean {
  return SPREADSHEET_EXTENSIONS.has(extensionOf(filePath));
}

export function isWordExtension(filePath: string): boolean {
  return WORD_EXTENSIONS.has(extensionOf(filePath));
}

export function isPresentationExtension(filePath: string): boolean {
  return PRESENTATION_EXTENSIONS.has(extensionOf(filePath));
}

export function isDocumentExtension(filePath: string): boolean {
  return DOCUMENT_EXTENSIONS.has(extensionOf(filePath));
}

export const HEADING_STYLE_TO_LEVEL = {
  Heading1: 1,
  Heading2: 2,
  Heading3: 3,
  Heading4: 4,
  Heading5: 5,
  Heading6: 6,
} as const;

export const __testing__ = {
  isOfficeExtension,
  isSpreadsheetExtension,
  isWordExtension,
  isPresentationExtension,
  isDocumentExtension,
};
