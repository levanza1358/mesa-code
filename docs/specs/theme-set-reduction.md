# Theme Set Reduction

Status: **Superseded** — all ten themes are now selectable.

## History

This spec originally reduced the theme set to three: Dark, Black, and Light.
The six catalogue themes (midnight, ocean, forest, purple, rose, amber) were
removed because they only recolored the accent without defining their own surfaces.

## Current state

The catalogue themes have been restored with **full surface token sets** — each
theme now defines its own background, sidebar, panel, surface, card, popover,
input, border, foreground, terminal, toast, tooltip, tag, semantic status, diff,
and git colors. They are no longer accent-only swaps.

All ten themes are selectable in the Appearance settings:

| Theme | Presented as | Resolves to |
| --- | --- | --- |
| `system` | System | OS light/dark |
| `zai-light` | Light | light |
| `zai-dark` | Dark | dark |
| `black` | Black | dark |
| `midnight` | Midnight | dark |
| `ocean` | Ocean | dark |
| `forest` | Forest | dark |
| `purple` | Purple | dark |
| `rose` | Rose | dark |
| `amber` | Amber | dark |

## Migration

- Legacy persisted values (`light`, `dark`) still normalize to `zai-light` / `zai-dark`.
- Catalogue theme values are no longer migrated away — they are valid again.
- The accent identity is now jade (renamed from teal) and is independent of theme.

## State owner

Unchanged from original:

- `packages/ui/src/useTheme.ts` owns the `Theme` union, `resolveTheme`, `applyTheme`.
- `packages/ui/src/settings/settingsPageConfig.ts` owns the picker option list.
- `packages/ui/src/styles.css` owns the token blocks for each theme.

See `docs/theme-catalog.md` for the full catalog.
