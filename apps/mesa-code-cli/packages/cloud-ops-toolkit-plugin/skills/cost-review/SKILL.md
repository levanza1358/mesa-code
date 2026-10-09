---
name: cost-review
description: Identify evidence-backed cloud and infrastructure cost reductions from declared configuration and usage data without making unreachable claims.
---

# Cost review

## Establish the baseline
- Confirm scope: which services, accounts, region, and billing period are in view.
- Read infrastructure-as-code, deployment manifests, and resource configuration in the repository.
- Distinguish configuration facts in the repo from usage and billing data that must be supplied.
- Do not invent a billing API, cost tool, or account access that is not actually available.
- Treat credentials and billing exports as sensitive; keep real account data out of examples and logs.

## Find savings candidates
- Identify idle, oversized, or duplicated resources visible in configuration.
- Check autoscaling and scheduling: fixed capacity where usage varies, or missing scale-to-zero for bursty work.
- Review storage classes, lifecycle rules, retention, and orphaned volumes or snapshots.
- Inspect data transfer paths, cross-region traffic, and caching opportunities for expensive egress.
- Examine reserved, committed-use, or savings-plan coverage for steady, predictable load.
- Assess observability and log retention cost: verbose debug logs and long retention are common overspend.
- Note container image size and pull frequency where registry or egress cost applies.
- For each candidate, state the mechanism of the saving and the risk of the change.

## Quantify and recommend
- Require a real input for any dollar figure; estimate ranges only when usage data is supplied.
- Rank candidates by impact and implementation risk, separating quick wins from structural changes.
- Flag every change that could affect availability, capacity, or data durability.
- Never claim an actual saving without observed billing or usage evidence.
- Report verified numbers, estimated ranges, assumptions, and the data still needed.
