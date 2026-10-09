---
name: api-design
description: Design a minimal API contract grounded in existing callers, ownership, validation, compatibility, and explicit failure semantics.
---

# API design

## Discover the boundary
- Confirm callers, use cases, authorization scope, and required outcomes.
- Read repository instructions, current specifications, and relevant public contracts.
- Inspect actual routes, schemas, protocol handlers, and package scripts.
- Inventory available tooling; do not assume a server, schema generator, or account exists.
- Prefer an existing API or native capability over adding another endpoint.
- Identify the single owner of each state transition and persistence write.

## Specify before implementation
- Update the corresponding spec with product rules and acceptance scenarios.
- Define request and response shapes, required fields, and runtime validation.
- Separate transport representation from internal implementation details.
- State authentication, authorization, tenant or workspace identity, and trust boundaries.
- Define errors, cancellation, timeout behavior, and retry eligibility explicitly.
- For mutations, specify idempotency scope and duplicate-request behavior.
- Diagram caller, owner, validation, transition, persistence, and response event order.
- Define concurrency conflicts and stale-result rejection rather than adding silent retries.
- Bound payload sizes and pagination only where the use case needs them.
- Preserve stable protocol and storage identifiers and existing local fallbacks.
- Plan compatible evolution and existing migrations; never silently discard persisted data.
- Keep credentials and real user data out of examples and logs.

## Validate the contract
- Check representative valid, invalid, unauthorized, duplicate, and conflict scenarios.
- Reuse existing schemas, public interfaces, installed dependencies, and test harnesses.
- Implement only when requested, with the smallest diff at the owning boundary.
- Ask permission before deployment, publishing, irreversible actions, or external writes.
- Run available contract and consumer checks using current project scripts when permitted.
- Report decisions, compatibility impact, actual verification, and unresolved questions.
- Distinguish a proposed contract from an implemented or runtime-verified API.
