// ============================================================
// Read Presentation Handler
// ============================================================
//
// Reads `.pptx`/`.ppt` decks through the `OfficeDocumentPort`. Each slide is
// rendered as Markdown (title, body bullets with nesting, tables) and speaker
// notes are appended when present.

import type { ReadPresentationOutput } from "@mesa-code/contracts";
import type { ToolExecutionContext } from "../types.js";
import {
  createOfficeReadTrace,
  formatReadOfficeOutput,
  readOfficeBytes,
} from "./read-office-shared.js";

const PRESENTATION_EXTENSIONS = [
  ".pptx",
  ".ppt",
  ".pptm",
  ".ppsx",
  ".ppsm",
  ".potx",
  ".potm",
] as const;

export function isPresentationPath(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  return PRESENTATION_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

export async function readPresentationFile(
  filePath: string,
  context: ToolExecutionContext,
): Promise<ReadPresentationOutput> {
  const trace = createOfficeReadTrace(context);
  const result = await readOfficeBytes("presentation", filePath, context, (port, options) =>
    port.readPresentation({ filePath, trace }, options),
  );

  return {
    type: "presentation",
    filePath,
    slides: result.slides,
    markdown: result.markdown,
    originalSize: result.originalSize,
    truncated: result.truncated,
  };
}

export function formatReadPresentationOutput(output: ReadPresentationOutput): string {
  return formatReadOfficeOutput(
    `<system-reminder>Read presentation: ${output.filePath} (${output.slides.length} slides)</system-reminder>`,
    output.markdown,
    output.truncated,
  );
}
