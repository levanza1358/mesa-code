# Documentation policy

**Status:** active policy  
**Owner:** project maintainers and coding agents  
**Scope:** Markdown documentation in this workspace  
**Updated:** 2026-10-09 16:31 (local time)

## Purpose

Documentation must help an AI or engineer reach the correct source of truth quickly. Documents describe contracts, ownership, procedures, vocabulary, compatibility, or history. They must not blur those roles.

## Metadata

Every active document should begin with a compact metadata block:

```markdown
**Status:** active | draft | superseded | historical | reference | generated
**Owner:** team, package, or role responsible for keeping it accurate
**Scope:** one-sentence boundary
**Updated:** YYYY-MM-DD HH:MM (local time)
```

Optional fields:

- **Authority:** contract, architecture, runbook, reference, history, or legal notice.
- **Verification:** source-only, focused test, runtime, installer, or not verified.
- **Related:** links to the active specification, source area, or verification record.

Use local time. Do not invent a time. If the exact update time is unknown, use the date only and state that the time is unavailable.

## Status vocabulary

- **Active:** current source of truth for its declared scope.
- **Draft:** proposed content, not an implementation contract.
- **Superseded:** replaced by a named active document; retain the link for traceability.
- **Historical:** records a prior decision or implementation; never use alone to infer current behavior.
- **Reference:** vocabulary, naming, configuration, migration, or other stable context.
- **Generated:** produced from source or tooling; edit the generator instead.
- **Legal:** license or third-party notice; do not change for product work.

## AI reading rules

1. Start at [`docs/README.md`](README.md), after reading root `AGENTS.md`.
2. Select the smallest task route that covers the request.
3. Read the active specification before changing behavior.
4. Read ownership and dependency boundaries before changing state, protocol, remote, async, or persistence code.
5. Read `DESIGN.md` for UI changes and `CONTEXT.md` for plugin-store changes.
6. Read setup/build instructions only when launching, building, packaging, or verifying a platform.
7. Read changelog and verification log for history/evidence, never as a replacement for source or active specifications.
8. Treat historical/archive documents as context only. Do not copy their rules into current code without checking current source.
9. Stop reading once the authority, owner, interface, acceptance outcome, and verification path are known.

## Structure

Prefer this order:

1. Title and metadata.
2. Purpose and scope.
3. Product rules or procedure.
4. Owners, interfaces, and event order.
5. Compatibility and non-goals.
6. Acceptance or verification scenarios.
7. Related documents.

Use short sections, tables for compact enumerations, and diagrams for state/order/remote flows. Keep one owner for each state. Do not duplicate a contract across several documents; link to the owner instead.

## Claims and evidence

- Specifications state intended outcomes, not completion.
- Source comments explain constraints and causes; documentation explains product or engineering rules.
- Verification must include the exact command or scenario, date/time, result, and limitation.
- Never call an installer, runtime launch, network action, commit, push, or release successful without current evidence.
- Report blockers plainly, including missing Git metadata, unavailable dependencies, skipped runtime checks, and pre-existing warnings.

## Language and compatibility

- Source comments, documentation, and commit messages are English.
- Chinese belongs only in shipped localization catalogs.
- Product name is **Mesa Code**. Keep stable internal identifiers such as `@mesa-code/*`, `MESA_CODE_*`, `.mesa-code/`, protocol names, and persisted keys unchanged.
- Do not include credentials, real user data, secrets, or internal service addresses.

## Change history

Append product and documentation changes to [`changelog.md`](changelog.md) in reverse chronological order. Use one entry per meaningful work session, with local date and hour/minute.

Append command and runtime evidence to [`verification-log.md`](verification-log.md). Do not rewrite earlier entries to make a later result look historical.

## Review checklist

- [ ] Metadata present and current.
- [ ] Scope and authority explicit.
- [ ] Current source links valid.
- [ ] No duplicate or contradictory contract.
- [ ] Verification claims dated and evidenced.
- [ ] Historical/archive status clear.
- [ ] Changelog and verification log updated when applicable.
