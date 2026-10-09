---
name: incident-summary
description: Summarize incidents with a source-backed timeline, confirmed impact, causal confidence, and actionable follow-up.
---

# Incident summary

## Establish scope
- Confirm incident identifier, audience, reporting period, and approved evidence sources.
- Read available logs, reports, changes, and operator notes within authorized scope.
- Reject secrets; request sanitized evidence and exclude credentials from quotations.
- Keep personal data and internal addresses out of broadly shared summaries.
- Use available tools; do not invent monitoring access or external incident integrations.

## Reconstruct the timeline
- Record each event with timestamp, time zone, evidence source, and observed action.
- Distinguish event time from ingestion or report time; disclose clock uncertainty.
- Separate detection, impact onset, mitigation, recovery, and verification.
- Attribute observations to sources rather than assuming missing logs prove no event occurred.
- Preserve original evidence, encoding, user notes, source data, and formulas.
- Do not delete logs, restart services, or alter systems as part of summarization.

## Explain impact and causes
- State affected users, systems, duration, and measurement basis where known.
- Separate confirmed cause, contributing factors, hypotheses, and unresolved questions.
- Tie causal claims to evidence; avoid blaming individuals or inventing certainty.
- Describe mitigations actually performed and distinguish proposed actions.
- Verify recovery claims against observed checks rather than a single optimistic message.
- Include data loss, security exposure, and communication status only when supported.
- Use bounded sanitized excerpts instead of copying entire sensitive logs.

## Define follow-up and deliver
- Propose actions with rationale, suggested owner, priority, and measurable completion check.
- Mark owners and deadlines as proposed until confirmed.
- Include prevention, detection, recovery, and documentation actions where warranted.
- Ask permission before publishing, deleting, deploying, committing, or overwriting records.
- Return executive summary, timeline, evidence, causal confidence, and open questions.
- State evidence gaps and checks not performed.
- Summary completion does not authorize remediation, scheduling, or external notification.
