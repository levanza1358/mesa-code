---
name: observability-setup
description: Design metrics, structured logs, traces, and alerts for a service using the telemetry tooling the project already declares, without inventing backends.
---

# Observability setup

## Establish the surface
- Confirm the service, critical user journeys, failure modes, and who responds to alerts.
- Read repository logging conventions, existing instrumentation, and the telemetry dependencies actually declared.
- Identify the metrics and logging facilities already present; do not assume a tracing backend or agent is installed.
- Keep sensitive fields, credentials, and personal data out of all telemetry.

## Design signals
- Choose the golden signals per service: latency, traffic, errors, and saturation.
- Emit structured logs with stable fields and levels; use debug for high-frequency detail and reserve error for real failures.
- Keep one owner per signal so the same event is not counted twice under different names.
- Name metrics with consistent units, dimensions, and cardinality that will not explode over time.
- Add trace context across service boundaries where the stack supports it, and propagate correlation IDs.
- Record the event order from request entry to durable result so traces and logs line up.
- Define alerts on user-visible symptoms with a threshold, duration, severity, and a documented runbook link.
- Avoid alerting on causes that fire constantly or on data that no responder can act upon.
- Document retention, sampling, and aggregation so cost and query behavior are predictable.

## Verify and report
- Confirm instrumentation compiles and emits under a local or test run where the environment allows.
- Check that a representative request produces the expected log, metric, or span with correct fields.
- State clearly when no collector, dashboard, or backend was reachable to receive the signals.
- Report the signals added, owners, alert rules, evidence, and anything not yet verified.
