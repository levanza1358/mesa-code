---
name: debug-root-cause
description: Diagnose a reproducible failure by tracing source, sanitized logs, and runtime evidence before proposing the smallest verified fix.
---

# Debug root cause

## Bound the investigation
- Record expected behavior, actual behavior, affected inputs, and environment.
- Read repository instructions, the relevant spec, and current package scripts.
- Preserve unrelated edits; do not reset the workspace to obtain a clean reproduction.
- Discover available diagnostic tools; do not promise unavailable debuggers or services.
- Use synthetic inputs and isolated runtime data instead of secrets or live user data.
- Ask permission before production probes, irreversible actions, or external data writes.

## Establish evidence
- Find the smallest safe reproduction and record exact steps and observed output.
- Run an existing relevant check when available; distinguish baseline failures.
- Trace the failing input through validation, dispatch, state ownership, and output.
- Compare successful and failing paths before adding instrumentation.
- Read sanitized logs and error boundaries; never print credentials or private payloads.
- For async failures, diagram event order, owner, identity, and stale-result handling.
- Form a specific hypothesis with a prediction that can be disproved.
- Change one diagnostic variable at a time and record whether the prediction holds.
- Use existing logging and native diagnostics before adding dependencies.
- Do not conceal ordering bugs with sleeps, retries, or broad exception swallowing.

## Fix only when requested
- Separate the confirmed cause from plausible but untested explanations.
- Update the corresponding spec before changing behavior; align on design flaws first.
- Add a focused regression check that fails on the original cause.
- Make the smallest fix at the owning boundary, preserving compatibility and user data.
- Write an English cause comment explaining why the fix addresses the evidence.
- Run the actual targeted verification and required repository checks when permitted.
- Report commands, real outcomes, baseline failures, and anything not executed.
- If blocked, provide the evidence and next discriminating check instead of claiming success.
