---
name: responsive-layout
description: Adapt existing UI layouts across narrow and wide viewports using native CSS, preserved interactions, and checks at real content boundaries.
---

# Responsive layout

## Inspect constraints
- Confirm target surfaces, supported devices, content, and requested behavior.
- Read repository instructions, design guidance, the relevant spec, and current scripts.
- Inspect existing containers, spacing tokens, breakpoints, and scroll ownership.
- Use available browser tools and existing test harnesses; disclose missing device coverage.
- Preserve unrelated edits and current state, navigation, and service owners.
- Update the corresponding spec before changing responsive interaction behavior.

## Make the smallest layout change
- Prefer CSS grid, flexbox, wrapping, and intrinsic sizing over viewport JavaScript.
- Reuse existing tokens and installed components; do not add a responsive framework.
- Choose breakpoints from content failure, not a guessed list of device brands.
- Allow long labels, paths, localization, and user text to wrap without hiding meaning.
- Check minimum sizes, flex shrink, intrinsic overflow, and safe-area spacing.
- Keep controls reachable by keyboard and sufficiently sized for touch.
- Preserve logical reading order; avoid visual reordering that breaks focus order.
- Keep input text readable under zoom and avoid forcing orientation or disabling scaling.
- Identify the intended scroll container and avoid competing nested scrolling.
- Preserve virtualization measurements and existing collapse or navigation handlers.
- If stateful behavior changes, diagram owner and event order without adding duplicate state.

## Exercise representative widths
- Check narrow, intermediate, and wide widths plus values around changed breakpoints.
- Exercise long content, empty states, errors, menus, and software-keyboard-sensitive inputs.
- Verify zoom, overflow, focus visibility, and access to primary and secondary actions.
- Use isolated data; obtain permission before irreversible actions or external writes.
- Add relevant interaction scenarios using current tooling when behavior changes.
- Run available project checks when permitted and report actual commands and outcomes.
- Report verified widths and platforms; emulation does not prove physical-device behavior.
