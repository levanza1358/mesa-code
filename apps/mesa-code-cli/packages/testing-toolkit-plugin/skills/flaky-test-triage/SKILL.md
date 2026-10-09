---
name: flaky-test-triage
description: Diagnose intermittent test failures by finding the real nondeterminism instead of retrying, loosening, or deleting assertions.
---

# Flaky test triage

## Confirm the flake
- Capture the failing test, framework, exact command, and observed pass/fail pattern.
- Reproduce several runs of the targeted test before forming a theory.
- Distinguish a genuine flake from an environment, data, or baseline failure.
- Preserve unrelated edits and never widen timeouts or delete assertions to force green.

## Locate the nondeterminism
- Read the test, its fixtures, and the code under test before changing anything.
- Classify the source: timing, ordering, shared state, network, clock, randomness, or resource leaks.
- Check for unawaited async work, arbitrary sleeps, and assertions on eventual state.
- Look for test interdependence, leaked global state, and reused accounts or databases.
- For async flows, identify owners and event order to expose missing synchronization.
- Fix by making the test await an observable condition, not by adding delay.

## Verify the fix
- Control time, randomness, or seeds with existing facilities where the project supports it.
- Prove stability with repeated runs under the same conditions, not a single pass.
- Confirm the fix addresses the cause rather than masking it.
- Keep test data synthetic and isolated; restore test-owned resources.
- Report the confirmed cause, the fix basis, and any runs that were not exercised.
