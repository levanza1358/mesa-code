// ============================================================
// Read Office Documents — shared handler plumbing
// ============================================================
// Spreadsheets, Word documents, presentations, and generic rich-text
// containers all surface through the same Read dispatch shape: resolve the
// port, map port errors to core errors, and render Markdown/plain text back to
// the model. The four public handlers in `read-spreadsheet.ts`,
// `read-docx.ts`, and `read-presentation.ts` are thin wrappers over this
// module so error mapping and tracing stay in exactly one place.

import { basename } from "node:path";

import {
  CoreErrorType,
  READ_OFFICE_MAX_INPUT_BYTES,
  createCoreError,
  isFileSystemPortError,
  type OfficeDocumentPort,
  type OfficeDocumentPortError,
  type TraceContext,
} from "@mesa-code/contracts";
import type { ToolExecutionContext } from "../types.js";

export type OfficeKind = "spreadsheet" | "word" | "presentation" | "document";

/** Read the file bytes through the office port, mapping errors consistently. */
export async function readOfficeBytes<T>(
  kind: OfficeKind,
  filePath: string,
  context: ToolExecutionContext,
  read: (
    port: OfficeDocumentPort,
    options: { signal?: AbortSignal; maxInputBytes: number },
  ) => Promise<T>,
): Promise<T> {
  const officeDocumentPort = context.officeDocumentPort;
  if (!officeDocumentPort) {
    throw createCoreError(
      CoreErrorType.ConfigurationError,
      `OfficeDocumentPort is not configured for ${kind} Read`,
      {
        context: {
          toolCallId: context.toolCallId,
          toolName: "Read",
        },
        recoverable: false,
      },
    );
  }

  try {
    return await read(officeDocumentPort, {
      signal: context.abortSignal,
      maxInputBytes: READ_OFFICE_MAX_INPUT_BYTES,
    });
  } catch (error) {
    throw mapOfficePortError(error, kind, filePath, context);
  }
}

export function createOfficeReadTrace(context: ToolExecutionContext): TraceContext {
  return {
    traceId: context.traceId,
    spanId: context.spanId,
    parentSpanId: context.parentSpanId,
    sessionId: context.sessionId,
    turnId: context.turnId,
  } as unknown as TraceContext;
}

/** Human label used in error messages, e.g. "the spreadsheet 'x.xlsx'". */
function describeKind(kind: OfficeKind): string {
  if (kind === "word") return "the Word document";
  if (kind === "presentation") return "the presentation";
  if (kind === "document") return "the document";
  return "the spreadsheet";
}

function mapOfficePortError(
  error: unknown,
  kind: OfficeKind,
  filePath: string,
  context: ToolExecutionContext,
): ReturnType<typeof createCoreError> {
  const codePrefix = `read_${kind}`;
  if (isPortError(error)) {
    const recovered = error as OfficeDocumentPortError;
    return createCoreError(
      CoreErrorType.ToolExecutionFailed,
      `Failed to read ${describeKind(kind)} '${basename(filePath)}': ${recovered.message}`,
      {
        cause: error as Error,
        context: {
          code: `${codePrefix}_${recovered.code}`,
          filePath,
          toolCallId: context.toolCallId,
          toolName: "Read",
        },
        recoverable: recovered.code === "io_error" || recovered.code === "cancelled",
      },
    );
  }

  if (isFileSystemPortError(error)) {
    return createCoreError(CoreErrorType.ToolExecutionFailed, error.message, {
      cause: error,
      context: {
        code: `${codePrefix}_${error.code}`,
        filePath,
        toolCallId: context.toolCallId,
        toolName: "Read",
      },
      recoverable: error.code === "not_found",
    });
  }

  return createCoreError(
    CoreErrorType.ToolExecutionFailed,
    `Failed to read ${describeKind(kind)} '${basename(filePath)}': ${
      error instanceof Error ? error.message : String(error)
    }`,
    {
      cause: error instanceof Error ? error : new Error(String(error)),
      context: {
        code: `${codePrefix}_unknown`,
        filePath,
        toolCallId: context.toolCallId,
        toolName: "Read",
      },
      recoverable: false,
    },
  );
}

function isPortError(error: unknown): error is OfficeDocumentPortError {
  return error instanceof Error && "code" in error && typeof error.code === "string";
}

export function formatReadOfficeOutput(header: string, body: string, truncated: boolean): string {
  const truncatedNotice = truncated
    ? "\n\n<system-reminder>Output was truncated to stay within the configured token budget.</system-reminder>"
    : "";
  return `${header}\n\n${body}${truncatedNotice}`;
}
