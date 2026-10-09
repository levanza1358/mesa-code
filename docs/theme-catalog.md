# Mesa Code Theme Catalog

**Status:** active reference  
**Owner:** UI Appearance maintainers  
**Authority:** theme and accent vocabulary  
**Scope:** selectable themes, surfaces, and persisted appearance compatibility  
**Updated:** 2026-10-09 16:31 (local time)

Read this document for theme vocabulary. Read [`specs/quiet-studio.md`](specs/quiet-studio.md) for product acceptance and [`../DESIGN.md`](../DESIGN.md) for UI usage rules.

## Behavior

- Theme preference persists under the `mesa-code-theme` key.
- All ten themes are selectable in the Appearance settings.
- The default accent is jade (green-tinted); users can independently choose any of the six accents.
- Each theme controls surface mode and surface tokens through semantic CSS variables.
- Theme changes apply immediately and remain compatible with existing `Theme` consumers.
- Accent selection is independent of theme. The accent picker is a separate control.

## Catalog

| Theme | Surface | Base | Selectable in UI |
| --- | --- | --- | --- |
| System | OS light/dark | Follows OS | Yes |
| Zai Light | Warm paper (green-tinted light) | Light | Yes |
| Zai Dark | Studio green (green-tinted dark) | Dark | Yes |
| Black | True black with green-tinted steps | Dark | Yes |
| Midnight | Indigo-tinted dark | Dark | Yes |
| Ocean | Cyan-tinted dark | Dark | Yes |
| Forest | Green-tinted dark | Dark | Yes |
| Purple | Violet-tinted dark | Dark | Yes |
| Rose | Rose-tinted dark | Dark | Yes |
| Amber | Amber-tinted dark | Dark | Yes |

Each catalogue theme (Midnight through Amber) provides a full surface token set:
background, sidebar, panel, surface, card, popover, input, border, foreground,
terminal, toast, tooltip, tag, semantic status, diff, and git colors.
They do not merely inherit from the `dark` base.

## Acceptance

- Selecting any catalog entry updates the document theme class.
- Reload restores selected entry.
- System follows OS light/dark preference.
- The default accent is jade; accent selection is independent of theme.
- Existing light/dark code preview behavior continues using resolved light/dark mode.
- Legacy theme values stored in persistence (`light`, `dark`, removed names) normalize gracefully.

## Compatibility

The persisted key is `mesa-code-theme`. Internal package names, environment variables, protocol schemes, and storage paths are not renamed by theme work.
