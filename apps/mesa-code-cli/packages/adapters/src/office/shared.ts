// ============================================================
// OfficeDocumentAdapter — shared helpers
// ============================================================
// Pure-JS helpers shared by the Office readers. Kept separate from
// `index.ts` so each reader module stays focused on one format family.

/** Escape a value so it can sit inside a Markdown table cell. */
export function escapeMarkdownTableCell(value: string): string {
  // A literal `|` would split the cell and backslashes are Markdown escapes,
  // so both must be escaped. Newlines become `<br>` to keep one row per line.
  return value
    .replace(/\\/gu, "\\\\")
    .replace(/\|/gu, "\\|")
    .replace(/\r?\n/gu, "<br>");
}

/** Collapse runs of whitespace and trim, for one-line cell text. */
export function collapseWhitespace(value: string): string {
  return value.replace(/\s+/gu, " ").trim();
}

/** Strip a UTF-8/UTF-16 BOM that some writers prepend to text payloads. */
export function stripByteOrderMark(value: string): string {
  return value.charCodeAt(0) === 0xfeff ? value.slice(1) : value;
}

/**
 * True when the buffer starts with the OLE compound-file signature
 * (`D0 CF 11 E0 A1 B1 1A E1`). Legacy `.doc`/`.ppt`/`.xls` use this container,
 * and — importantly — so do *encrypted* OOXML files: Office wraps a
 * password-protected `.docx`/`.xlsx`/`.pptx` in an OLE envelope rather than
 * leaving it as a ZIP.
 */
export function hasOleCompoundHeader(buffer: Buffer): boolean {
  return (
    buffer.length >= 8 &&
    buffer[0] === 0xd0 &&
    buffer[1] === 0xcf &&
    buffer[2] === 0x11 &&
    buffer[3] === 0xe0 &&
    buffer[4] === 0xa1 &&
    buffer[5] === 0xb1 &&
    buffer[6] === 0x1a &&
    buffer[7] === 0xe1
  );
}

/**
 * True when the buffer begins with a ZIP local-file or empty-archive header,
 * i.e. it is plausibly an OOXML/ODF container rather than an OLE envelope.
 */
export function hasZipHeader(buffer: Buffer): boolean {
  return (
    buffer.length >= 4 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    (buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07)
  );
}

/** Clamp a number into an inclusive range. */
export function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/**
 * Approximate token count for a string using the same heuristic the Read tool
 * uses for text budgets (roughly four characters per token).
 */
export function estimateTokens(value: string): number {
  return Math.ceil(value.length / 4);
}

/**
 * Render rows as a GitHub-flavoured Markdown table. Cells are padded for
 * readability, but padding is capped so a single wide cell cannot inflate
 * every column: past the cap the column is left unpadded and the Markdown
 * table stays valid.
 */
const MAX_PAD_WIDTH = 60;

export function renderMarkdownTable(rows: readonly (readonly string[])[], rowLimit: number): string {
  if (rows.length === 0) return "";
  const columnCount = rows.reduce((max, row) => Math.max(max, row.length), 0);
  if (columnCount === 0) return "";

  const normalized = rows.map((row) => {
    const cells: string[] = [];
    for (let index = 0; index < columnCount; index += 1) {
      cells.push(row[index] ?? "");
    }
    return cells;
  });

  const header = normalized[0]!;
  const body = normalized.slice(1, 1 + rowLimit);
  const widths = Array.from<number>({ length: columnCount }).fill(3);
  for (let column = 0; column < columnCount; column += 1) {
    widths[column] = Math.max(widths[column]!, Math.min(header[column]!.length, MAX_PAD_WIDTH));
    for (const row of body) {
      widths[column] = Math.max(widths[column]!, Math.min(row[column]!.length, MAX_PAD_WIDTH));
    }
  }

  const formatRow = (cells: string[]): string =>
    cells
      .map((cell, index) => {
        const width = widths[index]!;
        // Do not pad a cell that already exceeds the column width.
        return cell.length >= width ? ` ${cell} ` : ` ${cell.padEnd(width, " ")} `;
      })
      .join("|");

  const lines: string[] = [];
  lines.push(formatRow(header));
  lines.push(widths.map((width) => "-".repeat(width + 2)).join("|"));
  for (const row of body) lines.push(formatRow(row));
  if (normalized.length - 1 > rowLimit) {
    lines.push(`… _truncated after ${rowLimit} rows_`);
  }
  return lines.join("\n");
}

/** Append the truncation notice when `truncated` is true. */
export function withTruncationNotice(markdown: string, truncated: boolean): string {
  return truncated ? `${markdown}\n\n… _output truncated to stay within the token budget_` : markdown;
}
