---
name: performance-profile
description: Locate a measured performance bottleneck using reproducible workloads and existing diagnostics before making a minimal, verified optimization.
---

# Performance profile

## Define a measurable problem
- Confirm the slow operation, representative workload, environment, and target metric.
- Read repository instructions, relevant specs, current scripts, and existing benchmarks.
- Discover available native diagnostics and installed profiling tools; disclose omissions.
- Do not install tooling or enable remote services merely because profiling was requested.
- Preserve unrelated edits and use synthetic data in an isolated environment.
- Ask permission before load on external systems, irreversible actions, or external writes.

## Establish a baseline
- Record runtime version, configuration, input size, and warm or cold execution state.
- Measure repeated samples and report spread, not only the best observed run.
- Separate startup, network, CPU, allocation, rendering, and storage costs when possible.
- Capture a trace or counters with existing tools and tie hotspots to source locations.
- Keep logs and captures free of credentials and real user payloads.
- Avoid debug instrumentation that materially changes the workload being measured.
- Distinguish observed bottlenecks from guesses and noisy measurements.
- Inspect ownership and invalidation before proposing caching or duplicated state.
- For async changes, diagram event order, cancellation, and stale-result protection.

## Optimize only the confirmed cost
- Ask whether work can be removed before adding parallelism, caching, or abstractions.
- Prefer standard library, native platform, and already-installed dependency features.
- Update the corresponding spec before changing observable behavior.
- Preserve validation, accessibility, compatibility, and data integrity under load.
- Make one bounded change and rerun the same workload under comparable conditions.
- Run relevant correctness checks and current project verification when permitted.
- Report before and after metrics, sample conditions, tradeoffs, and actual check results.
- If measurement is unavailable, provide a profiling plan and label optimization claims unverified.
