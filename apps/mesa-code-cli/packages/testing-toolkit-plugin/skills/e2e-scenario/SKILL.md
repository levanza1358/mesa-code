---
name: e2e-scenario
description: Design end-to-end scenarios that exercise a real user journey through the project's existing harness and assert visible outcomes.
---

# E2E scenario

## Define the journey
- Confirm the user goal, acceptance criteria, entry point, and target platforms.
- Read repository instructions, the relevant spec, current scripts, and existing E2E tests.
- Update the corresponding spec before changing behavior; keep criteria honest.
- Discover the available E2E harness and load its guidance before driving any session.

## Model the flow
- Start from a documented state with synthetic data and a known viewport or environment.
- Use visible labels, roles, and stable existing selectors rather than coordinates or internals.
- Walk the full path: entry, input, transition, render, acknowledgement, and exit.
- Cover success, validation failure, disabled or busy states, and recovery where relevant.
- For async flows, diagram input, owner, transition, render, and ack order first.
- Wait for observable conditions with supported tooling; avoid arbitrary sleeps.
- Check re-entry and stale responses when they affect the requested behavior.

## Execute and record
- Isolate accounts, runtime data, and test-owned resources; preserve user data.
- Capture sanitized screenshots or traces only when they support a finding.
- Run the actual E2E command and relevant project checks when permitted.
- Record steps, expected and actual outcomes, environment, and reproducible failures.
- Separate automated checks, manual observations, baseline failures, and blocked paths.
- Do not claim desktop, mobile, or remote behavior passed unless that path ran.
