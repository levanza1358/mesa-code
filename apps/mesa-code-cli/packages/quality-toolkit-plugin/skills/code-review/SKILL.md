---
name: code-review
description: Review a bounded change for actionable correctness, compatibility, architecture, and verification issues with concrete source evidence.
---

# Code review

## Establish the review scope
- Confirm the requested files, diff, baseline, and intended behavior.
- Read repository instructions, the corresponding spec, and relevant contracts.
- Inspect current source, package scripts, and existing tests rather than archived guidance.
- If version control is unavailable, state how the review scope was determined.
- Keep the review read-only unless edits were explicitly requested.
- Preserve unrelated changes and do not inspect secrets or private data unnecessarily.
- Use available reading and search tools; disclose missing review or runtime capabilities.

## Follow the change through callers
- Check validation at trust boundaries, error handling, and resource cleanup.
- Trace changed public interfaces to consumers and serialized compatibility boundaries.
- Verify the authoritative state owner and that new code adds no competing write path.
- For async changes, sketch event order and inspect cancellation and stale-result guards.
- Check authorization, workspace identity, platform differences, and data preservation.
- Inspect tests for realistic assertions and coverage of changed behavior.
- Verify the spec was updated before behavior changes; acceptance text is not test evidence.
- Prefer deletion, standard libraries, native features, and installed dependencies.
- Distinguish concrete defects from style preferences and speculative redesigns.
- Confirm each material finding against source and a safe reproduction when available.

## Deliver actionable findings
- Order findings by impact and provide path, symbol, triggering case, and consequence.
- Explain the smallest corrective direction without rewriting unrelated code.
- Use current project checks when permitted; never invent a passing test result.
- Ask permission before irreversible commands or writes to external systems.
- If fixes are requested, update the spec first and add focused regression coverage.
- Report actual verification, baseline failures, and unreviewed or unexecuted paths.
- If no actionable issue is found, say so while naming the limits of the review.
