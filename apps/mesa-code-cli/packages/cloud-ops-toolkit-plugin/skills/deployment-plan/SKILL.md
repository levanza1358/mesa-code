---
name: deployment-plan
description: Plan an authorized, reversible deployment with explicit ownership, ordering, health gates, and rollback using only tools the project already provides.
---

# Deployment plan

## Establish the target
- Confirm the service, environment, target platform, artifact version, and the approval owner.
- Read repository instructions, CI configuration, deployment manifests, and the relevant spec.
- Identify which deployment commands and platform tools actually exist; do not assume a cloud CLI is installed.
- Verify credentials are available through approved references, never read them into logs or the plan.
- Separate authority to plan from authority to execute, promote, or delete.

## Define the rollout
- Record event order: build, artifact publish, migrate, deploy, health check, shift traffic, notify.
- Make each step idempotent where possible and safe to rerun after partial failure.
- Sequence database or schema migrations so they are backward compatible during the rollout.
- Specify health and readiness checks that gate progression, with concrete thresholds.
- Choose a strategy (rolling, blue/green, canary) and state its blast radius and cost.
- Define rollback or halt: the exact trigger, the reversing command, and who decides.
- Preserve existing user data; never run destructive migrations or deletes without explicit authorization.
- Keep environment differences (region, scale, secrets source) explicit rather than assumed.

## Execute and verify under authorization
- Run only the steps the user has explicitly authorized, one gated step at a time.
- Capture real command output as evidence; never describe an unrun deploy as successful.
- Confirm the deployed version and health from observable signals, not configuration alone.
- State honestly when no environment, cluster, or account was reachable.
- Report the plan, executed steps, evidence, rollback status, and remaining risks.
