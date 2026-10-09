---
name: eval-harness
description: Build a reproducible evaluation harness with representative cases, deterministic scoring, and honest reporting of what was and was not measured.
---

# Eval harness

## Define the evaluation
- Confirm the behavior under test, the model or system version, and the decision the results must support.
- State the metric and the pass threshold before looking at outputs to avoid tuning to the result.
- Identify available runners, models, and dependencies; do not invent a scoring service or dataset.
- Keep fixtures synthetic and sanitized; never embed credentials or real user data.

## Build representative cases
- Assemble cases that cover the common path, boundary inputs, and known failure modes.
- Include the original defect case, when there is one, and a few cases that must still pass.
- Keep each case independent and deterministic so ordering does not change the result.
- Separate the dataset from the runner so cases can be extended without rewriting logic.
- Prefer a real parser or checker over string matching when scoring structured output.
- For model-based grading, fix the grader prompt and version and document its uncertainty.
- Record inputs, expected outputs, and the exact system configuration per run.

## Run and score
- Execute the full suite in one environment and capture raw outputs as evidence.
- Score mechanically where possible; keep human judgment explicit and separate.
- Report per-case results, aggregate metrics, and the exact command and version used.
- Repeat runs where output is nondeterministic and report variance rather than a single number.
- Separate a harness failure from a genuine regression before drawing conclusions.

## Report honestly
- Present pass rates with the sample size and the scope of what the cases represent.
- State clearly what the harness does not measure: coverage gaps, untested inputs, and environment limits.
- Never extrapolate a small suite into a general quality claim.
- Return the harness location, cases, scoring method, raw evidence, and the limitations.
