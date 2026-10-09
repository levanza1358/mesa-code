---
name: spreadsheet-report
description: Plan and prepare spreadsheet reports with traceable calculations while preserving workbook formulas and user edits.
---

# Spreadsheet report

## Confirm the report
- Establish audience, input workbooks, reporting period, units, and required deliverable format.
- Inspect available tools and already-installed libraries before promising workbook generation.
- Prefer native platform features and existing dependencies; do not add a runtime or MCP service.
- If Office support is unavailable, offer a clearly labeled CSV, table, or report plan.
- Never claim CSV preserves workbook sheets, formulas, formatting, or macros.
- Reject secrets; request sanitized inputs and avoid exposing private cell contents.

## Preserve the workbook
- Read sheet names, table ranges, headers, formulas, and cached values where tooling permits.
- Treat missing cached values as unknown, not zero or proof that a formula is broken.
- Preserve source files, formulas, named ranges, encoding, and existing user edits.
- Identify macros, charts, links, hidden sheets, and unsupported features before writing.
- Stop before a lossy round trip; offer a separate derived artifact instead.
- Do not evaluate macros or update external links without explicit authorization.
- Agree on output location and obtain permission before replacing an existing workbook.

## Build a useful report
- Separate source data, assumptions, calculations, and summary sections when appropriate.
- Label units and periods; distinguish actuals, forecasts, and missing data.
- Use explicit formulas and stable references rather than unexplained hardcoded totals.
- Include source references, filters, exclusions, and refresh instructions.
- Keep formatting readable; avoid color as the only indicator of status.
- Check formula-like text before exporting untrusted data for spreadsheet consumption.
- Verify totals, row counts, representative formulas, and sheet names against inputs.

## Deliver honestly
- Reopen the result with an available reader; distinguish structural checks from recalculation.
- Do not claim Excel or another Office application rendered or recalculated it unless observed.
- Report unsupported features, tool limits, and validation not performed.
- Ask permission before publishing, deleting, deploying, or committing any deliverable.
- Provide artifact path, concise findings, and next steps for the intended reader.
