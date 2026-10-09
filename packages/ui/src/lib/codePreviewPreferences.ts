import type { CodePreviewSettings, CodeTheme } from "./codePreviewSettings.js";

interface CodePreviewThemeOption {
  value: CodeTheme;
  label: string;
}

export const CODE_PREVIEW_THEME_OPTIONS: CodePreviewThemeOption[] = [
  { value: "github-light", label: "GitHub Light" },
  { value: "github-dark", label: "GitHub Dark" },
  { value: "vitesse-light", label: "Vitesse Light" },
  { value: "vitesse-dark", label: "Vitesse Dark" },
  { value: "min-light", label: "Minimal Light" },
  { value: "min-dark", label: "Minimal Dark" },
  { value: "github-light-high-contrast", label: "GitHub HC Light" },
  { value: "github-dark-high-contrast", label: "GitHub HC Dark" },
  { value: "catppuccin-latte", label: "Catppuccin Latte" },
  { value: "catppuccin-mocha", label: "Catppuccin Mocha" },
  { value: "catppuccin-frappe", label: "Catppuccin Frappé" },
  { value: "one-light", label: "One Light" },
  { value: "one-dark-pro", label: "One Dark Pro" },
  { value: "nord", label: "Nord" },
  { value: "dracula", label: "Dracula" },
  { value: "tokyo-night", label: "Tokyo Night" },
  { value: "rose-pine-dawn", label: "Rosé Pine Dawn" },
  { value: "rose-pine", label: "Rosé Pine" },
  { value: "solarized-light", label: "Solarized Light" },
  { value: "solarized-dark", label: "Solarized Dark" },
  { value: "everforest-light", label: "Everforest Light" },
  { value: "everforest-dark", label: "Everforest Dark" },
  { value: "ayu-light", label: "Ayu Light" },
  { value: "ayu-dark", label: "Ayu Dark" },
  { value: "kanagawa-wave", label: "Kanagawa Wave" },
];

const DARK_CODE_PREVIEW_THEMES: readonly CodeTheme[] = [
  "github-dark",
  "vitesse-dark",
  "min-dark",
  "github-dark-high-contrast",
  "catppuccin-mocha",
  "catppuccin-frappe",
  "one-dark-pro",
  "nord",
  "dracula",
  "tokyo-night",
  "rose-pine",
  "solarized-dark",
  "everforest-dark",
  "ayu-dark",
  "kanagawa-wave",
  "mesa-code-dark",
];

export function isDarkCodePreviewTheme(theme: CodeTheme): boolean {
  // 代码主题的明暗语义必须跟随设置页支持的显式选项，不能用主题名正则猜测。
  return DARK_CODE_PREVIEW_THEMES.includes(theme);
}

export function getCodeThemeOptionsForMode(mode: "light" | "dark"): CodePreviewThemeOption[] {
  return CODE_PREVIEW_THEME_OPTIONS.filter(
    (option) => isDarkCodePreviewTheme(option.value) === (mode === "dark"),
  );
}

export const SETTINGS_PREVIEW_CODE = `const themePreview: ThemeConfig = {
  surface: "sidebar",
  accent: "#339CFF",
  contrast: 45,
};`;

export function getCodePreviewTheme(
  mode: "light" | "dark",
  settings: CodePreviewSettings,
): CodeTheme {
  return mode === "dark" ? settings.darkTheme : settings.lightTheme;
}
