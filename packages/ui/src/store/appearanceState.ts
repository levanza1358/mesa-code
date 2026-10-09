/**
 * Appearance slice of the Zustand store: app theme, brand accent, locale and UI font size.
 *
 * These four fields share one trait — each one owns a persisted preference and paints the
 * document root. Keeping them together fixes the cross-cutting rule that the accent must be
 * reapplied whenever the resolved surface changes, because the subtle brand tint differs
 * between a light and a dark background.
 */
import { readSafeLocalStorage, writeSafeLocalStorage } from "@/lib/browserEnvironment.js";
import {
  applyUiFontSizePx,
  loadUiFontSizePx,
  normalizeUiFontSizePx,
  UI_FONT_SIZE_STORAGE_KEY,
} from "@/lib/uiFontSize.js";
import {
  applyAccent,
  normalizeAccent,
  readStoredAccent,
  writeStoredAccent,
  type Accent,
} from "../accent.js";
import { applyTheme, normalizeThemePreference, resolveTheme, type Theme } from "../useTheme.js";

export const THEME_STORAGE_KEY = "mesa-code-theme";
export const LOCALE_STORAGE_KEY = "mesa-code-locale";
export const DENSITY_STORAGE_KEY = "mesa-code-density";

export type Density = "comfortable" | "compact";
const DEFAULT_DENSITY: Density = "comfortable";

function readStoredDensity(): Density {
  const stored = readSafeLocalStorage(DENSITY_STORAGE_KEY);
  return stored === "compact" ? "compact" : DEFAULT_DENSITY;
}

function applyDensity(density: Density): void {
  if (typeof document === "undefined") return;
  document.body.classList.toggle("compact", density === "compact");
}

export interface AppearanceState {
  /** Current app theme. */
  theme: Theme;
  setTheme: (theme: Theme) => void;

  /** Current brand accent color; independent of the theme. */
  accent: Accent;
  setAccent: (accent: Accent) => void;

  /** Current locale. */
  locale: string;
  setLocale: (locale: string) => void;

  /** UI root font size in px. */
  uiFontSizePx: number;
  setUiFontSizePx: (fontSizePx: number) => void;

  /** Layout density — comfortable (default) or compact. */
  density: Density;
  setDensity: (density: Density) => void;
}

/** Fields of {@link AppearanceState} that must be mirrored across windows. */
export const APPEARANCE_BROADCAST_FIELDS = [
  "theme",
  "accent",
  "locale",
  "uiFontSizePx",
  "density",
] as const;

export type AppearanceBroadcastField = (typeof APPEARANCE_BROADCAST_FIELDS)[number];

export interface AppearanceSliceContext {
  /** Read the current accent so a theme change can repaint the matching subtle tint. */
  readAccent: () => Accent;
  /** Read the current theme so an accent change can pick the matching subtle tint. */
  readTheme: () => Theme;
  /** Signalled to listeners when this slice drives a broadcast-originated update. */
  isApplyingBroadcast: () => boolean;
}

/**
 * Build the theme/accent/locale/font-size initial values and setters.
 *
 * The factory takes readers instead of the live store so the slice stays free of a circular
 * import with `store/index.ts`. Every setter writes its own storage key and repaints the DOM
 * root before publishing the new value, which keeps a second window in sync even when it
 * never re-runs the initializers.
 */
export function createAppearanceSlice(context: AppearanceSliceContext): AppearanceState {
  return {
    // 默认主题统一收敛到 Zai dark，避免首次启动时 store 与其他主题入口表现不一致。
    // 仍然优先尊重 localStorage 中已保存的用户选择，不覆盖已有偏好。
    theme: normalizeThemePreference(
      (readSafeLocalStorage(THEME_STORAGE_KEY) as Theme) || "zai-dark",
    ),
    setTheme: (theme: Theme) => {
      const normalizedTheme = normalizeThemePreference(theme);
      writeSafeLocalStorage(THEME_STORAGE_KEY, normalizedTheme);
      applyTheme(normalizedTheme);
      // The root accent override lives in an inline style, so a theme change must reapply
      // the subtle tint for the new surface instead of leaving the previous one behind.
      applyAccent(context.readAccent(), resolveTheme(normalizedTheme));
    },

    accent: readStoredAccent(),
    setAccent: (accent: Accent) => {
      const normalizedAccent = normalizeAccent(accent);
      writeStoredAccent(normalizedAccent);
      applyAccent(normalizedAccent, resolveTheme(context.readTheme()));
    },

    locale: readSafeLocalStorage(LOCALE_STORAGE_KEY) || "zh-CN",
    setLocale: (locale: string) => {
      writeSafeLocalStorage(LOCALE_STORAGE_KEY, locale);
    },

    uiFontSizePx: loadUiFontSizePx(),
    setUiFontSizePx: (fontSizePx: number) => {
      const normalizedFontSizePx = normalizeUiFontSizePx(fontSizePx);
      writeSafeLocalStorage(UI_FONT_SIZE_STORAGE_KEY, String(normalizedFontSizePx));
      applyUiFontSizePx(normalizedFontSizePx);
    },

    density: readStoredDensity(),
    setDensity: (density: Density) => {
      const normalized: Density = density === "compact" ? "compact" : DEFAULT_DENSITY;
      writeSafeLocalStorage(DENSITY_STORAGE_KEY, normalized);
      applyDensity(normalized);
    },
  };
}
