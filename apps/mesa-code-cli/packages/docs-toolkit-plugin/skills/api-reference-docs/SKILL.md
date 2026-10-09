---
name: api-reference-docs
description: Document public APIs from the source of truth, covering signatures, parameters, returns, errors, and examples that match current code.
---

# API reference docs

## Establish the contract
- Confirm the API surface, audience, version, and where the docs live.
- Read the current source, exported entry points, types, and existing docs first.
- Follow the project's documentation conventions and existing reference format.
- Update the corresponding spec before changing documented behavior.
- Preserve unrelated edits and existing user-authored documentation.

## Document each member
- Derive signatures, parameters, defaults, and return types from the source, not memory.
- Describe the purpose, expected inputs, and observable effect of each member.
- State error, rejection, and edge-case behavior the code actually implements.
- Note side effects, threading, ordering, and lifecycle constraints where relevant.
- Mark optional, required, deprecated, and experimental fields explicitly.
- Provide minimal, runnable examples that match the current version.
- Cross-link related members and the module-level overview.
- Avoid undocumented behavior, speculative features, and copy-pasted stale snippets.

## Verify and deliver
- Confirm every documented symbol still exists in the current source.
- Check that examples compile or run when the environment allows.
- Report symbols documented from types alone versus those exercised by running code.
- Note removed or renamed APIs and update or remove their stale sections.
- Ask permission before publishing, deploying, or committing the docs.
