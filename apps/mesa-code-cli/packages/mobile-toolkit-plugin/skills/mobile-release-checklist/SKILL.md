---
name: mobile-release-checklist
description: Prepare evidence-backed mobile release readiness covering versioning, signing, store metadata, and per-platform gates without performing unauthorized uploads.
---

# Mobile release checklist

## Identify the release
- Confirm app version, build number, target platforms, store channels, and the approval owner.
- Read current build scripts, CI configuration, signing setup, and store metadata in the repository.
- Use actual project commands rather than assuming a universal build or submit command.
- Reject signing keys, provisioning profiles, tokens, and passwords in documents, logs, or examples.
- Use existing tools and dependencies; do not invent a store API or an unsupported build service.

## Define readiness gates
- List each gate with command, environment, evidence, and responsible owner.
- Cover version/build increments, code signing and provisioning, and release build configuration.
- Verify icons, splash assets, permission purpose strings, and privacy disclosures match actual behavior.
- Check store metadata: title, description, screenshots, age rating, and data-safety or privacy answers.
- Confirm the target SDK or API level meets current store requirements.
- Include a staged or beta rollout plan and a rollback or halt path.
- Distinguish local builds, signed artifacts, store-console uploads, and post-release verification.
- Record known limitations and any check that cannot run in the current environment.

## Gather evidence
- Run only authorized checks and mark each gate passed, failed, blocked, or not run with current evidence.
- Never convert an existing failure or skipped check into a pass.
- Keep real user data and credentials out of build logs and release evidence.
- Confirm signing and artifact identity on the actual artifact, not on configuration alone.
- Store uploads, publishing, and release submission require explicit separate authorization.
- Do not promise store approval, review timing, or successful rollout.

## Deliver the decision support
- Return checklist status, evidence paths, blockers, risks, and required approvals.
- Separate release readiness from approval to upload or publish.
- State unavailable tooling and verification still required before submission.
