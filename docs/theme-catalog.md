# Mesa Code Theme Catalog

**Status:** active reference  
**Owner:** UI Appearance maintainers  
**Authority:** theme and accent vocabulary  
**Scope:** selectable themes, surfaces, and persisted appearance compatibility  
**Updated:** 2026-10-12 10:09 (local time)  
**Verification:** source implemented; Liquid running-app visuals unverified

Read this document for source-backed theme vocabulary. Read [`specs/quiet-studio.md`](specs/quiet-studio.md), [`specs/liquid-theme.md`](specs/liquid-theme.md), and [`specs/accent-picker.md`](specs/accent-picker.md) for product contracts, [`../DESIGN.md`](../DESIGN.md) for UI usage rules, and [`verification-log.md`](verification-log.md) for dated evidence. Selection, persistence, and visual acceptance below are not a runtime completion report.

## Behavior

- Theme preference persists under the `mesa-code-theme` key.
- All eleven themes are selectable in the Appearance settings.
- The source default theme is `zai-dark`. System is selectable, not the default.
- The default accent is jade (green-tinted); the six independent accents are jade, sky, violet, rose, amber, and coral.
- Each theme controls surface mode and surface tokens through semantic CSS variables.
- Theme changes apply immediately and remain compatible with existing `Theme` consumers.
- Accent selection is independent of theme. The accent picker is a separate control.

## Catalog

| Theme     | Surface                            | Base       | Selectable in UI |
| --------- | ---------------------------------- | ---------- | ---------------- |
| System    | OS light/dark                      | Follows OS | Yes              |
| Zai Light | Warm paper (green-tinted light)    | Light      | Yes              |
| Zai Dark  | Studio green (green-tinted dark)   | Dark       | Yes              |
| Black     | True black with green-tinted steps | Dark       | Yes              |
| Midnight  | Indigo-tinted dark                 | Dark       | Yes              |
| Ocean     | Cyan-tinted dark                   | Dark       | Yes              |
| Forest    | Green-tinted dark                  | Dark       | Yes              |
| Purple    | Violet-tinted dark                 | Dark       | Yes              |
| Rose      | Rose-tinted dark                   | Dark       | Yes              |
| Amber     | Amber-tinted dark                  | Dark       | Yes              |
| Liquid    | Frosted translucent dark           | Dark       | Yes              |

Each catalogue theme (Midnight through Liquid) provides a full surface token set:
background, sidebar, panel, surface, card, popover, input, border, foreground,
terminal, toast, tooltip, tag, semantic status, diff, and git colors.
They do not merely inherit from the `dark` base.

## Liquid glass

Liquid is the opt-in theme with translucent background-family tokens. Source uses
`color-mix(in oklab, <color> <amount>, transparent)`, driven by `--liquid-opacity`.
At the default transparency of 55, base surfaces use 45% colour; elevated surfaces
and borders add bounded offsets. The transparency slider drives only the
background-family tokens; text colour tokens are set independently, and some of
them (such as `--color-foreground-subtlest`) are themselves defined with partial
transparency for both Liquid and the other themes. This is the intended layering
mechanism, not measured running-app contrast or proof that every platform renders
the same material.

- **macOS source** configures `vibrancy: "under-window"` with a transparent window background.
- **Windows source** configures `backgroundMaterial: "acrylic"` beneath translucent surfaces.
  These are existing window options, not a new theme-owned native-state writer; actual material
  rendering depends on the OS/compositor and remains visually unverified in the running app.
- **Web** has no window material, so `html.theme-liquid[data-mesa-code-web]` paints a
  colorful ambient backdrop (layered radial glows over a deep base). The translucent
  shell tints it and floating overlays frost it directly with `backdrop-filter`, so the
  glass refracts something varied instead of a flat white canvas. In-flow shell regions
  are not blurred individually (neighbouring columns never overlap); the `backdrop-filter`
  blur applies only to floating overlays and the mobile web sidebar drawer.
- **Linux** keeps its transparent window, so Liquid there is translucent surfaces over the
  window base.
- Renderer `backdrop-filter` (blur + saturation) plus a hairline top highlight is applied
  only to surfaces that stack over other content — floating overlays (menus, popovers,
  dialogs, tooltips) and the mobile web sidebar drawer. In-flow shell regions are not
  blurred individually: neighbouring columns never overlap, and the window-level frost is
  the native material showing through the translucent tokens. Blur strength lives in
  `--mesa-code-glass-blur` / `--mesa-code-glass-saturate`.
- **Transparency is user-adjustable in source.** While Liquid is active, Appearance shows a
  "Glass transparency" slider (0–100; default 55). It persists under
  `mesa-code-liquid-transparency` and broadcasts through the guarded appearance path.
  `--liquid-opacity` is `100 - transparency` percent: base surfaces range from opaque to
  transparent, while elevated surfaces/borders retain their configured offsets. Opaque text
  and semantic colors do not become transparent. The live slider effect still needs an app check.

Liquid adds no animation and is opt-in, not the default theme.

Source owners are `packages/ui/src/useTheme.ts`, `store/appearanceState.ts`,
`lib/liquidTransparency.ts`, `accent.ts`, `styles.css`, and `quiet-studio.css`;
native material options live in `packages/desktop/src/main/desktopWindowChrome.ts`.
The ledger's 2026-10-11 13:32 entry records focused tests and a Chromium token-stack
render check, explicitly not the running app's native materials or live slider.

## Acceptance (required, not proof of completion)

- Selecting any catalog entry updates the document theme class.
- Reload restores selected entry.
- System follows OS light/dark preference.
- The default accent is jade; accent selection is independent of theme.
- Existing light/dark code preview behavior continues using resolved light/dark mode.
- Legacy `light` and `dark` values normalize to `zai-light` and `zai-dark`; valid catalog names remain distinct. Unknown persisted values require the existing validation/fallback path, not a blanket claim that the normalizer migrates every removed name.

## Compatibility

The persisted key is `mesa-code-theme`. Internal package names, environment variables, protocol schemes, and storage paths are not renamed by theme work.
