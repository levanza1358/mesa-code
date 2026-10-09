---
name: safe-refactor
description: Refactor a bounded implementation while preserving observable behavior, public contracts, persisted data, and unrelated workspace changes.
---

# Safe refactor

## Define the invariant
- Confirm the requested scope and whether behavior must remain identical.
- Read repository instructions, the relevant spec, contracts, and architecture policy.
- Inspect current package scripts and existing tests before choosing verification.
- Record local changes when version control is available; never overwrite unrelated work.
- Identify public callers, exported symbols, serialized formats, and compatibility keys.
- Use available reference search tools; a text match alone does not prove export usage.
- Capture observable behavior with existing tests or a small characterization check.

## Choose the smallest change
- Ask whether deletion, a standard library function, or a native feature removes the need.
- Reuse installed dependencies and existing interfaces before adding new ones.
- Keep one owner and one write path; do not introduce parallel caches or state stores.
- Sketch owner and event order if async or stateful structure changes.
- Update the corresponding spec before any behavior change, not after implementation.
- If behavior must change, separate that change from the mechanical refactor.
- Preserve protocol identifiers, persistence keys, validation, and error semantics.
- Use existing idempotent migrations when data shape changes; never discard user data.
- Obtain permission before destructive operations or writes to external systems.

## Apply and verify
- Make small edits within declared module boundaries and public entry points.
- Check all known callers after moves, renames, signature changes, and deletions.
- Avoid broad replacements that alter generated files, fixtures, or unrelated modules.
- Run focused checks and repository-required checks using actual available scripts.
- Do not install a new test framework for a check existing tooling can express.
- Inspect the final diff for accidental behavior, dependency, and formatting changes.
- Report retained invariants, modified paths, actual check outcomes, and remaining risks.
- Do not claim equivalence for untested runtime paths; name the missing coverage.
