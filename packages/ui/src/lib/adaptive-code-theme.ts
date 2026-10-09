import { createCssVariablesTheme, type BundledTheme, type ThemeRegistration } from "shiki";
import type { CodeTheme } from "./codePreviewSettings.js";

/**
 * Adaptive ("Follow app theme") code palettes.
 *
 * The two themes are plain Shiki CSS-variable themes: every token color is a
 * `var(--mesa-code-syntax-*)` reference, so the actual colors come from the app's
 * semantic tokens on the document root. Switching app theme or accent therefore
 * repaints code without re-tokenizing, and the theme identity stays stable for
 * @pierre/diffs caches.
 *
 * This module deliberately imports only `shiki`: it is reachable from the lightweight
 * highlight path, which must not pull the `@pierre/diffs` runtime in. Diff-theme
 * registration lives in `diffsHighlighterEngine.ts`.
 */
/**
 * Fallback values used only when the semantic variable is not defined on the page.
 * The real colors come from `--mesa-code-syntax-*` set by the app appearance layer.
 * `ansi-green`/`ansi-red` intentionally chain to the inserted/deleted syntax tokens so
 * @pierre/diffs' addition/deletion accents follow the same adaptive palette.
 */
const ADAPTIVE_CODE_THEME_VARIABLE_DEFAULTS: Record<string, string> = {
  foreground: "#1f2328",
  background: "transparent",
  "token-comment": "#6e7781",
  "token-keyword": "#cf222e",
  "token-string": "#0a3069",
  "token-string-expression": "#0a3069",
  "token-constant": "#0550ae",
  "token-function": "#8250df",
  "token-parameter": "#953800",
  "token-punctuation": "#57606a",
  "token-link": "#0969da",
  "token-inserted": "#1a7f37",
  "token-deleted": "#cf222e",
  "token-changed": "#9a6700",
  "ansi-green": "var(--mesa-code-syntax-token-inserted, #1a7f37)",
  "ansi-red": "var(--mesa-code-syntax-token-deleted, #cf222e)",
};

function createAdaptiveCodeTheme(
  name: "mesa-code-light" | "mesa-code-dark",
  type: "light" | "dark",
): ThemeRegistration {
  const theme = createCssVariablesTheme({
    name,
    variablePrefix: "--mesa-code-syntax-",
    variableDefaults: ADAPTIVE_CODE_THEME_VARIABLE_DEFAULTS,
    fontStyle: false,
  });
  // Shiki's CSS-variable factory stamps `type: "dark"`; previews need the explicit mode.
  return { ...theme, type };
}

export const MESA_CODE_LIGHT_THEME = createAdaptiveCodeTheme("mesa-code-light", "light");
export const MESA_CODE_DARK_THEME = createAdaptiveCodeTheme("mesa-code-dark", "dark");

export function isAdaptiveCodeTheme(theme: CodeTheme): boolean {
  return theme === "mesa-code-light" || theme === "mesa-code-dark";
}

export function getAdaptiveCodeTheme(theme: CodeTheme): ThemeRegistration | undefined {
  if (theme === "mesa-code-light") return MESA_CODE_LIGHT_THEME;
  if (theme === "mesa-code-dark") return MESA_CODE_DARK_THEME;
  return undefined;
}

/** Manual bundled themes pass through unchanged; adaptive names become theme objects. */
export function getShikiCodeTheme(theme: CodeTheme): BundledTheme | ThemeRegistration {
  const adaptive = getAdaptiveCodeTheme(theme);
  if (adaptive) return adaptive;
  return theme as BundledTheme;
}
