---
name: technical-docs
description: Write or update technical documentation grounded in current source, interfaces, and verified commands.
---

# Technical docs

## Establish scope
- Confirm audience, task, documentation location, and required level of detail.
- Read existing documentation, project rules, current source, and package scripts.
- Identify the authoritative interface and owner before documenting behavior.
- Reject secrets; use sanitized placeholders instead of real credentials or private data.
- Prefer existing file tools and native formats; do not invent tools or runtime capabilities.

## Draft from evidence
- Start with the reader's goal, prerequisites, and shortest supported path.
- Use commands and paths that actually exist in the current project.
- Separate current behavior, proposed behavior, and deprecated behavior.
- Explain inputs, outputs, failure modes, recovery steps, and permission boundaries.
- Include minimal runnable examples with explicit environment assumptions.
- Describe state owners and event order when documenting asynchronous interactions.
- Link to stable source or specification references instead of duplicating large implementations.
- Preserve user edits, document encoding, and unrelated sections.
- When examples involve data or workbooks, preserve source values and formulas.
- Never claim a command succeeded, a feature shipped, or a test passed without evidence.

## Validate
- Check referenced symbols, paths, configuration keys, and supported versions.
- Run safe examples only within authorized scope and with available tools.
- Ask before commands that publish, delete, deploy, commit, or overwrite existing work.
- Do not install documentation tooling merely to format a small edit.
- Check headings, links, code fences, terminology, and accessibility of instructions.
- Make unverified steps and unavailable tooling visible to the reader.

## Deliver
- Summarize changed sections and actual checks performed.
- List unresolved questions and maintenance-sensitive assumptions.
- Obtain explicit permission before publishing documentation externally.
- Return the document or file path without claiming unsupported execution.
