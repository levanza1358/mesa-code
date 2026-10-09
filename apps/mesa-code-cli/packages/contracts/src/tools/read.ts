// ============================================================
// Read Tool - File Reading Tool
// ============================================================
// Reference: file read input / output shape

import { z } from "zod";
import { VIDEO_INPUT_MAX_BYTES } from "@mesa-code/shared";
import type { ToolCallId, TraceId } from "../interfaces/shared.js";
import { toToolJsonSchema } from "./json-schema.js";
import { getReadPdfPagesValidationFailure, READ_PDF_PAGES_DESCRIPTION } from "./read-pdf.js";

export * from "./read-pdf.js";
export * from "./read-state.js";

export const READ_MAX_FILE_SIZE_BYTES = 256 * 1024;
export const READ_MAX_OUTPUT_TOKENS = 25_000;
export const READ_DEFAULT_MAX_LINES = 2_000;
export const READ_IMAGE_MAX_BASE64_BYTES = 5 * 1024 * 1024;
export const READ_IMAGE_TARGET_BYTES = Math.floor((READ_IMAGE_MAX_BASE64_BYTES * 3) / 4);
export const READ_IMAGE_MAX_DIMENSION = 2000;
export const READ_IMAGE_MAX_INPUT_BYTES = 20 * 1024 * 1024;
export const READ_IMAGE_TOKEN_TO_BASE64_CHAR_RATIO = 0.125;
export const READ_VIDEO_MAX_INPUT_BYTES = VIDEO_INPUT_MAX_BYTES;

// -----------------------------------------------
// Input Schema
// -----------------------------------------------

const UNSUPPORTED_BINARY_EXTENSIONS = new Set([
  ".7z",
  ".a",
  ".bin",
  ".bz2",
  ".class",
  ".dll",
  ".dmg",
  ".dylib",
  ".exe",
  ".gz",
  ".jar",
  ".o",
  ".pyc",
  ".rar",
  ".so",
  ".tar",
  ".tgz",
  ".wasm",
  ".zip",
]);
const BLOCKING_DEVICE_PATHS = new Set([
  "/dev/console",
  "/dev/fd/0",
  "/dev/fd/1",
  "/dev/fd/2",
  "/dev/full",
  "/dev/random",
  "/dev/stderr",
  "/dev/stdin",
  "/dev/stdout",
  "/dev/tty",
  "/dev/urandom",
  "/dev/zero",
]);

const ReadProviderInputBaseSchema = z.object({
  /**
   * The absolute path to the file to read.
   */
  file_path: z.string().describe("The absolute path to the file to read"),
  /**
   * The line number to start reading from. Only provide if the file is too large to read at once
   */
  offset: z
    .number()
    .int()
    .nonnegative()
    .max(Number.MAX_SAFE_INTEGER)
    .optional()
    .describe(
      "The line number to start reading from. Only provide if the file is too large to read at once",
    ),
  /**
   * The number of lines to read. Only provide if the file is too large to read at once.
   */
  limit: z
    .number()
    .int()
    .positive()
    .max(Number.MAX_SAFE_INTEGER)
    .optional()
    .describe(
      "The number of lines to read. Only provide if the file is too large to read at once.",
    ),
});

const ReadProviderPdfInputSchema = ReadProviderInputBaseSchema.extend({
  pages: z.string().optional().describe(READ_PDF_PAGES_DESCRIPTION),
});

export const ReadInputSchema = ReadProviderPdfInputSchema.superRefine(validateReadInputSemantics);

export const ReadInputJsonSchema = toToolJsonSchema(ReadProviderInputBaseSchema);
export const ReadPdfInputJsonSchema = toToolJsonSchema(ReadProviderPdfInputSchema);

function validateReadInputSemantics(
  input: { file_path?: unknown; pages?: unknown },
  context: z.RefinementCtx,
): void {
  if (typeof input.file_path !== "string") return;
  const filePath = input.file_path;
  const lowerPath = filePath.toLowerCase();

  const pagesFailure =
    typeof input.pages === "string"
      ? getReadPdfPagesValidationFailure(filePath, input.pages)
      : undefined;
  if (pagesFailure) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["pages"],
      message: pagesFailure.message,
    });
    return;
  }

  validateReadPathSemantics(filePath, lowerPath, context);
}

function validateReadPathSemantics(
  filePath: string,
  lowerPath: string,
  context: z.RefinementCtx,
): void {
  if (BLOCKING_DEVICE_PATHS.has(lowerPath)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["file_path"],
      message: `Cannot read '${filePath}': this device file would block or produce infinite output.`,
    });
    return;
  }

  const extension = readFileExtension(lowerPath);
  if (!extension || !UNSUPPORTED_BINARY_EXTENSIONS.has(extension)) return;

  context.addIssue({
    code: z.ZodIssueCode.custom,
    path: ["file_path"],
    message: `This tool cannot read binary files. The file appears to be a binary ${extension} file. Read it as an image instead when it is an image, otherwise process it with a command through Bash.`, 
  });
}

export type ReadInput = z.infer<typeof ReadInputSchema>;

function readFileExtension(path: string): string | undefined {
  const lastSlash = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  const basename = path.slice(lastSlash + 1);
  const dotIndex = basename.lastIndexOf(".");
  if (dotIndex <= 0) return undefined;
  return basename.slice(dotIndex);
}

// -----------------------------------------------
// Output Types
// -----------------------------------------------

export interface ReadTextOutput {
  type: "text";
  filePath: string;
  content: string;
  numLines: number;
  startLine: number;
  totalLines: number;
  sizeBytes?: number;
  bytesRead?: number;
  truncated?: boolean;
  truncatedByTokenCap?: boolean;
  partialViewNotice?: string;
}

export interface ReadImageOutput {
  type: "image";
  base64: string;
  mimeType: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
  originalSize: number;
  transformedSize?: number;
  resized?: boolean;
  compressed?: boolean;
  compressionStrategy?: string;
  dimensions?: {
    originalWidth?: number;
    originalHeight?: number;
    displayWidth?: number;
    displayHeight?: number;
  };
}

/** Read 视频输出：不做转码/压缩，仅读取 base64 并做大小校验。 */
export interface ReadVideoOutput {
  type: "video";
  base64: string;
  mimeType:
    | "video/mp4"
    | "video/quicktime"
    | "video/webm"
    | "video/x-matroska"
    | "video/x-m4v"
    | "video/x-msvideo";
  originalSize: number;
}

export interface ReadNotebookOutput {
  type: "notebook";
  notebookPath: string;
  cells: NotebookCell[];
}

export interface NotebookCell {
  cellType: "code" | "markdown";
  source: string;
  outputs?: CellOutput[];
}

export interface CellOutput {
  type: "stream" | "execute_result" | "error" | "display_data";
  text: string;
  metadata?: Record<string, unknown>;
}

export interface ReadPdfOutput {
  type: "pdf";
  filePath: string;
  base64: string;
  originalSize: number;
  pages?: string;
}

export interface ReadPartsOutput {
  type: "parts";
  filePath: string;
  numParts: number;
  originalSize: number;
  pages: Array<ReadImageOutput & { pageNumber: number }>;
}

export interface ReadUnchangedOutput {
  type: "file_unchanged";
  filePath: string;
}

export interface ReadSpreadsheetOutput {
  type: "spreadsheet";
  filePath: string;
  sheets: Array<{
    sheetName: string;
    rowCount: number;
    columnCount: number;
    markdown: string;
  }>;
  markdown: string;
  originalSize: number;
  truncated: boolean;
}

export interface ReadWordDocumentOutput {
  type: "word";
  filePath: string;
  blocks: Array<{
    kind: "paragraph" | "heading" | "list-item" | "table";
    text: string;
    level?: number;
  }>;
  text: string;
  originalSize: number;
  truncated: boolean;
}

export interface ReadPresentationOutput {
  type: "presentation";
  filePath: string;
  slides: Array<{
    slideNumber: number;
    markdown: string;
    notes?: string;
  }>;
  markdown: string;
  originalSize: number;
  truncated: boolean;
}

export interface ReadDocumentOutput {
  type: "document";
  filePath: string;
  sourceFormat: string;
  blocks: Array<{
    kind: "paragraph" | "heading" | "list-item" | "table";
    text: string;
    level?: number;
  }>;
  text: string;
  originalSize: number;
  truncated: boolean;
}

export type ReadOutput =
  | ReadTextOutput
  | ReadImageOutput
  | ReadVideoOutput
  | ReadNotebookOutput
  | ReadPdfOutput
  | ReadPartsOutput
  | ReadSpreadsheetOutput
  | ReadWordDocumentOutput
  | ReadPresentationOutput
  | ReadDocumentOutput
  | ReadUnchangedOutput;

export const ReadTextOutputSchema = z
  .object({
    type: z.literal("text"),
    filePath: z.string(),
    content: z.string(),
    numLines: z.number().int().nonnegative(),
    startLine: z.number().int().nonnegative(),
    totalLines: z.number().int().nonnegative(),
    sizeBytes: z.number().int().nonnegative().optional(),
    bytesRead: z.number().int().nonnegative().optional(),
    truncated: z.boolean().optional(),
    truncatedByTokenCap: z.boolean().optional(),
    partialViewNotice: z.string().optional(),
  })
  .strict();

export const ReadImageDimensionsSchema = z
  .object({
    originalWidth: z.number().int().nonnegative().optional(),
    originalHeight: z.number().int().nonnegative().optional(),
    displayWidth: z.number().int().nonnegative().optional(),
    displayHeight: z.number().int().nonnegative().optional(),
  })
  .strict();

export const ReadImageOutputSchema = z
  .object({
    type: z.literal("image"),
    base64: z.string(),
    mimeType: z.enum(["image/jpeg", "image/png", "image/gif", "image/webp"]),
    originalSize: z.number().int().nonnegative(),
    transformedSize: z.number().int().nonnegative().optional(),
    resized: z.boolean().optional(),
    compressed: z.boolean().optional(),
    compressionStrategy: z.string().optional(),
    dimensions: ReadImageDimensionsSchema.optional(),
  })
  .strict();

export const ReadVideoOutputSchema = z
  .object({
    type: z.literal("video"),
    base64: z.string(),
    mimeType: z.enum([
      "video/mp4",
      "video/quicktime",
      "video/webm",
      "video/x-matroska",
      "video/x-m4v",
      "video/x-msvideo",
    ]),
    originalSize: z.number().int().nonnegative(),
  })
  .strict();

export const ReadCellOutputSchema = z
  .object({
    type: z.enum(["stream", "execute_result", "error", "display_data"]),
    text: z.string(),
    metadata: z.record(z.unknown()).optional(),
  })
  .strict();

export const ReadNotebookCellSchema = z
  .object({
    cellType: z.enum(["code", "markdown"]),
    source: z.string(),
    outputs: z.array(ReadCellOutputSchema).optional(),
  })
  .strict();

export const ReadNotebookOutputSchema = z
  .object({
    type: z.literal("notebook"),
    notebookPath: z.string(),
    cells: z.array(ReadNotebookCellSchema),
  })
  .strict();

export const ReadPdfOutputSchema = z
  .object({
    type: z.literal("pdf"),
    filePath: z.string(),
    base64: z.string(),
    originalSize: z.number().int().nonnegative(),
    pages: z.string().optional(),
  })
  .strict();

export const ReadPartsOutputSchema = z
  .object({
    type: z.literal("parts"),
    filePath: z.string(),
    numParts: z.number().int().nonnegative(),
    originalSize: z.number().int().nonnegative(),
    pages: z.array(ReadImageOutputSchema.extend({ pageNumber: z.number().int().positive() })),
  })
  .strict();

export const ReadUnchangedOutputSchema = z
  .object({
    type: z.literal("file_unchanged"),
    filePath: z.string(),
  })
  .strict();

export const ReadSpreadsheetSheetSchema = z
  .object({
    sheetName: z.string(),
    rowCount: z.number().int().nonnegative(),
    columnCount: z.number().int().nonnegative(),
    markdown: z.string(),
  })
  .strict();

export const ReadSpreadsheetOutputSchema = z
  .object({
    type: z.literal("spreadsheet"),
    filePath: z.string(),
    sheets: z.array(ReadSpreadsheetSheetSchema),
    markdown: z.string(),
    originalSize: z.number().int().nonnegative(),
    truncated: z.boolean(),
  })
  .strict();

export const ReadWordDocumentBlockSchema = z
  .object({
    kind: z.enum(["paragraph", "heading", "list-item", "table"]),
    text: z.string(),
    level: z.number().int().min(1).max(6).optional(),
  })
  .strict();

export const ReadWordDocumentOutputSchema = z
  .object({
    type: z.literal("word"),
    filePath: z.string(),
    blocks: z.array(ReadWordDocumentBlockSchema),
    text: z.string(),
    originalSize: z.number().int().nonnegative(),
    truncated: z.boolean(),
  })
  .strict();

export const ReadPresentationSlideSchema = z
  .object({
    slideNumber: z.number().int().positive(),
    markdown: z.string(),
    notes: z.string().optional(),
  })
  .strict();

export const ReadPresentationOutputSchema = z
  .object({
    type: z.literal("presentation"),
    filePath: z.string(),
    slides: z.array(ReadPresentationSlideSchema),
    markdown: z.string(),
    originalSize: z.number().int().nonnegative(),
    truncated: z.boolean(),
  })
  .strict();

export const ReadDocumentOutputSchema = z
  .object({
    type: z.literal("document"),
    filePath: z.string(),
    sourceFormat: z.string(),
    blocks: z.array(ReadWordDocumentBlockSchema),
    text: z.string(),
    originalSize: z.number().int().nonnegative(),
    truncated: z.boolean(),
  })
  .strict();

export const ReadOutputSchema = z.union([
  ReadTextOutputSchema,
  ReadImageOutputSchema,
  ReadVideoOutputSchema,
  ReadNotebookOutputSchema,
  ReadPdfOutputSchema,
  ReadPartsOutputSchema,
  ReadSpreadsheetOutputSchema,
  ReadWordDocumentOutputSchema,
  ReadPresentationOutputSchema,
  ReadDocumentOutputSchema,
  ReadUnchangedOutputSchema,
]);

export const ReadOutputJsonSchema = toToolJsonSchema(ReadOutputSchema);

// -----------------------------------------------
// Tool Call Structure
// -----------------------------------------------

export interface ReadToolCall {
  id: ToolCallId;
  name: "Read";
  input: ReadInput;
  traceId: TraceId;
  startedAt: Date;
}

export interface ReadToolResult {
  toolCallId: ToolCallId;
  output: ReadOutput;
  traceId: TraceId;
  durationMs: number;
}
