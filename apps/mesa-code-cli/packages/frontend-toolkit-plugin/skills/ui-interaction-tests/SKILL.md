---
name: ui-interaction-tests
description: Test real UI user journeys with existing browser capabilities and project harnesses, asserting visible outcomes, focus, and safe state transitions.
---

# UI interaction tests

## Plan a bounded journey
- Confirm the user task, acceptance criteria, target platforms, and permitted actions.
- Read repository instructions, the relevant spec, current scripts, and existing UI tests.
- Update the corresponding spec before changing behavior; do not rewrite criteria to pass.
- Discover available browser capabilities and load their guidance before controlling pages.
- Use the existing harness and installed dependencies; do not assume a browser tool exists.
- Preserve unrelated edits and isolate accounts, runtime data, and test-owned resources.
- Ask permission before launching unsafe targets, irreversible actions, or external writes.

## Exercise user-visible behavior
- Start from a documented state with synthetic data and a known viewport.
- Use visible labels, roles, and stable existing selectors rather than layout coordinates.
- Exercise keyboard and pointer paths, including focus movement and return focus.
- Cover success, validation failure, disabled or busy states, and recovery where relevant.
- Check narrow layout, long labels, and supported themes for changed surfaces.
- Assert visible outcomes and public effects, not hidden implementation details alone.
- For async flows, diagram input, owner, transition, render, and acknowledgement order.
- Wait for meaningful observable conditions with supported tooling; avoid arbitrary sleeps.
- Check repeated activation and stale responses when they affect the requested behavior.
- Do not submit live payments, messages, deployment actions, or destructive forms unapproved.
- Capture sanitized screenshots or traces with available tools when they support findings.

## Leave reliable evidence
- Add or adjust focused scenarios in the existing test location when edits are requested.
- Clean up only resources created by the test; never delete pre-existing user data.
- Run the actual interaction command and relevant project checks when permitted.
- Record steps, expected and actual outcomes, environment, and reproducible failures.
- Separate automated checks, manual observations, baseline failures, and blocked scenarios.
- Do not claim desktop, mobile, or remote behavior passed unless that path was exercised.
