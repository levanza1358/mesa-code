---
name: mobile-offline-sync
description: Design and review offline-first mobile storage and synchronization with explicit ownership, ordering, conflict handling, and honest limits.
---

# Mobile offline sync

## Define the model
- Confirm what must work offline, the source of truth, the sync target, and the acceptable staleness.
- Read repository instructions, the relevant spec, and current storage and networking code before changing behavior.
- Inventory available storage and network facilities; do not invent a sync service or backend that is not present.
- Name the single owner for local state and the single owner for reconciliation; avoid two writers to the same record.
- Preserve existing user data and migrations; never silently discard local or remote records.

## Design the flow
- Record event order: local write, durable queue, upload attempt, server ack, reconciliation, notification.
- Give every mutation a stable identity and an idempotent apply so retries and duplicates are safe.
- Queue writes durably and survive app exit and restart; state honestly whether work resumes after termination.
- Define the conflict rule (last-writer-wins, merge, or manual) and apply it deterministically.
- Handle partial failure: retry with bounded backoff, surface persistent failures, and never drop the queue silently.
- Scope retries to real connectivity changes where the platform provides them instead of tight polling loops.
- Keep a clear separation between optimistic local UI and committed server truth.
- Encrypt or avoid sensitive data at rest per policy; never log credentials, tokens, or private payloads.
- Provide a user-visible status and a manual retry so failures are not invisible.

## Verify and report
- Exercise offline start, queued writes, reconnect, conflict, and duplicate delivery with synthetic data.
- Confirm behavior across app restart and backgrounding where the environment allows.
- Separate verified runtime behavior from design assumptions; label untested paths explicitly.
- Report the owner/event-order model, tested scenarios, observed limits, and remaining risks.
