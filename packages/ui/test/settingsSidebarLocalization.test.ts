// Regression coverage for docs/specs/settings-restructure.md.
//
// The sidebar uses raw message IDs as its missing-translation fallback. Keep every title ID
// exported by the single settings-navigation owner present in each maintained catalog so a
// restructure cannot ship labels such as "settings.sidebar.group.general" to users.
import assert from "node:assert/strict";
import test from "node:test";
import enUS from "../src/i18n/locales/en-US.js";
import zhCN from "../src/i18n/locales/zh-CN.js";
import { createSettingsPageConfig } from "../src/settings/settingsPageConfig.js";

const catalogs = {
  "en-US": enUS,
  "zh-CN": zhCN,
};

test("every Settings sidebar group and section title has localized text", () => {
  const { settingsSectionGroups, settingsSections } = createSettingsPageConfig();
  const titleIds = [
    ...settingsSectionGroups.map((group) => group.titleId),
    ...settingsSections.map((section) => section.titleId),
  ];

  assert.equal(new Set(titleIds).size, titleIds.length, "sidebar title IDs must be unique");

  for (const [locale, catalog] of Object.entries(catalogs)) {
    for (const titleId of titleIds) {
      const translation = catalog[titleId];
      assert.equal(
        typeof translation,
        "string",
        `${locale} must define the Settings sidebar title ${titleId}`,
      );
      assert.notEqual(
        translation,
        titleId,
        `${locale} must not render the raw Settings sidebar title ID ${titleId}`,
      );
    }
  }
});
