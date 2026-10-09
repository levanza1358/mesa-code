// ============================================================
// Read Document Handler
// ============================================================
//
// Format-agnostic handler for rich-text containers that are not Word
// documents: `.rtf`, `.odt`, and legacy binary `.doc`. The result carries the
// detected `sourceFormat` so the model and UI can explain how the text was
// derived.

import type { ReadDocumentOutput } from "@mesa-code/contracts";
import type { ToolExecutionContext } from "../types.js";
import {
  createOfficeReadTrace,
  formatReadOfficeOutput,
  readOfficeBytes,
} from "./read-office-shared.js";

// `.doc` is deliberately absent: it is claimed by the Word handler (which
// routes legacy binary `.doc` through the adapter's text recovery). Keeping it
// out of this set gives every extension exactly one owner so dispatch order is
// not load-bearing.
const DOCUMENT_EXTENSIONS = [".rtf", ".odt"] as const;

export function isDocumentPath(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  return DOCUMENT_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

export async function readDocumentFile(
  filePath: string,
  context: ToolExecutionContext,
): Promise<ReadDocumentOutput> {
  const trace = createOfficeReadTrace(context);
  const result = await readOfficeBytes("document", filePath, context, (port, options) =>
    port.readDocument({ filePath, trace }, options),
  );

  return {
    type: "document",
    filePath,
    sourceFormat: result.sourceFormat,
    blocks: result.blocks,
    text: result.text,
    originalSize: result.originalSize,
    truncated: result.truncated,
  };
}

export function formatReadDocumentOutput(output: ReadDocumentOutput): string {
  return formatReadOfficeOutput(
    `<system-reminder>Read ${output.sourceFormat} document: ${output.filePath}</system-reminder>`,
    output.text,
    output.truncated,
  );
}
