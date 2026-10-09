# Accent Picker

Status: Implemented

Depends on: `docs/theme-catalog.md`

## Goal

Let the user choose the brand **accent** independently from the app theme. The theme decides
the surface (light / dark / black / catalogue variant); the accent decides the brand color.
They are two separate controls, and neither overwrites the other.

## Product rules

1. **Accent is independent of theme.** Changing the theme keeps the chosen accent; changing
   the accent keeps the chosen theme.
2. **Accent options are a fixed, named set.** Each option carries a name, a dark-mode color,
   and a light-mode color:

   | Id | Label | Dark | Light | Comment |
   | --- | --- | --- | --- | --- |
   | `jade` | Jade | `#82e4b7` | `#17683f` | default |
   | `sky` | Sky | `#93d7ff` | `#155d8b` | |
   | `violet` | Violet | `#c8b3ff` | `#654399` | |
   | `rose` | Rose | `#ffb2ca` | `#9a345a` | |
   | `amber` | Amber | `#f7d58c` | `#795414` | |
   | `coral` | Coral | `#ffb5a0` | `#91462b` | |

   `jade` is the default.
3. **Legacy accent migration.** Old accent names map to new ones through
   `LEGACY_ACCENT_MAP`: `teal→jade`, `blue→sky`, `purple→violet`, `green→coral`.
   Unknown or null values fall back to `jade`.
4. **Accent flows through semantic tokens.** Setting an accent rewrites the semantic brand
   token family on the document root as an inline style override. The theme blocks in
   `styles.css` remain the fallback. The family includes strong brand color, readable
   foreground, soft surface, border, focus ring, selected surface, hover surface, and
   terminal selection tints. No per-accent CSS class is added.
5. **Accent persists and broadcasts.** It is stored under `mesa-code-accent` in
   `localStorage`, lives in the Zustand store beside `theme`, and participates in the
   same cross-window broadcast so multiple windows stay consistent.
6. **Accent does not touch semantic status colors.** Success / warning / destructive / diff
   colors remain independent.

## State owner

- `packages/ui/src/accent.ts` owns the `Accent` union, the option list, the default, and
  `applyAccent()`, which is the single write path for the root inline overrides.
- `packages/ui/src/store/index.ts` owns the persisted value and the broadcast field.
- `packages/ui/src/useTheme.ts` is untouched by accent changes; theme and accent never
  write the same token twice in one action.

## Interface

```ts
export type Accent = "jade" | "sky" | "violet" | "rose" | "amber" | "coral";

export const ACCENT_OPTIONS: ReadonlyArray<{ id: Accent; labelId: string; dark: string; light: string }>;

export function normalizeAccent(value: string | null | undefined): Accent;
export function applyAccent(accent: Accent): void;
```

`applyAccent` sets `--color-brand` and `--color-primary` to the accent's strong color and
`--color-accent` to `color-mix(in srgb, brand 12%, sidebar)`, chosen per resolved
light/dark surface so contrast holds in every theme.

## Acceptance scenarios

1. Changing App Theme to Black, then to Light, leaves the selected accent unchanged.
2. Changing Accent leaves the selected app theme unchanged.
3. The Accent dropdown lists the six named accents and marks the active one.
4. A persisted `mesa-code-accent=rose` restores on reload and paints the rose brand color.
5. A legacy accent (`teal`, `blue`, `purple`, `green`) migrates to its new name
   (`jade`, `sky`, `violet`, `coral`) instead of leaving the tokens undefined.
6. The accent override is present on the root element as an inline style, and the theme
   class still controls the surfaces underneath it.
7. Cross-window: setting an accent in one window updates the other through the existing
   broadcast field.
8. The selected accent is visible beyond primary buttons: active navigation, selected tabs or
   rows, focused controls, links, checkboxes/switches, soft branded surfaces, and terminal
   selection all follow the same accent family while preserving readable foreground contrast.
9. Changing the accent does not recolor success, warning, destructive, diff, or file-type
   semantic colors.
