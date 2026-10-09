import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeCodeTheme,
  DEFAULT_CODE_PREVIEW_SETTINGS,
} from "../src/lib/codePreviewSettings.js";
import {
  getCodeThemeOptionsForMode,
  isDarkCodePreviewTheme,
} from "../src/lib/codePreviewPreferences.js";

test("adaptive and bundled code themes remain valid without replacing saved manual choices", () => {
  for (const theme of [
    "mesa-code-light",
    "mesa-code-dark",
    "github-light",
    "github-dark",
    "nord",
    "dracula",
    "one-dark-pro",
    "rose-pine",
  ] as const) {
    assert.equal(normalizeCodeTheme(theme, "github-dark"), theme);
  }
  for (const theme of [null, undefined, "unknown", {}, 1]) {
    assert.equal(normalizeCodeTheme(theme, "github-dark"), "github-dark");
  }
  assert.equal(DEFAULT_CODE_PREVIEW_SETTINGS.lightTheme, "github-light");
  assert.equal(DEFAULT_CODE_PREVIEW_SETTINGS.darkTheme, "github-dark");
});

test("light and dark code selectors keep mode-correct palettes", () => {
  for (const option of getCodeThemeOptionsForMode("light")) {
    assert.equal(isDarkCodePreviewTheme(option.value), false, `${option.value} must be light`);
  }
  for (const option of getCodeThemeOptionsForMode("dark")) {
    assert.equal(isDarkCodePreviewTheme(option.value), true, `${option.value} must be dark`);
  }
  assert.ok(getCodeThemeOptionsForMode("light").length >= 10);
  assert.ok(getCodeThemeOptionsForMode("dark").length >= 12);
});
