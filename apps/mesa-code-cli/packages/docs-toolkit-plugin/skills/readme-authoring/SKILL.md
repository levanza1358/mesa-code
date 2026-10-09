---
name: readme-authoring
description: Write or revise a project README that reflects the repository's actual capabilities, setup, and commands without overstating them.
---

# README authoring

## Establish truth
- Confirm audience, purpose, and the entry the README must serve first.
- Read the current README, package scripts, config, and entry files before writing.
- Follow repository documentation conventions and the project's writing guidelines.
- Update the corresponding spec before adding or changing documented behavior.
- Preserve existing user edits and unrelated sections.

## Draft accurately
- Open with what the project does, who it is for, and why it exists.
- Document only capabilities, commands, and files the repository actually provides.
- Use the real install, build, run, and test commands from current scripts.
- Show a minimal working example that matches the checked-out source.
- State prerequisites, supported platforms, and environment requirements plainly.
- Link to deeper docs instead of duplicating volatile detail.
- Keep language and commands consistent with the rest of the repository.
- Avoid marketing claims, invented features, and unverified performance numbers.

## Verify and deliver
- Run each documented command when feasible and report the real result.
- Confirm every file path, script name, and link resolves.
- Note anything documented from intent rather than execution.
- Report steps that could not be run and the environment that blocked them.
- Ask permission before publishing, deploying, or committing the change.
