// ============================================================
// Read Office Documents — extension dispatch
// ============================================================
// Maps an Office extension to its reader. Kept out of `read.ts` so the main
// Read handler stays focused on the generic text/PDF path and its line budget.
//
// Order is not load-bearing: each extension is claimed by exactly one predicate
// (pinned by `office-document-dispatch.test.ts`).

import type { ToolExecutionContext } from "../types.js";
import { isDocumentPath, readDocumentFile } from "./read-document.js";
import { isWordPath, readWordDocumentFile } from "./read-docx.js";
import { isPresentationPath, readPresentationFile } from "./read-presentation.js";
import { isSpreadsheetPath, readSpreadsheetFile } from "./read-spreadsheet.js";

/**
 * Read an Office document by extension. Returns `undefined` when the path is
 * not an Office document so the caller can fall through to PDF/text handling.
 */
export async function tryReadOfficeDocument(
  filePath: string,
  context: ToolExecutionContext,
): Promise<unknown | undefined> {
  if (isSpreadsheetPath(filePath)) return await readSpreadsheetFile(filePath, context);
  if (isWordPath(filePath)) return await readWordDocumentFile(filePath, context);
  if (isPresentationPath(filePath)) return await readPresentationFile(filePath, context);
  if (isDocumentPath(filePath)) return await readDocumentFile(filePath, context);
  return undefined;
}
