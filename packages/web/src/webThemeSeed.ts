type WebThemeSeed =
  | "light"
  | "dark"
  | "zai-light"
  | "zai-dark"
  | "black"
  | "system"
  | "midnight"
  | "ocean"
  | "forest"
  | "purple"
  | "rose"
  | "amber"
  | "liquid";

export const WEB_DEFAULT_THEME: WebThemeSeed = "zai-dark";

/** All catalogue dark themes that are now valid selections. */
const CATALOGUE_DARK_THEMES = [
  "midnight",
  "ocean",
  "forest",
  "purple",
  "rose",
  "amber",
  "liquid",
] as const;

function isWebThemeSeed(value: unknown): value is WebThemeSeed {
  return (
    value === "light" ||
    value === "dark" ||
    value === "zai-light" ||
    value === "zai-dark" ||
    value === "black" ||
    value === "system" ||
    (typeof value === "string" &&
      (CATALOGUE_DARK_THEMES as readonly string[]).includes(value))
  );
}

function normalizeWebThemeSeed(theme: WebThemeSeed): WebThemeSeed {
  // Legacy bare "dark" / "light" normalize to the branded variants.
  if (theme === "dark") return "zai-dark";
  if (theme === "light") return "zai-light";
  // Catalogue themes are now valid — pass them through.
  return theme;
}

export function resolveWebInitialTheme({
  storedTheme,
  defaultTheme = WEB_DEFAULT_THEME,
}: {
  storedTheme?: string | null;
  defaultTheme?: WebThemeSeed;
}): WebThemeSeed {
  if (isWebThemeSeed(storedTheme)) {
    return normalizeWebThemeSeed(storedTheme);
  }

  return normalizeWebThemeSeed(defaultTheme);
}
