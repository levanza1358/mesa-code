/**
 * Independent brand accent selection for Mesa Code.
 *
 * The app theme decides the surface (light / dark / black); the accent decides the brand
 * color. They are intentionally separate so switching one never resets the other.
 *
 * The accent is applied by overriding three brand tokens as inline custom properties on
 * the document root. The `.theme-*` blocks in `styles.css` stay as the fallback, so a
 * theme and an accent never fight over the same declaration.
 */

export type Accent = "jade" | "sky" | "violet" | "rose" | "amber" | "coral";

export const DEFAULT_ACCENT: Accent = "jade";

const STORAGE_KEY = "mesa-code-accent";

export interface AccentOption {
  id: Accent;
  /** i18n message id for the human label. */
  labelId: string;
  /** Swatch color shown in the picker, independent of the active surface. */
  swatch: string;
  /** Strong color used for brand actions on a dark surface. */
  strong: string;
  /** Strong color used for brand actions on a light surface. */
  strongLight: string;
  /** Foreground paired with the strong color on a dark surface. */
  foregroundDark: string;
  /** Foreground paired with the strong color on a light surface. */
  foregroundLight: string;
  /** Subtle tint used for `--color-accent` on a dark surface. */
  subtleDark: string;
  /** Subtle tint used for `--color-accent` on a light surface. */
  subtleLight: string;
}

export const ACCENT_OPTIONS: ReadonlyArray<AccentOption> = [
  {
    id: "jade",
    labelId: "accent.jade",
    swatch: "#82e4b7",
    strong: "#82e4b7",
    strongLight: "#17683f",
    foregroundDark: "#10251a",
    foregroundLight: "#ffffff",
    subtleDark: "#1a3d2b",
    subtleLight: "#d4f5e4",
  },
  {
    id: "sky",
    labelId: "accent.sky",
    swatch: "#93d7ff",
    strong: "#93d7ff",
    strongLight: "#155d8b",
    foregroundDark: "#0c2a42",
    foregroundLight: "#ffffff",
    subtleDark: "#1a3d55",
    subtleLight: "#d6efff",
  },
  {
    id: "violet",
    labelId: "accent.violet",
    swatch: "#c8b3ff",
    strong: "#c8b3ff",
    strongLight: "#654399",
    foregroundDark: "#2a1a4c",
    foregroundLight: "#ffffff",
    subtleDark: "#3a2660",
    subtleLight: "#ede4ff",
  },
  {
    id: "rose",
    labelId: "accent.rose",
    swatch: "#ffb2ca",
    strong: "#ffb2ca",
    strongLight: "#9a345a",
    foregroundDark: "#3d1525",
    foregroundLight: "#ffffff",
    subtleDark: "#552040",
    subtleLight: "#ffe4ed",
  },
  {
    id: "amber",
    labelId: "accent.amber",
    swatch: "#f7d58c",
    strong: "#f7d58c",
    strongLight: "#795414",
    foregroundDark: "#33220a",
    foregroundLight: "#ffffff",
    subtleDark: "#4d3a12",
    subtleLight: "#fef3d6",
  },
  {
    id: "coral",
    labelId: "accent.coral",
    swatch: "#ffb5a0",
    strong: "#ffb5a0",
    strongLight: "#91462b",
    foregroundDark: "#3a1c12",
    foregroundLight: "#ffffff",
    subtleDark: "#5a2e1e",
    subtleLight: "#ffe8df",
  },
];

export function getAccentOption(accent: Accent): AccentOption {
  return ACCENT_OPTIONS.find((option) => option.id === accent) ?? ACCENT_OPTIONS[0];
}

/**
 * Coerce any persisted value to a supported accent. Unknown values (including old theme
 * names that used to double as accents) fall back to jade rather than leaving the brand
 * tokens undefined. Legacy accent names are migrated to their new equivalents.
 */
const LEGACY_ACCENT_MAP: Record<string, Accent> = {
  teal: "jade",
  blue: "sky",
  purple: "violet",
  green: "coral",
};

export function normalizeAccent(value: string | null | undefined): Accent {
  if (!value) return DEFAULT_ACCENT;
  // Migrate legacy accent names from the previous naming convention.
  if (value in LEGACY_ACCENT_MAP) return LEGACY_ACCENT_MAP[value];
  return ACCENT_OPTIONS.some((option) => option.id === value) ? (value as Accent) : DEFAULT_ACCENT;
}

/**
 * Apply the accent by overriding the semantic brand family on the document root. `resolved`
 * picks the readable strong color and subtle tint for the active surface. The other values
 * intentionally use the same family so selected rows, focus states, links and soft panels
 * feel like one coherent accent instead of isolated colored buttons.
 */
export function applyAccent(accent: Accent, resolved: "light" | "dark"): void {
  if (typeof document === "undefined") return;
  const option = getAccentOption(accent);
  const root = document.documentElement;
  const strong = resolved === "dark" ? option.strong : option.strongLight;
  const foreground = resolved === "dark" ? option.foregroundDark : option.foregroundLight;
  const subtle = resolved === "dark" ? option.subtleDark : option.subtleLight;
  root.style.setProperty("--color-brand", strong);
  root.style.setProperty("--color-primary", strong);
  root.style.setProperty("--color-primary-foreground", foreground);
  root.style.setProperty("--color-ring", strong);
  root.style.setProperty("--color-input-border-focused", strong);
  root.style.setProperty("--color-selected", `color-mix(in oklab, ${subtle} 72%, transparent)`);
  root.style.setProperty(
    "--color-card-selected",
    `color-mix(in oklab, ${subtle} 86%, var(--color-card))`,
  );
  root.style.setProperty(
    "--color-hover",
    `color-mix(in oklab, ${subtle} 58%, var(--color-surface-hover))`,
  );
  root.style.setProperty(
    "--color-tab-active",
    `color-mix(in oklab, ${subtle} 82%, var(--color-background))`,
  );
  root.style.setProperty("--color-accent", subtle);
  root.style.setProperty(
    "--color-terminal-selection",
    `color-mix(in oklab, ${strong} 30%, transparent)`,
  );
  root.style.setProperty(
    "--color-terminal-selection-inactive",
    `color-mix(in oklab, ${strong} 18%, transparent)`,
  );
}

export function readStoredAccent(): Accent {
  if (typeof localStorage === "undefined") return DEFAULT_ACCENT;
  try {
    return normalizeAccent(localStorage.getItem(STORAGE_KEY));
  } catch {
    return DEFAULT_ACCENT;
  }
}

export function writeStoredAccent(accent: Accent): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, accent);
  } catch {
    // Storage can be unavailable (private mode, quota). Accent is cosmetic; ignore.
  }
}
