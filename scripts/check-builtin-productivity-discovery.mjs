import assert from "node:assert/strict";
import { mkdir, mkdtemp } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { discoverNodePluginsSync } from "../apps/mesa-code-cli/packages/adapters/src/plugins/index.ts";
import { DEFAULT_ENABLED_OFFICIAL_PLUGIN_IDS } from "../apps/mesa-code-cli/packages/bootstrap/src/app/official-plugin-definitions.ts";
import { DEFAULT_ENABLED_OFFICIAL_PLUGIN_IDS as settingsDefaults } from "../packages/shared/src/plugin-marketplaces.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const names = [
  "development-toolkit",
  "quality-toolkit",
  "frontend-toolkit",
  "data-toolkit",
  "writing-toolkit",
  "project-toolkit",
  "testing-toolkit",
  "docs-toolkit",
  "database-toolkit",
  "mobile-toolkit",
  "cloud-ops-toolkit",
  "ai-engineering-toolkit",
];
const base = join(root, ".quiet-studio-runtime", "builtin-checks");
await mkdir(base, { recursive: true });
const storageRoot = await mkdtemp(join(base, "discovery-"));
const config = {
  dirs: [],
  enabled: true,
  enabledPlugins: {},
  extraKnownMarketplaces: {},
  options: {},
  suppressedBuiltins: [],
};
const request = {
  config,
  env: {},
  officialPluginsEnabledByDefault: DEFAULT_ENABLED_OFFICIAL_PLUGIN_IDS,
  officialPluginRoots: names.map((name) =>
    join(root, "apps", "mesa-code-cli", "packages", `${name}-plugin`),
  ),
  storageRoot,
  workingDirectory: root,
};
const loaded = discoverNodePluginsSync(request);
assert.equal(loaded.plugins.length, 12);
assert.equal(
  loaded.plugins.reduce((count, plugin) => count + plugin.skillCount, 0),
  48,
);
for (const name of names) {
  const id = `${name}@mesa-code-plugins-official`;
  assert.ok(DEFAULT_ENABLED_OFFICIAL_PLUGIN_IDS.has(id));
  assert.ok(settingsDefaults.has(id));
  assert.ok(loaded.plugins.some((plugin) => plugin.id === id && plugin.enabled));
}
const suppressedId = "quality-toolkit@mesa-code-plugins-official";
const suppressed = discoverNodePluginsSync({
  ...request,
  config: { ...config, suppressedBuiltins: [suppressedId] },
});
assert.equal(suppressed.plugins.length, 11);
assert.ok(!suppressed.plugins.some((plugin) => plugin.id === suppressedId));
assert.equal(
  suppressed.plugins.reduce((count, plugin) => count + plugin.skillCount, 0),
  44,
);
const disabled = discoverNodePluginsSync({
  ...request,
  config: { ...config, enabledPlugins: { [suppressedId]: false } },
});
assert.ok(disabled.plugins.some((plugin) => plugin.id === suppressedId && !plugin.enabled));
console.info(
  "Builtin productivity discovery/default enablement, disable and uninstall suppression passed.",
);
