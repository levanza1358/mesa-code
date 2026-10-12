// Regression coverage for docs/specs/local-network-access.md.
//
// The Network section is desktop-only: the LAN listener lives in the desktop
// window host, so the browser mirror (which is served by that same listener)
// must never offer a control that could enable a second one. These tests pin the
// platform gate at the catalog level and require every message the section uses
// to exist in both maintained catalogs.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import enUS from "../src/i18n/locales/en-US.js";
import zhCN from "../src/i18n/locales/zh-CN.js";
import { createSettingsPageConfig, SETTINGS_SECTIONS } from "../src/settings/settingsPageConfig.js";
import { resolveSettingsSection } from "../src/lib/settingsNavigation.js";

const catalogs = { "en-US": enUS, "zh-CN": zhCN };

const networkSectionSource = readFileSync(
  resolve(import.meta.dirname, "..", "src", "settings", "NetworkSection.tsx"),
  "utf8",
);

test("network section is a desktop-only member of the Data group", () => {
  const desktop = createSettingsPageConfig({ isDesktop: true });
  const network = desktop.settingsSections.find((section) => section.id === "network");
  assert.ok(network, "desktop config must list the network section");
  assert.equal(network.groupId, "data");
  assert.ok(
    desktop.settingsSectionGroups.some(
      (group) => group.id === "data" && group.sections.some((section) => section.id === "network"),
    ),
    "network must render inside the Data group",
  );
});

test("the platform-free catalog hides the network section (web mirror)", () => {
  assert.equal(
    createSettingsPageConfig().settingsSections.some((section) => section.id === "network"),
    false,
    "createSettingsPageConfig() defaults to the web view, which must not list network",
  );
  assert.equal(
    SETTINGS_SECTIONS.some((section) => section.id === "network"),
    false,
    "the shared SETTINGS_SECTIONS export represents web and must not list network",
  );
});

test("network is a recognised settings section id", () => {
  assert.equal(resolveSettingsSection("network"), "network");
});

test("every settings.network message used by the section is catalogued", () => {
  const usedIds = new Set(
    [...networkSectionSource.matchAll(/"settings\.network\.[^"]*"/g)].map((match) =>
      match[0].slice(1, -1),
    ),
  );
  assert.ok(usedIds.size > 0, "the section must reference at least one network message id");

  for (const [locale, catalog] of Object.entries(catalogs)) {
    for (const id of usedIds) {
      const translation = catalog[id];
      assert.equal(typeof translation, "string", `${locale} must define ${id}`);
      assert.notEqual(translation, id, `${locale} must not render the raw id ${id}`);
    }
  }
});

test("the open-access security warning is not tied to Tailscale install", () => {
  // The warning explains that enabling exposes the whole session with no auth;
  // it must stay in the section regardless of the (separate, deferred) install
  // work, so it is rendered unconditionally next to the toggle.
  assert.ok(
    networkSectionSource.includes('"settings.network.securityWarning"'),
    "the security warning must remain in the Network section",
  );
});
