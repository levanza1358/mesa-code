---
name: test-data-fixtures
description: Create deterministic, synthetic test fixtures and factories that stay isolated and reduce duplication across the existing suite.
---

# Test data fixtures

## Establish scope
- Confirm which tests need data, the required shapes, and the isolation boundary.
- Read repository instructions, the relevant spec, existing fixtures, and test helpers.
- Reuse existing factories and builders before introducing a parallel data path.
- Use only installed dependencies and the project's current fixture location.

## Build fixtures
- Generate synthetic data; never copy real user data, credentials, or secrets.
- Make values deterministic: fix or seed randomness, clocks, and identifiers.
- Give each test its own data so no test depends on another's writes or ordering.
- Keep fixtures minimal and named for the scenario they represent.
- Build a small factory or builder when several tests share the same shape.
- Preserve exact types, nullability, encodings, and boundary values the code expects.
- Include the relevant valid, empty, and edge cases without exhaustive noise.

## Use and clean up
- Prefer creating data through the same public interface the product uses where practical.
- Reset or tear down only the resources the test created.
- Avoid shared mutable state; do not delete pre-existing or user-owned data.
- Confirm fixtures actually exercise the intended branch rather than coincidentally passing.
- Report the fixture location, its contract, and any case left uncovered.
