---
name: data-quality
description: Define and run bounded data-quality checks with explicit rules, reproducible evidence, and non-destructive remediation proposals.
---

# Data quality

## Define the contract
- Confirm dataset, authorized scope, business owner, and decisions affected by quality.
- Record schema, key fields, units, accepted categories, and freshness expectations.
- Distinguish business requirements from inferred rules; confirm ambiguous thresholds.
- Reject secrets and request sanitized fixtures; do not send private records externally.
- Inspect available tools; prefer standard libraries, native features, and installed dependencies.
- Do not invent connectors, accounts, data access, or bundled validation services.

## Check without changing data
- Profile record counts, field coverage, types, ranges, and unexpected values.
- Test completeness, uniqueness, validity, consistency, and referential integrity.
- Check freshness using the declared event time and time zone, not file modification alone.
- Detect duplicate keys separately from legitimate repeated observations.
- Treat missing, blank, zero, and parse failure as distinct states.
- Record denominators, sample size, exclusions, and sampling method for every rate.
- Use bounded sanitized examples to explain failures without exposing raw sensitive rows.
- Preserve source data, spreadsheet formulas, file encoding, and user edits.
- Never silently drop rows, coerce identifiers, impute values, or deduplicate records.

## Propose remediation
- Rank findings by impact and affected records, not only number of checks failed.
- Identify likely upstream owners; label suspected causes as unconfirmed.
- Propose explicit corrections and explain information lost by each transformation.
- Obtain permission before applying transformations or overwriting outputs.
- Keep an audit of approved transformations and reconcile before/after counts.
- Add a small runnable check using existing tooling when implementing a quality rule.

## Deliver
- Report rule, observed result, threshold, severity, evidence, and recommended owner.
- Distinguish full-dataset checks from samples and unavailable checks.
- Ask permission before publishing, deleting, deploying, or committing results.
- Do not call data clean merely because a bounded set of checks passed.
