// ============================================================
// OfficeDocumentAdapter — spreadsheet reader
// ============================================================
// Uses SheetJS (`xlsx`) to read `.xlsx`, `.xls`, `.xlsm`, `.xlsb`, `.ods`, and
// `.csv`. Each sheet is rendered as a GitHub-flavoured Markdown table with a
// header row; trailing empty rows and columns are dropped. Values are read
// with `raw: true` and formatted ourselves so dates keep their cell format
// (SheetJS `raw: false` already emits formatted text, which broke round-trips)
// while numbers stay numeric.

import * as XLSX from "xlsx";

import {
  OfficeDocumentPortError,
  type ReadSpreadsheetResult,
  type SpreadsheetSheetMarkdown,
} from "@mesa-code/contracts";

import {
  escapeMarkdownTableCell,
  estimateTokens,
  hasOleCompoundHeader,
  renderMarkdownTable,
  withTruncationNotice,
} from "./shared.js";

const TABLE_ROW_LIMIT = 200;

export function readSpreadsheetBuffer(
  buffer: Buffer,
  fileName: string,
  maxOutputTokens: number,
): ReadSpreadsheetResult {
  if (buffer.byteLength === 0) {
    throw new OfficeDocumentPortError("corrupted", `The spreadsheet '${fileName}' is empty.`);
  }
  // An OOXML spreadsheet that is actually an OLE envelope is password-protected
  // or otherwise encrypted; SheetJS would report this as a generic parse error.
  if (hasOleCompoundHeader(buffer)) {
    throw new OfficeDocumentPortError(
      "password_protected",
      `The spreadsheet '${fileName}' is encrypted or password-protected.`,
    );
  }

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  } catch (error) {
    throw new OfficeDocumentPortError(
      "corrupted",
      `Could not parse the spreadsheet '${fileName}': ${(error as Error).message}`,
      { cause: error as Error },
    );
  }

  const sheets: SpreadsheetSheetMarkdown[] = [];
  const parts: string[] = [];
  let truncated = false;
  let truncatedAtSheet: number | undefined;
  let tokenBudgetUsed = 0;

  for (let index = 0; index < workbook.SheetNames.length; index += 1) {
    const sheetName = workbook.SheetNames[index]!;
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    const rows = sheetToRows(sheet);
    // Render at most the tokens still available. A single huge sheet must not
    // be able to blow past the budget before the between-sheet check runs.
    const remaining = Math.max(maxOutputTokens - tokenBudgetUsed, 1);
    const rendered = renderSheetWithinBudget(rows, remaining);
    const sheetResult: SpreadsheetSheetMarkdown = {
      sheetName,
      rowCount: rows.length,
      columnCount: rows.reduce((max, row) => Math.max(max, row.length), 0),
      markdown: rendered.markdown,
      truncated: rendered.truncated,
    };

    const part = `### Sheet: ${sheetName}\n\n${rendered.markdown}`;
    tokenBudgetUsed += estimateTokens(part);
    sheets.push(sheetResult);
    parts.push(part);

    if (rendered.truncated || tokenBudgetUsed >= maxOutputTokens) {
      // The sheet that crossed the budget is the one that gets the notice.
      truncated = true;
      truncatedAtSheet = index;
      sheetResult.truncated = true;
      break;
    }
  }

  const markdown = withTruncationNotice(parts.join("\n\n"), truncated);

  return {
    sheets,
    markdown,
    originalSize: buffer.byteLength,
    truncated,
    ...(truncatedAtSheet !== undefined ? { truncatedAtSheet } : {}),
  };
}

/** SheetJS cell types that should not be coerced to numbers or dates. */
function sheetToRows(sheet: XLSX.WorkSheet): string[][] {
  const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: true,
    blankrows: false,
    defval: null,
  }) as unknown[][];
  const rows = raw.map((row) => row.map((cell) => formatCell(cell)));
  return trimEmptyRowsAndColumns(rows);
}

/** Longest cell text kept verbatim; longer values are elided in the middle. */
const MAX_CELL_CHARS = 500;

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return formatDate(value);
  if (typeof value === "string") return escapeMarkdownTableCell(truncateCell(value));
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return escapeMarkdownTableCell(truncateCell(String(value)));
}

/**
 * Elide a very long cell so one field cannot dominate the table. The marker
 * records the original length so the model knows content was omitted.
 */
function truncateCell(value: string): string {
  if (value.length <= MAX_CELL_CHARS) return value;
  const head = value.slice(0, MAX_CELL_CHARS);
  return `${head}… [+${value.length - MAX_CELL_CHARS} more chars]`;
}

function formatDate(value: Date): string {
  if (Number.isNaN(value.getTime())) return "";
  const iso = value.toISOString();
  // Midnight UTC is the common "date only" case; drop the empty time part.
  return iso.endsWith("T00:00:00.000Z") ? iso.slice(0, 10) : iso;
}

function trimEmptyRowsAndColumns(rows: string[][]): string[][] {
  if (rows.length === 0) return [];

  let lastRow = rows.length - 1;
  while (lastRow >= 0 && isEmptyRow(rows[lastRow]!)) lastRow -= 1;
  if (lastRow < 0) return [];

  const trimmedRows = rows.slice(0, lastRow + 1);

  let lastCol = 0;
  for (const row of trimmedRows) {
    for (let i = row.length - 1; i > lastCol; i -= 1) {
      if (!isEmptyCell(row[i])) {
        lastCol = i;
        break;
      }
    }
  }
  for (const row of trimmedRows) {
    if (row.length - 1 > lastCol) row.length = lastCol + 1;
  }
  return trimmedRows;
}

function isEmptyRow(row: string[]): boolean {
  return row.every(isEmptyCell);
}

function isEmptyCell(cell: string | undefined): boolean {
  return cell === undefined || cell.trim() === "";
}

function renderSheetAsMarkdown(rows: string[][]): string {
  if (rows.length === 0) return "_Empty sheet._";
  return renderMarkdownTable(rows, TABLE_ROW_LIMIT);
}

/**
 * Render a sheet while respecting a token budget. Rows are accumulated until
 * the estimated cost reaches `maxTokens`, then the sheet is cut with an
 * explicit row-range notice. The header row always survives so the model can
 * still interpret the columns.
 */
function renderSheetWithinBudget(
  rows: string[][],
  maxTokens: number,
): { markdown: string; truncated: boolean } {
  const full = renderSheetAsMarkdown(rows);
  if (estimateTokens(full) <= maxTokens) return { markdown: full, truncated: false };

  if (rows.length === 0) return { markdown: full, truncated: true };

  const header = rows[0]!;
  const body: string[][] = [];
  let used = estimateTokens(renderMarkdownTable([header], TABLE_ROW_LIMIT));
  for (let index = 1; index < rows.length; index += 1) {
    const row = rows[index]!;
    const rowCost = estimateTokens(renderMarkdownTable([header, row], 1));
    if (used + rowCost > maxTokens) break;
    body.push(row);
    used += rowCost;
  }

  const emittedRows = body.length;
  const remaining = rows.length - 1 - emittedRows;
  const truncatedMarkdown = `${renderMarkdownTable([header, ...body], TABLE_ROW_LIMIT)}\n… _truncated: showed ${emittedRows} of ${rows.length - 1} data rows (${remaining} omitted to stay within the token budget)_`;
  return { markdown: truncatedMarkdown, truncated: true };
}
