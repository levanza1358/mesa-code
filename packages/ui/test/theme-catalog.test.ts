import assert from "node:assert/strict";
import test from "node:test";
import { THEME_MODES } from "../src/settings/settingsPageConfig.js";
import { isTheme, normalizeThemePreference, resolveTheme } from "../src/useTheme.js";

test("every displayed theme passes the shared preference validator", () => {
  assert.equal(THEME_MODES.length, 11);
  for (const { mode } of THEME_MODES) {
    assert.equal(isTheme(mode), true, `${mode} must reach the preference setter`);
    assert.equal(normalizeThemePreference(mode), mode);
    if (mode !== "system") {
      assert.equal(resolveTheme(mode), mode === "zai-light" ? "light" : "dark");
    }
  }
  assert.equal(normalizeThemePreference("light"), "zai-light");
  assert.equal(normalizeThemePreference("dark"), "zai-dark");
  for (const value of [null, "", "unknown", "Dark"]) assert.equal(isTheme(value), false);
});

test("liquid is a first-class dark catalogue theme", () => {
  assert.ok(THEME_MODES.some(({ mode }) => mode === "liquid"), "Liquid must be selectable");
  assert.equal(isTheme("liquid"), true);
  assert.equal(normalizeThemePreference("liquid"), "liquid");
  assert.equal(resolveTheme("liquid"), "dark");
});
