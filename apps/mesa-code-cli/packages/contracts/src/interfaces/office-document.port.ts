// ============================================================
// OfficeDocumentPort
// ============================================================
// Pure-JS port for reading Office documents (spreadsheets, word processors,
// presentations, and rich-text containers) without spawning external
// processes or depending on a Microsoft Office installation. Mirrors the
// design of `pdf-document.port.ts`.

import type { TraceContext } from "../tracing/tracer.js";

/** Default input byte budget for an Office document read call. */
export const READ_OFFICE_MAX_INPUT_BYTES = 64 * 1024 * 1024;

/**
 * Token budget the adapters target when rendering a document to Markdown.
 * The Read tool itself enforces the model-facing token cap; this budget keeps
 * the adapter from building an unbounded string before that cap applies.
 */
export const READ_OFFICE_MAX_OUTPUT_TOKENS = 25_000;

/** Spreadsheet cell value after normalization. */
export type SpreadsheetCellValue = string | number | boolean | Date | null;

export interface SpreadsheetCell {
  value: SpreadsheetCellValue;
}

export interface SpreadsheetRow {
  cells: SpreadsheetCell[];
}

/**
 * Markdown rendering of a single sheet, ready to be passed back to the model
 * as part of a `ReadSpreadsheetOutput`. Empty trailing rows and columns are
 * stripped by the adapter.
 */
export interface SpreadsheetSheetMarkdown {
  sheetName: string;
  /** Number of rows after trailing-empty-row trimming. */
  rowCount: number;
  /** Number of columns after trailing-empty-column trimming. */
  columnCount: number;
  /** Markdown table including header separator. */
  markdown: string;
  /** True when this sheet alone hit the token budget. */
  truncated?: boolean;
}

export interface OfficeDocumentReadSpreadsheetRequest {
  filePath: string;
  trace: TraceContext;
}

export interface ReadSpreadsheetResult {
  sheets: SpreadsheetSheetMarkdown[];
  /** Concatenated Markdown of every sheet, separated by sheet banners. */
  markdown: string;
  /** Sum of the bytes the adapter read from disk. */
  originalSize: number;
  /** True when the renderer hit the configured truncation token budget. */
  truncated: boolean;
  /** When truncated, the sheet index that exceeded the budget. */
  truncatedAtSheet?: number;
}

export interface OfficeDocumentReadWordDocumentRequest {
  filePath: string;
  trace: TraceContext;
}

export interface WordDocumentBlock {
  kind: "paragraph" | "heading" | "list-item" | "table";
  text: string;
  /** Headings carry a level (1..6). Other blocks leave this undefined. */
  level?: number;
}

export interface ReadWordDocumentResult {
  blocks: WordDocumentBlock[];
  /** Concatenated plain-text rendering with double-newline separators. */
  text: string;
  originalSize: number;
  truncated: boolean;
}

/** A single slide extracted from a presentation. */
export interface PresentationSlideContent {
  /** 1-based slide position in the deck. */
  slideNumber: number;
  /** Speaker notes, when the deck carries them. */
  notes?: string;
  /** Markdown rendering of the slide text (title, body, and tables). */
  markdown: string;
  /** Plain-text rendering of the same slide, used for the flattened `text`. */
  text: string;
}

export interface OfficeDocumentReadPresentationRequest {
  filePath: string;
  trace: TraceContext;
}

export interface ReadPresentationResult {
  slides: PresentationSlideContent[];
  /** Concatenated Markdown of every slide, separated by slide banners. */
  markdown: string;
  originalSize: number;
  /** True when the renderer hit the configured truncation token budget. */
  truncated: boolean;
  /** When truncated, the 1-based slide number that exceeded the budget. */
  truncatedAtSlide?: number;
}

/**
 * A generic document read result for rich-text containers that are not Word
 * documents: RTF, plain `.doc`, and any other format the adapter can reduce to
 * ordered blocks without per-format structure.
 */
export interface ReadDocumentResult {
  blocks: WordDocumentBlock[];
  /** Concatenated plain-text rendering with double-newline separators. */
  text: string;
  originalSize: number;
  truncated: boolean;
  /**
   * The detected source format, surfaced so the model and UI can explain how
   * the content was derived (e.g. `"rtf"`, `"doc"`, `"odt"`, `"pptx"`).
   */
  sourceFormat: string;
}

export interface OfficeDocumentReadDocumentRequest {
  filePath: string;
  trace: TraceContext;
}

export type OfficeDocumentErrorCode =
  | "cancelled"
  | "corrupted"
  | "io_error"
  | "password_protected"
  | "permission_denied"
  | "process_failed"
  | "timeout"
  | "unsupported_format"
  | "unavailable";

export class OfficeDocumentPortError extends Error {
  constructor(
    readonly code: OfficeDocumentErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "OfficeDocumentPortError";
  }
}

export interface OfficeDocumentPort {
  readSpreadsheet(
    request: OfficeDocumentReadSpreadsheetRequest,
    options?: { signal?: AbortSignal; maxInputBytes?: number },
  ): Promise<ReadSpreadsheetResult>;
  readWordDocument(
    request: OfficeDocumentReadWordDocumentRequest,
    options?: { signal?: AbortSignal; maxInputBytes?: number },
  ): Promise<ReadWordDocumentResult>;
  readPresentation(
    request: OfficeDocumentReadPresentationRequest,
    options?: { signal?: AbortSignal; maxInputBytes?: number },
  ): Promise<ReadPresentationResult>;
  /**
   * Format-agnostic fallback used for rich-text containers that are not
   * covered by the structured readers (RTF, legacy binary `.doc`, ODT).
   * Adapters must throw `unsupported_format` when they cannot extract text.
   */
  readDocument(
    request: OfficeDocumentReadDocumentRequest,
    options?: { signal?: AbortSignal; maxInputBytes?: number },
  ): Promise<ReadDocumentResult>;
}