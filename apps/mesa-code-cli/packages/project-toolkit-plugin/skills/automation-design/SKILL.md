---
name: automation-design
description: Design safe automations around existing tools with explicit ownership, authorization, scheduling limits, and failure handling.
---

# Automation design

## Confirm the objective
- Identify trigger, inputs, desired outcome, execution environment, and approval owner.
- Inventory tools, native schedulers, and dependencies actually available in the project.
- Prefer existing commands and platform features over new runtime code or services.
- Do not invent tools, accounts, MCP services, or unsupported cloud execution.
- Reject secrets; reference approved secret storage without reading or embedding credentials.
- Separate design permission from permission to execute, schedule, or publish automation.

## Define the contract
- Specify input validation, output location, permissions, and the single state owner.
- Document event order: trigger, admission, work, validation, durable result, notification.
- Identify concurrency, duplicate-trigger, cancellation, and stale-run boundaries.
- Use idempotent operations where possible; describe retry limits and partial-failure recovery.
- Preserve source data, formulas, encoding, and user edits; avoid silent overwrites.
- Include a dry-run or preview when existing tools support it.
- Keep logs useful but free of secrets and private payloads.
- Define observable success, failure reporting, rollback, and stop conditions.

## Authorize execution
- Schedule only after explicit authorization for trigger, time zone, cadence, and scope.
- Confirm native scheduler availability and required privileges before proposing setup.
- Ask permission before publishing, deleting, deploying, committing, or destructive cleanup.
- Treat each externally visible or irreversible action as a separate approval boundary.
- Background work may use only supported existing tooling and approved commands.
- State whether work survives session closure, app exit, sleep, or restart based on evidence.
- Never claim always-on execution, cloud persistence, or notification delivery without support.
- Provide inspection and cancellation instructions that use actual available tools.

## Verify and deliver
- Test bounded sanitized inputs and failure cases only within authorized scope.
- Report actual checks separately from design assumptions and unavailable tooling.
- Return contract, owner/event order, approval gates, risks, and minimal next steps.
- Do not claim an automation is installed, scheduled, or running until verified.
