---
name: accessible-ui
description: Build or audit accessible interfaces through native semantics, keyboard behavior, readable feedback, and evidence from existing UI and browser tools.
---

# Accessible UI

## Understand the surface
- Confirm the requested component, user task, supported platforms, and audit or edit scope.
- Read repository instructions, design guidance, localization patterns, and the relevant spec.
- Inspect existing components and current verification scripts before choosing tools.
- Use only available browser and accessibility capabilities; state missing facilities.
- Preserve unrelated edits and existing state ownership and service boundaries.
- Update the corresponding spec before changing interaction or product behavior.

## Prefer native semantics
- Use native buttons, links, inputs, labels, and landmarks before custom widgets.
- Reuse installed accessible components rather than adding another component library.
- Give controls meaningful accessible names and associate help and errors with inputs.
- Preserve heading order and logical reading and keyboard tab order.
- Support keyboard activation without trapping focus except inside intentional modal flows.
- On dialogs, verify initial focus, Escape behavior, focus containment, and return focus.
- Keep visible focus, disabled states, and selected states perceivable across themes.
- Check text and non-text contrast; never convey status by color alone.
- Support zoom, text resizing, reduced motion, and long localized labels.
- Expose async status and errors without flooding assistive technology announcements.
- For stateful changes, sketch owner and event order; avoid duplicate live status owners.

## Verify actual interaction
- Test the main task by keyboard and pointer using the existing harness when available.
- Inspect accessibility semantics with available tools and use screenshots for visual checks.
- Use isolated fixtures and ask permission before irreversible or external data writes.
- Add focused interaction coverage for changed behavior using current project tooling.
- Run relevant project checks when permitted and report their actual outcomes.
- Separate automated findings from manual checks and assistive-technology tests not performed.
- Report path, affected task, evidence, and smallest fix; source inspection alone is not runtime proof.
