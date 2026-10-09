---
name: query-optimization
description: Diagnose slow queries with measured plans and indexes, then optimize without changing results or guessing at bottlenecks.
---

# Query optimization

## Establish evidence
- Confirm the slow query, workload, data volume, and the performance goal.
- Read repository instructions, the query source, ORM usage, and existing indexes.
- Update the corresponding spec before changing behavior; keep semantics identical.
- Never experiment on production or shared data without explicit authorization.

## Measure before optimizing
- Capture the current execution plan with the engine's built-in explain facility.
- Record actual timings and row counts rather than estimating cost.
- Identify the real bottleneck: full scan, missing index, bad join order, or N+1 access.
- Check whether an existing index is unused, redundant, or mis-ordered.
- Reproduce with a representative dataset; note when only sample data was available.

## Optimize and verify
- Address the measured cause first; avoid speculative rewrites.
- Add or adjust indexes to match the query's filter, join, and sort columns.
- Simplify the query only when it preserves the exact result set and ordering.
- Re-run the plan and timings to confirm the improvement, and keep the before numbers.
- Check the effect on writes and other queries before adding a new index.
- Confirm results are unchanged, including edge cases and null handling.
- Report the plan, measured change, and any workload not exercised.
