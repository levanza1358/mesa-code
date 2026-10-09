// ============================================================
// Read Word Document Handler
// ============================================================
//
// Reads `.docx`/`.doc` documents through the `OfficeDocumentPort`. The handler
// returns ordered blocks (paragraphs, headings, list items, tables) plus a
// flattened plain-text representation, similar to the PDF handler.

import type { ReadWordDocumentOutput } from "@mesa-code/contracts";
import type { ToolExecutionContext } from "../types.js";
import {
  createOfficeReadTrace,
  formatReadOfficeOutput,
  readOfficeBytes,
} from "./read-office-shared.js";

const WORD_EXTENSIONS = [".docx", ".doc", ".docm", ".dotx", ".dotm"] as const;

export function isWordPath(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  return WORD_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

export async function readWordDocumentFile(
  filePath: string,
  context: ToolExecutionContext,
): Promise<ReadWordDocumentOutput> {
  const trace = createOfficeReadTrace(context);
  const result = await readOfficeBytes("word", filePath, context, (port, options) =>
    port.readWordDocument({ filePath, trace }, options),
  );

  return {
    type: "word",
    filePath,
    blocks: result.blocks,
    text: result.text,
    originalSize: result.originalSize,
    truncated: result.truncated,
  };
}

export function formatReadWordDocumentOutput(output: ReadWordDocumentOutput): string {
  return formatReadOfficeOutput(
    `<system-reminder>Read Word document: ${output.filePath}</system-reminder>`,
    output.text,
    output.truncated,
  );
}
