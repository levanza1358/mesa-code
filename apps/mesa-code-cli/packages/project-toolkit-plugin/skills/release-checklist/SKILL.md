---
name: release-checklist
description: Prepare evidence-backed release readiness checklists using current project scripts and explicit approval gates.
---

# Release checklist

## Identify the release
- Confirm version, target platforms, release scope, environment, and approval owner.
- Read current package scripts, CI configuration, release policy, and change history.
- Use actual repository commands rather than assuming a universal test or build command.
- Reject signing keys, tokens, passwords, and other secrets in documents or logs.
- Use existing tools and dependencies; do not invent publishing or deployment services.

## Define readiness gates
- List required checks with command, environment, evidence, and responsible owner.
- Cover relevant tests, type checks, lint, packaging, migrations, and compatibility.
- Include accessibility, security, dependency/license review, and documentation as appropriate.
- Verify artifact identity, version, target architecture, and expected bundled resources.
- Distinguish source checks, staging checks, installer builds, and installed runtime checks.
- Preserve existing user edits, artifacts, file encoding, source data, and workbook formulas.
- Do not change versions, regenerate files, or overwrite artifacts without scope approval.
- Record rollback plan, migration reversibility, and known limitations.

## Gather evidence
- Run only authorized checks using available commands in the intended environment.
- Mark each gate passed, failed, blocked, or not run with current evidence.
- Never convert an existing failure or skipped check into a pass.
- Avoid exposing real user data or internal credentials in release evidence.
- Confirm signing or deployment results on actual artifacts, not configuration alone.
- Do not install or launch into shared user data without confirmed isolation.
- Checklist preparation does not authorize publishing, deleting, deploying, or committing.
- Obtain explicit permission for those actions and for destructive cleanup.

## Deliver the decision support
- Return checklist status, evidence paths, blockers, risks, and required approvals.
- Separate release readiness recommendation from approval to release.
- State unavailable tooling and verification still required.
- Do not promise successful rollout or unsupported cloud execution.
