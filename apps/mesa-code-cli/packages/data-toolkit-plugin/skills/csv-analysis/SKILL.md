---
name: csv-analysis
description: Inspect CSV files, validate parsing, and produce reproducible summaries without changing source data.
---

# CSV analysis

## Establish scope
- Confirm input paths, business question, population, and requested output.
- Use available file-reading tools first; inspect a bounded sample before processing everything.
- Reject credentials or secrets as inputs; request sanitized data instead.
- Keep personal or sensitive rows out of examples, logs, and external services.
- Prefer the standard library, platform-native tools, or already-installed dependencies.
- Do not invent tools, install dependencies, or assume a CSV library is available.

## Inspect and analyze
- Identify encoding, BOM, delimiter, quoting, header presence, and newline convention.
- Use a real CSV parser when available; never split quoted records on commas or newlines.
- Preserve leading zeros, identifiers, original text, and explicit empty values.
- Distinguish missing fields, empty strings, parse failures, and numeric zero.
- Confirm units, date formats, time zones, filters, and grouping keys before aggregation.
- Count records, malformed rows, missing values, duplicate keys, and unexpected categories.
- Check numeric ranges and denominators before reporting totals, rates, or averages.
- State whether results cover all records or a sample; document exclusions.
- Keep source files unchanged; preserve encoding and user edits in any derived export.
- Neutralize spreadsheet formula injection only in an explicitly described derived export.
- Do not silently rewrite formula-like source values or discard malformed records.

## Verify and deliver
- Reconcile grouped totals with source counts and manually check representative calculations.
- Include reproducible filters, formulas, units, and a small sanitized result table.
- Report limitations and unavailable tooling rather than claiming complete analysis.
- Ask permission before overwriting outputs, publishing, deleting, deploying, or committing.
- Return artifact paths and actual validation results; separate observations from interpretations.
