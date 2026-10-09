---
name: test-plan
description: Turn a change or feature into a risk-ordered test plan tied to the repository's existing entry points and coverage.
---

# Test plan

## Establish scope
- Confirm the change, acceptance criteria, affected surfaces, and target platforms.
- Read repository instructions, the relevant spec, current scripts, and nearby tests.
- Update the corresponding spec before changing behavior; never rewrite criteria to pass.
- Discover the project's real test entry points from its current package scripts and files.

## Map risks to checks
- List behaviors that could break, ranked by user impact and likelihood.
- Name the layer that faithfully exercises each risk: unit, integration, or end-to-end.
- Tie each check to an observable outcome and a concrete artifact or command.
- Cover the happy path, key failure paths, boundaries, and recovery where behavior changes.
- For async or stateful flows, state the owner and event order before choosing checks.
- Reuse existing fixtures, harnesses, and installed dependencies; do not invent a runner.
- Mark what current coverage already tests and what is genuinely new.

## Verify and report
- Order the plan so the highest-risk, lowest-cost checks run first.
- State which checks must gate a release versus supply supporting evidence.
- Report any inaccessible environment that blocks a planned check.
- Ask permission before destructive or external test actions and irreversible fixtures.
- Deliver the plan with commands, expected results, and explicit gaps left untested.
