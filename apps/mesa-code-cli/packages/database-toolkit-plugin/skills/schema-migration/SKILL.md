---
name: schema-migration
description: Author safe, reversible schema migrations that preserve existing data and apply idempotently with the project's migration tool.
---

# Schema migration

## Establish scope
- Confirm the target engine, migration tool, version, and the schema change required.
- Read repository instructions, the relevant spec, existing migrations, and model definitions.
- Update the corresponding spec before changing behavior; keep the model and schema aligned.
- Back up or snapshot affected data before any destructive change, with permission.
- Never run migrations against production or shared data without explicit authorization.

## Write a safe migration
- Generate the migration through the project's existing tool rather than hand-editing state.
- Keep each migration focused and ordered; do not edit an already-applied migration.
- Prefer additive steps and backfill before dropping or renaming columns.
- Make destructive or data-transform steps idempotent where the tool allows.
- Provide both up and down paths, or document why a rollback is impossible.
- Consider locks, long-running backfills, and default-value rewrites on large tables.
- Preserve existing rows, constraints, indexes, and user data; never silently discard data.
- Match naming, key types, and conventions used by existing migrations.

## Verify and deliver
- Apply the migration to a disposable or local database and confirm the schema matches intent.
- Test the rollback path when feasible and verify data survived the round trip.
- Report the engine version, command run, and any step skipped or unverified.
- State clearly when a migration was not executed against a realistic dataset.
- Ask permission before applying, deploying, or committing the change.
