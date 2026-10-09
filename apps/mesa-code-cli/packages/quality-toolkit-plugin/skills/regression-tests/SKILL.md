---
name: regression-tests
description: Add focused regression coverage for a known behavior or bug using the project's existing tests, fixtures, and verification scripts.
---

# Regression tests

## Define the regression
- Confirm expected behavior, the failing case, and the responsible boundary.
- Read repository instructions, the relevant spec, current scripts, and nearby tests.
- Update the corresponding spec before introducing or changing behavior.
- Use only available tools and existing test entry points; do not invent a suite command.
- Preserve unrelated edits and keep test data synthetic and isolated.
- Ask permission before irreversible operations or test writes to external systems.

## Build the smallest useful check
- Reproduce the original failure before asserting a fix is covered.
- Test observable behavior through the existing public interface where practical.
- Put the check at the lowest layer that faithfully exercises the defect.
- Add an interaction scenario when keyboard, pointer, focus, or navigation behavior changes.
- Cover the relevant valid path, failure path, and boundary input without exhaustive noise.
- For async behavior, identify owners and event order before writing assertions.
- Control time or await observable state with existing facilities; avoid arbitrary sleeps.
- Exercise duplicate, stale, or reordered events when they are part of the defect.
- Assert meaningful output and side effects, not private implementation structure.
- Reuse fixtures and installed dependencies; prefer a small native assertion check otherwise.
- Restore test-owned resources and avoid deleting any pre-existing user data.
- Do not remove failing assertions or inflate timeouts merely to obtain a green run.

## Verify and report
- Show that the check fails for the original cause when safe and feasible.
- Run the targeted test using the package's actual command and supported runtime.
- Run available required repository checks when permitted and report real outcomes.
- Separate new failures from known baseline failures and environmental blockers.
- Report coverage, commands, results, and important paths not exercised.
- A written test is not a passing test; explicitly label checks that were not run.
