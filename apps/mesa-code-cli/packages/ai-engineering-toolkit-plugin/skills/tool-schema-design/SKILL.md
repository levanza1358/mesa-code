---
name: tool-schema-design
description: Design model-facing tool schemas with precise types, clear descriptions, safe defaults, and validation suited to a real host or agent runtime.
---

# Tool schema design

## Establish the contract
- Confirm the tool's purpose, the host or runtime that will expose it, and the caller's expected result.
- Read existing tool definitions and conventions for naming, typing, and error shapes before adding one.
- Identify which schema features the target runtime actually supports; do not assume a newer capability exists.
- Keep one tool, one clear job; split tools that force the model to guess a mode.

## Shape the interface
- Name the tool and parameters with verbs and nouns the model will not confuse with neighbors.
- Type every parameter precisely and mark required versus optional explicitly.
- Describe each field's meaning, units, format, and effect in its own description string.
- Constrain enums, ranges, string patterns, and array bounds so invalid input is rejected early.
- Prefer flat, focused parameters over deeply nested objects that are hard to fill correctly.
- Provide safe, documented defaults and avoid parameters whose absence has surprising effects.
- Make side effects explicit and separate read-only tools from mutating ones.
- Design outputs that are small, structured, and stable so the model can rely on their fields.
- Define error results clearly and distinguish a tool error from a task-level failure.
- Never place credentials or secrets in schema examples or default values.

## Validate and document
- Validate inputs at the boundary and reject unknown or malformed fields deterministically.
- Test the schema against a real invocation when the runtime is available; report what was not run.
- Return the schema, field rationale, an example call, and observed limitations.
