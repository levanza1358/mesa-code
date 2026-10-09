---
name: theme-audit
description: Audit theme tokens, contrast, interactive states, and preference synchronization against the application's actual supported theme catalog.
---

# Theme audit

## Identify the real catalog
- Read repository instructions, design guidance, the relevant spec, and current scripts.
- Find current theme definitions, semantic tokens, and supported accent selections.
- Identify the existing preference owner, persistence keys, and broadcast interfaces.
- Confirm whether the request is an audit or authorizes changes.
- Preserve unrelated edits and stable storage identifiers; never reset user preferences.
- Use available browser and source tools; do not invent a contrast or screenshot service.

## Trace tokens and state
- Inspect surfaces, text, borders, focus indicators, inputs, overlays, and code content.
- Flag hard-coded colors where they bypass existing semantic tokens.
- Check contrast with an available method and record colors and measurement basis.
- Verify hover, pressed, selected, disabled, error, and focus states across supported modes.
- Keep meaning distinguishable without color alone and respect reduced-motion preferences.
- Check system-theme behavior without confusing it with a stored explicit choice.
- Diagram preference action, single owner, persistence, broadcast, and derived rendering order.
- Verify feedback-loop guards and stale updates using existing interfaces.
- Keep accent, density, code theme, and platform preferences independently owned as designed.
- Preserve valid saved selections and existing idempotent migration adapters.

## Verify and recommend
- Exercise supported themes on representative screens using isolated test preferences.
- Check reload persistence and cross-window behavior only when the environment permits it.
- Use native CSS and existing tokens or installed components for the smallest fix.
- Update the corresponding spec before changing behavior or preference semantics.
- Obtain permission before irreversible actions or writes to external systems.
- Add focused interaction coverage for changed preferences using current tooling.
- Run available project checks when permitted; report real outcomes and baseline failures.
- Distinguish source audit, rendered checks, and synchronization paths not exercised.
