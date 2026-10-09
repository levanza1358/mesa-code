---
name: mobile-layout
description: Build or audit mobile layouts that respect safe areas, touch targets, orientation, and platform-native conventions using existing UI code and tools.
---

# Mobile layout

## Understand the surface
- Confirm target platforms (iOS, Android, web), device classes, orientation support, and the screen or flow in scope.
- Read repository instructions, design guidance, and the relevant spec before changing layout or interaction.
- Inspect existing components, breakpoints, and layout primitives; reuse them instead of adding a new grid or UI library.
- Use only available rendering and preview tooling; state when no device or emulator preview is available.
- Preserve unrelated edits and existing state ownership. Update the spec before changing interaction behavior.

## Respect device constraints
- Apply safe-area insets for notches, home indicators, and system bars on every edge that a fixed element touches.
- Size touch targets for a comfortable minimum and keep spacing that prevents accidental adjacent taps.
- Handle portrait and landscape, and a resized or split view, without clipped or overlapping controls.
- Account for on-screen keyboards: keep focused inputs visible and confirm the layout does not cover the active field.
- Let long localized text wrap or truncate deliberately; avoid fixed widths that break at larger font settings.
- Support dynamic type or font scaling and reduced-motion preferences rather than hard-coding sizes.
- Choose navigation and back behavior that matches platform conventions instead of forcing one model across platforms.
- Prefer native scrolling and momentum; avoid nested scroll containers that trap gestures.
- Keep tap, long-press, and swipe affordances discoverable and never the only way to reach a function.

## Verify actual behavior
- Exercise the main task by touch using the available preview or browser tooling when present.
- Check both orientations, text scaling, and at least one small screen; capture evidence for each.
- Confirm focus, keyboard, and pointer fallbacks for platforms that also support them.
- Run relevant project checks when permitted and report their actual outcomes.
- Separate observed runtime behavior from source-only inspection; source reading is not device proof.
- Report the device or viewport tested, the affected flow, evidence, and the smallest fix.
