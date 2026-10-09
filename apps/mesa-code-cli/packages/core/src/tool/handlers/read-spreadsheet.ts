// ============================================================
// Read Spreadsheet Handler
// ============================================================
//
// Reads spreadsheets (.xlsx, .xls, .xlsm, .xlsb, .ods, .csv) using the
// injected `OfficeDocumentPort`. The output uses a Markdown table per sheet;
// the agent gets a flat Markdown body and a per-sheet summary so it can cite
// cells without re-parsing. Error mapping and tracing live in
// `read-office-shared.ts`.

import type { ReadSpreadsheetOutput } from "@mesa-code/contracts";
import type { ToolExecutionContext } from "../types.js";
import {
  createOfficeReadTrace,
  formatReadOfficeOutput,
  readOfficeBytes,
} from "./read-office-shared.js";

const SPREADSHEET_EXTENSIONS = [".xlsx", ".xls", ".xlsm", ".xlsb", ".ods", ".csv"] as const;

export function isSpreadsheetPath(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  return SPREADSHEET_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

export async function readSpreadsheetFile(
  filePath: string,
  context: ToolExecutionContext,
): Promise<ReadSpreadsheetOutput> {
  const trace = createOfficeReadTrace(context);
  const result = await readOfficeBytes("spreadsheet", filePath, context, (port, options) =>
    port.readSpreadsheet({ filePath, trace }, options),
  );

  return {
    type: "spreadsheet",
    filePath,
    sheets: result.sheets,
    markdown: result.markdown,
    originalSize: result.originalSize,
    truncated: result.truncated,
  };
}

export function formatReadSpreadsheetOutput(output: ReadSpreadsheetOutput): string {
  return formatReadOfficeOutput(
    `<system-reminder>Read spreadsheet: ${output.filePath}</system-reminder>`,
    output.markdown,
    output.truncated,
  );
}
