---
name: seed-fixtures
description: Build deterministic seed and fixture data for databases and tests without overwriting user data or leaking real records.
---

# Seed fixtures

## Establish scope
- Confirm the target database, the data required, and the environments it may touch.
- Read repository instructions, the relevant spec, existing seeds, and fixtures.
- Update the corresponding spec before changing behavior; reuse existing seed tooling.
- Never seed production or shared data without explicit authorization.

## Build deterministic data
- Generate synthetic records; never copy real user data, credentials, or secrets.
- Make values reproducible: fix or seed randomness, clocks, and identifiers.
- Satisfy every constraint, foreign key, and required column the schema enforces.
- Keep the seed idempotent so repeated runs do not duplicate or corrupt rows.
- Scope the seed so it touches only the tables and rows it owns.
- Provide the minimum data each scenario needs, plus documented edge cases.
- Preserve existing rows and user data; never truncate unrelated tables.

## Verify and deliver
- Apply the seed to a disposable or local database and confirm the schema accepts it.
- Run a representative query or app flow that depends on the seeded data.
- Confirm re-running the seed leaves the dataset in the same state.
- Report the command run, the row counts created, and anything left unverified.
- Ask permission before seeding shared, staging, or external databases.
