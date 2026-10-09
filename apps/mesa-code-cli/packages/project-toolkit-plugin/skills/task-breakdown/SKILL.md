---
name: task-breakdown
description: Turn a scoped goal into actionable tasks with owners, dependencies, acceptance criteria, and explicit unknowns.
---

# Task breakdown

## Understand the goal
- Confirm desired outcome, constraints, deadline, and boundaries of the request.
- Read the relevant specification, current project structure, and existing work items.
- Identify the actual state owner and interfaces before splitting implementation work.
- Reject secrets and use sanitized examples instead of private operational data.
- Use available tools and current project conventions; do not invent integrations.

## Break down the work
- Define success in observable acceptance criteria, not broad activity labels.
- Split work into small deliverables that can be independently reviewed.
- Give each task a concrete action, output, proposed owner, and completion check.
- Mark proposed owners as unassigned until an authorized person accepts responsibility.
- Identify prerequisites, blocking decisions, and true dependencies.
- Distinguish required work from optional improvements and out-of-scope items.
- Include migration, security, accessibility, rollback, and verification where relevant.
- Keep state and write ownership explicit; avoid tasks that create competing owners.
- Show event order when tasks cross asynchronous or remote boundaries.
- Preserve existing user plans, document encoding, data, and formulas.
- Do not erase completed work or replace estimates without explaining the change.

## Estimate and sequence
- Use ranges and assumptions rather than unsupported precise commitments.
- Label unknowns and propose bounded investigations only when they block progress.
- Sequence by dependency and risk; parallelize only independent work.
- Prefer native features, standard libraries, and installed dependencies before new code.
- Do not assume cloud workers or background persistence beyond available tooling.
- Planning does not authorize task execution, scheduling, or external notifications.

## Deliver
- Return ordered tasks, dependencies, acceptance checks, risks, and open decisions.
- State what evidence informed the breakdown and what remains unverified.
- Ask permission before publishing, deleting, deploying, committing, or overwriting work.
- Do not claim tasks are scheduled, assigned, or completed merely because they are listed.
