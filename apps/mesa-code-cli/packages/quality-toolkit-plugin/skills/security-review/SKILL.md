---
name: security-review
description: Review authorized code and isolated test environments defensively for evidence-backed security weaknesses without destructive testing or broad target scanning.
---

# Security review

## Confirm authorization
- Limit review to code and systems the user owns or is explicitly authorized to assess.
- Confirm target boundaries, permitted actions, and data handling before active checks.
- Use source review first; stop and ask if authorization or target scope is unclear.
- Do not perform mass-target scanning, credential harvesting, persistence, or destructive tests.
- Do not access unrelated tenants, accounts, personal data, or production secrets.
- Ask permission before active external probes, irreversible actions, or external data writes.
- Use isolated synthetic fixtures; do not exfiltrate data or bypass permission admission.

## Trace trust boundaries
- Read repository instructions, relevant security specs, contracts, and current scripts.
- Identify entry points, authentication, authorization, and authoritative state owners.
- Trace untrusted input into file paths, commands, queries, URLs, and rendered content.
- Check allowlists, canonicalization, escaping, size limits, and runtime validation.
- Verify tenant or workspace identity across caches, persistence, and request correlation.
- Inspect session expiry, secret handling, logging redaction, and error disclosure.
- Check dependency metadata with installed tools; do not download scanners automatically.
- For async flows, diagram admission, owner, side effects, and replay or stale-event guards.
- Separate confirmed reachable flaws from assumptions or dependency advisories.
- Validate suspected flaws with the smallest non-destructive local test when permitted.
- Redact sensitive evidence; include no working credentials or private service addresses.

## Recommend and verify defenses
- Report affected boundary, prerequisite, impact, evidence, and minimal mitigation.
- Prefer existing validation, native protections, and installed libraries over new machinery.
- Update the corresponding spec before implementing authorized behavior changes.
- Preserve compatibility and data; do not silently revoke, delete, or migrate accounts.
- Add focused defensive regression coverage and run actual available checks when permitted.
- Report real outcomes and untested risks; source review is not a penetration-test guarantee.
