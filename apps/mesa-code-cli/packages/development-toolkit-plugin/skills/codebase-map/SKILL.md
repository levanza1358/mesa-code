---
name: codebase-map
description: Map an unfamiliar codebase from current entry points, contracts, state owners, and evidence-backed dependency paths before planning changes.
---

# Codebase map

## Establish scope
- Confirm the workspace and the question the map must answer.
- Read repository instructions, current specifications, and architecture policy.
- Inspect package manifests and current scripts; do not infer commands from framework names.
- Use available file listing, search, and reading tools; disclose missing capabilities.
- Keep exploration read-only and preserve unrelated edits and generated artifacts.

## Trace the implementation
- Start with application entry points, public exports, routes, or command registration.
- Search broadly for domain terms, then narrow to callers and implementations.
- Follow one representative request from input through its owner to output.
- Identify state ownership, persistence boundaries, and external dependencies.
- Separate UI projections and caches from authoritative state.
- For async paths, sketch owners and event order, including retries and stale-result guards.
- Inspect the existing contracts and tests that support each claimed boundary.
- Distinguish active source from fixtures, archives, generated output, and unused code.
- Use native search and installed tools before considering additional dependencies.
- Do not open secrets or copy user data merely to make the map more complete.

## Deliver a bounded map
- Cite file paths and symbols for entry points, owners, interfaces, and key transitions.
- Explain dependency direction and any verified boundary violations.
- List current relevant verification scripts without claiming they were run.
- Separate confirmed facts, inferred relationships, and unanswered questions.
- Recommend the smallest next reading set or change surface, not speculative scaffolding.
- If changes are requested, update the corresponding spec before behavior changes.
- Obtain permission before irreversible actions or writes to external systems.
- Report exploration limits; a source map alone does not prove runtime behavior.
