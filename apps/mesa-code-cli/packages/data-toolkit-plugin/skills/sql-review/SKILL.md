---
name: sql-review
description: Review SQL for correctness, safety, and evidence-backed performance without executing unauthorized database changes.
---

# SQL review

## Establish context
- Identify SQL dialect, database version, schema, query purpose, and expected results.
- Read repository conventions and migrations before suggesting syntax or indexes.
- Use available tools and existing dependencies; do not assume a database connection exists.
- Reject credentials or connection secrets in prompts, examples, and reports.
- Request sanitized schema and plans rather than private production rows.
- Default to static review; establish authorized environment before any execution.

## Review correctness and safety
- Trace joins, cardinality, filters, grouping, aggregates, and ordering.
- Check NULL semantics, implicit casts, time zones, date boundaries, and integer division.
- Check duplicate amplification, missing join predicates, and unstable pagination.
- Require parameter binding for untrusted values; distinguish identifiers from value parameters.
- Flag SQL injection, broad UPDATE or DELETE predicates, and unintended privilege changes.
- Review transaction scope, lock exposure, retry behavior, and migration reversibility.
- Preserve user edits and original query files; propose the smallest justified diff.
- Do not execute writes, schema changes, or destructive statements without explicit permission.
- Do not assume EXPLAIN ANALYZE is read-only; it executes the statement.

## Assess performance with evidence
- Inspect available indexes, constraints, statistics, and an authorized query plan.
- Separate confirmed plan behavior from hypotheses based on query text.
- Prefer existing constraints and indexes before proposing redundant structures.
- Consider selectivity, sort cost, scans, correlated subqueries, and data volume.
- State write/storage tradeoffs when recommending an index.
- Use bounded non-production fixtures for execution when authorized tooling exists.
- Compare result equivalence and edge cases before claiming an optimization succeeds.

## Report
- Prioritize findings with query location, evidence, impact, and concrete correction.
- State which queries ran, which checks were static, and what remains unknown.
- Ask permission before publishing, deleting, deploying, or committing changes.
- Never claim a database fix or speedup without actual verification.
