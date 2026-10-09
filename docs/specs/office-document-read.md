# Office document read capability

Status: Implemented

## Problem

The Read tool refused `.xlsx`, `.xls`, `.docx`, `.pptx` and other Office documents because:

1. The tool dispatch in `apps/mesa-code-cli/packages/core/src/tool/handlers/read.ts`
   only handled images, videos, and PDFs. Any other extension fell through to
   `readTextFileForModel`, which fails for binary containers.
2. The `Write` and `Bash` system prompts in
   `apps/mesa-code-cli/packages/core/src/context/sections/identity.ts`,
   `tool/handlers/write.ts`, and `tool/handlers/bash-prompt.ts` told the model
   that Office artifacts must be produced by running a generator through Bash,
   and discouraged the model from attempting to read them.
3. There was no Office document port analogous to `PdfDocumentPort` so the
   agent could not extract structured text from spreadsheets and word
   documents directly.

The combined effect was that the agent either errored at read time, or asked
the user to run an external command themselves. The user should never have to
run a command manually for a capability the tool itself can deliver.

## Product behavior

The Read tool now accepts Office documents transparently and converts them to
text representations suitable for the model:

1. **Spreadsheet read** (`.xlsx`, `.xls`, `.xlsm`, `.xlsb`, `.ods`, `.csv`).
   The tool reads the workbook, walks every sheet, and renders each sheet as
   a Markdown table with a header row. Numbers stay numeric and dates render as
   ISO-8601, both derived from the cell value rather than a pre-formatted
   display string. Pipes and backslashes in cells are escaped. Empty trailing
   rows and columns are dropped. When the workbook exceeds the token budget,
   the tool emits a truncation notice and stops.
2. **Word document read** (`.docx`, `.docm`, `.dotx`, `.dotm`, `.doc`).
   The tool converts the document to semantic HTML and walks it, preserving
   headings (with level), lists, and tables in reading order. Legacy binary
   `.doc` is recovered as best-effort plain text.
3. **Presentation read** (`.pptx`, `.pptm`, `.ppsx`, `.ppsm`, `.potx`, `.potm`,
   `.ppt`). Each slide is rendered as Markdown with its title, body bullets
   (nested by indent level), tables, and speaker notes, in slide order.
4. **Rich-text read** (`.rtf`, `.odt`). RTF is tokenised so control words,
   font/colour tables, and ignorable destinations are dropped while `\uN`,
   `\'hh`, and Unicode escapes are decoded. ODT is read from `content.xml`.

All read operations are:

- **Read-only.** No file mutation, no macros, no external processes for
  Office formats.
- **Pure JS.** The implementation uses SheetJS (`xlsx`) for spreadsheets,
  `mammoth` + `cheerio` for `.docx`, and `yauzl` plus small in-repo parsers for
  OOXML/ODF/RTF/legacy containers. No COM/Office interop, no platform-specific
  binaries, no requirement for Microsoft Office to be installed.
- **Bounded.** A per-call input byte limit guards against multi-hundred-MB
  files (`READ_OFFICE_MAX_INPUT_BYTES`, 64 MB) and a rendering token budget
  (`READ_OFFICE_MAX_OUTPUT_TOKENS`, 25 000) bounds the generated Markdown. ZIP
  entry decompression is capped to guard against decompression bombs.
- **Traceable.** Each call threads the existing `TraceContext` so trace ids
  propagate through the new port, matching the `PdfDocumentPort` convention.

## Where the behavior lives

The capability is delivered through a new port mirroring the existing
`PdfDocumentPort` design (`packages/contracts/src/interfaces/pdf-document.port.ts`).

- **Contract**: `OfficeDocumentPort` and `OfficeDocumentPortError` in
  `packages/contracts/src/interfaces/office-document.port.ts`.
  The contract exposes four operations:
  - `readSpreadsheet(request)` returns structured rows plus a Markdown
    rendering.
  - `readWordDocument(request)` returns ordered paragraphs and tables.
  - `readPresentation(request)` returns per-slide Markdown and notes.
  - `readDocument(request)` returns ordered blocks plus the detected
    `sourceFormat` for RTF/ODT/legacy containers.
- **Adapter**: `packages/adapters/src/office/` implements `OfficeDocumentPort`
  using `xlsx`, `mammoth`, `cheerio`, and `yauzl`. The adapter is pure JS, with
  no child processes, and returns an actionable `unsupported_format` error when
  a format variant yields no text.
- **Wiring**: `bootstrap/src/app/create-app.ts` constructs the adapter with
  no required dependencies (`new OfficeDocumentAdapter()`) and injects it
  through `AgentRuntimeDeps.officeDocumentPort`. The runtime forwards the
  port to child runtimes, the subagent factory, and the project-memory
  helper using the same plumbing as `pdfDocumentPort`.
- **Handler**: `core/src/tool/handlers/read-office-dispatch.ts` dispatches by
  extension to `read-spreadsheet.ts`, `read-docx.ts`, `read-presentation.ts`,
  or `read-document.ts`, sitting next to the existing `read-pdf.ts` and
  `read-image.ts` handlers. Tool descriptions in `READ_PROVIDER_DESCRIPTION`
  advertise the capability.
- **Attachments**: `core/src/runtime/helpers/attachment-path-reference.ts`
  classifies Office containers as binary path references (not text) and infers
  their MIME type, so the model reads them through the Read tool.
- **System prompt**: the messages in `write.ts`, `bash-prompt.ts`, and
  `identity.ts` no longer instruct the model to refuse Office artifacts; they
  point the model at the Read tool for spreadsheets, Word documents,
  presentations, and rich text, and at the Bash tool for everything else.

## Files changed

### Original change (spreadsheets + Word)

- `docs/specs/office-document-read.md` (new) — this spec.
- `apps/mesa-code-cli/packages/contracts/src/interfaces/office-document.port.ts`
  (new) — port contract, error class, and request/response types.
- `apps/mesa-code-cli/packages/contracts/src/tools/read.ts` — adds
  `ReadSpreadsheetOutput` and `ReadWordDocumentOutput` to `ReadOutput` and
  extends `ReadOutputSchema` accordingly.
- `apps/mesa-code-cli/packages/contracts/src/index.ts` — re-exports the new
  interface module.
- `apps/mesa-code-cli/packages/adapters/src/office/` (new) — adapter
  implementing `OfficeDocumentPort`.
- `apps/mesa-code-cli/packages/adapters/package.json` — exports `./office`,
  adds `xlsx`, `mammoth`, `yauzl`, and `domhandler` dependencies.

### Follow-up change (full coverage + audit fixes)

Contract and adapter:
- `packages/contracts/src/interfaces/office-document.port.ts` — adds
  `ReadPresentationResult`, `ReadDocumentResult`,
  `READ_OFFICE_MAX_OUTPUT_TOKENS`, per-sheet `truncated`, and the
  `readPresentation`/`readDocument` port methods.
- `packages/contracts/src/tools/read.ts` — adds `ReadPresentationOutput` and
  `ReadDocumentOutput` to `ReadOutput`/`ReadOutputSchema`.
- `packages/adapters/src/office/index.ts` — adapter dispatch across the four
  readers; extension sets and predicates.
- `packages/adapters/src/office/spreadsheet-reader.ts` (new) — spreadsheet
  reader with the `raw: true` date fix and Markdown-cell escaping.
- `packages/adapters/src/office/docx-reader.ts` (new) — mammoth `convertToHtml`
  + cheerio block walker.
- `packages/adapters/src/office/presentation-reader.ts` (new) — PPTX reader and
  legacy `.ppt` text recovery.
- `packages/adapters/src/office/document-reader.ts` (new) — RTF/ODT/legacy
  `.doc` readers.
- `packages/adapters/src/office/rtf-reader.ts` (new) — RTF tokeniser.
- `packages/adapters/src/office/zip.ts` (new) — bounded ZIP entry reader.
- `packages/adapters/src/office/shared.ts` (new) — Markdown table renderer,
  escaping, and shared helpers.
- `packages/adapters/scripts/make-office-fixtures.py` (new) — fixture generator.
- `packages/adapters/test/office-document-read.test.ts` (new) — reader tests.
- `packages/adapters/test/fixtures/*` (new) — committed test fixtures.

Core:
- `packages/core/src/tool/handlers/read-office-shared.ts` (new) — shared error
  mapping and tracing for the Office handlers.
- `packages/core/src/tool/handlers/read-office-dispatch.ts` (new) — extension
  dispatch (keeps `read.ts` within its line budget).
- `packages/core/src/tool/handlers/read-spreadsheet.ts` — thin handler over the
  shared plumbing.
- `packages/core/src/tool/handlers/read-docx.ts` — thin handler over the shared
  plumbing.
- `packages/core/src/tool/handlers/read-presentation.ts` (new).
- `packages/core/src/tool/handlers/read-document.ts` (new).
- `packages/core/src/tool/handlers/read.ts` — dispatch + formatter + description.
- `packages/core/src/runtime/helpers/attachment-path-reference.ts` — office
  extension classification and MIME inference.
- `packages/core/src/runtime/helpers/attachments.ts` — route office containers
  to a path reference instead of decoding them as text.
- `packages/core/src/runtime/types.ts` and `src/tool/types.ts` — repair a
  pre-existing corruption where the `officeDocumentPort` line was spliced into
  `imageProcessorPort`, breaking the build.
- `packages/core/test/office-document-dispatch.test.ts` (new) — dispatch
  uniqueness and attachment classification tests.

## Non-goals

- Writing Office documents. `Write` still defers to a generator for binary
  artifacts; the user can request `Write .docx` through a future change.
- Real-time collaboration with Microsoft Office, COM interop, or any platform
  lock-in. The implementation is portable across Windows, macOS, and Linux
  and ships with pure JS libraries.
- Pixel-accurate visual rendering (fonts, colours, slide geometry). The model
  reads structure and text, not the visual layout.

## Extended format coverage

The original change shipped spreadsheets and Word, and left `.pptx`/`.rtf` as
a structured placeholder. A follow-up change made the coverage complete and
fixed three bugs found while auditing the shipped code:

### New formats

| Family | Extensions | Reader |
| --- | --- | --- |
| Presentation | `.pptx` `.pptm` `.ppsx` `.ppsm` `.potx` `.potm` | `presentation-reader.ts` walks `ppt/presentation.xml` + slide parts through the bounded ZIP reader; renders titles/body/nested bullets/tables and speaker notes. |
| Presentation (legacy) | `.ppt` | Best-effort printable UTF-16LE run recovery from the OLE stream. |
| Rich text | `.rtf` | `rtf-reader.ts`, a nested-group tokeniser that skips destinations and decodes `\uN`/`\'hh`. |
| OpenDocument | `.odt` | `document-reader.ts` walks `content.xml`. |
| Word (legacy) | `.doc` | OLE compound-file text recovery via `document-reader.ts`. |

### Bugs fixed

1. **Spreadsheet dates.** Cells were read through SheetJS `sheet_to_json` with
   `raw: false`, which returns already-formatted display text (`1/15/24`). The
   reader now uses `raw: true` and formats values itself so dates render as
   stable ISO-8601 and quoted CSV values keep their real content (a quoted
   `"x,y"` used to come back as a literal `x,y` with quote characters).
2. **Markdown table integrity.** Cell values containing `|`, backslashes, or
   newlines are escaped; previously a pipe inside a cell split the table.
3. **Word structure.** The Word reader used `mammoth.extractRawText` plus a
   regex looking for `# ` prefixes that mammoth never emits, so heading levels,
   list items, and tables were all lost. It now uses `mammoth.convertToHtml`
   and walks the semantic HTML with `cheerio`.

### Attachment handling

Office containers are ZIP/OLE binaries. Previously a `.docx` attachment with no
inline content was treated as text-like and decoded as UTF-8 (mojibake). Files
matching `isOfficeDocumentPath` now resolve to a path reference so the model
reads them through the Read tool, and `inferAttachmentMimeFromPath` returns the
real MIME type.

### Dispatch

Every extension is claimed by exactly one handler predicate (pinned by
`packages/core/test/office-document-dispatch.test.ts`); `.doc` is owned by the
Word handler and `.csv` by the spreadsheet handler, so dispatch order is not
load-bearing.

### Robustness hardening

Adversarial fixtures (`test/fixtures/adversarial/`, generated by
`scripts/make-adversarial-fixtures.py` and
`scripts/make-legacy-ole-fixture.py`) drive `office-document-robustness.test.ts`.
The audit surfaced and fixed:

1. **ZIP errors were untyped.** `OfficeZipError` extended `Error`, so it
   carried no `code` and fell into the handler's unknown branch. It now extends
   `OfficeDocumentPortError`, so ZIP failures map like every other adapter
   error.
2. **Encrypted files misreported as corrupt.** An encrypted `.docx`/`.xlsx`/
   `.pptx` is an **OLE envelope, not a ZIP**. `hasOleCompoundHeader` now
   detects this and every OOXML reader reports `password_protected` with an
   actionable message instead of a parse error.
3. **Unbounded single-sheet rendering.** The spreadsheet budget was only
   checked *between* sheets, so one large sheet produced a ~410 KB string. The
   renderer now stops mid-sheet and emits a `showed N of M data rows` notice;
   the same fixture is bounded to ~36 KB.
4. **One wide cell inflated the table.** A 5 000-char cell padded every column
   to 5 000 chars (25 KB for a 4-row sheet). Cells are elided past 500 chars and
   column padding is capped at 60 chars; the fixture is now 822 bytes.
5. **Legacy OLE metadata leaked as content.** The best-effort `.doc`/`.ppt`
   recovery picked up OLE directory names (`WordDocument`) as text runs. Runs
   must now look like prose and structural names are filtered; a real OLE
   fixture with UTF-16 text round-trips cleanly.
6. **Legacy `.ppt` accepted any binary.** `readLegacyPptBuffer` now requires the
   OLE header, so a ZIP or arbitrary blob is not misread as a deck.

Empty containers across all readers now fail with an explicit "is empty"
message rather than a downstream parse error.

## Acceptance scenarios

- The Read tool reads `.xlsx` and returns a Markdown table per sheet with
  correct row and column counts, ISO dates, and escaped cells.
- The Read tool reads `.docx` and returns ordered headings (with levels), list
  items, and tables.
- The Read tool reads `.pptx` and returns per-slide Markdown including nested
  bullets, tables, and speaker notes.
- The Read tool reads `.rtf`/`.odt`/legacy `.doc` and returns text with the
  detected `sourceFormat`, or an actionable `unsupported_format` error when no
  text can be recovered.
- Tests under `packages/adapters/test/` cover the spreadsheet renderer, the
  Word HTML-to-blocks conversion, the presentation reader, the RTF tokeniser,
  and the extension predicates. Tests under `packages/core/test/` cover
  dispatch uniqueness and attachment classification.
- `pnpm lint` (root) and the affected packages' `tsc --noEmit` pass.