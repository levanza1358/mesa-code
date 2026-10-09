import assert from "node:assert/strict";
import { mkdir, mkdtemp, readdir, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  collectSeaOfficialPluginAssets,
  officialSeaPlugins,
} from "../apps/mesa-code-cli/packages/cli/scripts/sea-official-plugin-assets.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cliRoot = join(root, "apps", "mesa-code-cli");
const expected = [
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
const skillNames = new Set();
let count = 0;
for (const name of expected) {
  const pluginRoot = join(cliRoot, "packages", `${name}-plugin`);
  const manifest = JSON.parse(
    await readFile(join(pluginRoot, ".mesaCode-plugin", "plugin.json"), "utf8"),
  );
  assert.equal(manifest.name, name);
  assert.equal(manifest.version, "1.0.0");
  assert.equal(manifest.skills, "skills");
  assert.ok(manifest.description?.length > 20);
  assert.ok(
    !manifest.mcpServers && !manifest.hooks,
    "Instruction packs must not start hidden runtimes",
  );
  const dirs = await readdir(join(pluginRoot, "skills"), { withFileTypes: true });
  assert.equal(dirs.filter((dir) => dir.isDirectory()).length, 4);
  for (const dir of dirs) {
    assert.ok(dir.isDirectory());
    const text = await readFile(join(pluginRoot, "skills", dir.name, "SKILL.md"), "utf8");
    assert.match(text, /^---\r?\n/);
    assert.match(text, new RegExp(`(?:^|\\n)name: ${dir.name}(?:\\r?\\n)`));
    assert.match(text, /(?:^|\n)description: .+/);
    assert.ok(text.length > 800, "Skills need actionable instructions, not placeholder headings");
    assert.ok(!/[\u4e00-\u9fff]/.test(text), "Builtin instructions must be English");
    assert.ok(!skillNames.has(dir.name), `Duplicate skill ${dir.name}`);
    skillNames.add(dir.name);
    count++;
  }
  const sea = officialSeaPlugins.find((plugin) => plugin.name === name);
  assert.ok(sea, `${name} must be declared for release assets`);
  assert.equal(sea.requiresRuntime, false);
  assert.equal(sea.version, manifest.version);
  assert.equal(sea.requiredSeedPaths.length, 4);
}
const runtime = join(root, ".quiet-studio-runtime", "builtin-checks");
await mkdir(runtime, { recursive: true });
const stagingDirectory = await mkdtemp(join(runtime, "sea-"));
const { manifest } = await collectSeaOfficialPluginAssets({
  root: cliRoot,
  stagingDirectory,
  requireRuntime: true,
});
for (const name of expected) {
  const entry = manifest.plugins.find((plugin) => plugin.name === name);
  assert.ok(entry, `SEA assets missing ${name}`);
  assert.equal(entry.files.filter((file) => file.path.endsWith("/SKILL.md")).length, 4);
  assert.ok(entry.files.some((file) => file.path === ".mesaCode-plugin/plugin.json"));
  for (const file of entry.files) {
    assert.ok(!file.path.startsWith("/") && !file.path.split("/").includes(".."));
    assert.match(file.sha256, /^[a-f0-9]{64}$/);
  }
}
if (process.argv.includes("--desktop")) {
  const stagedRoot = join(
    root,
    "packages",
    "desktop",
    "bundled-agents",
    `${process.platform}-${process.arch}`,
    "glm",
    "packages",
  );
  for (const name of expected) {
    const sourceRoot = join(cliRoot, "packages", `${name}-plugin`);
    const targetRoot = join(stagedRoot, `${name}-plugin`);
    const files = [
      ".mesaCode-plugin/plugin.json",
      ...Array.from(skillNames)
        .filter((skill) =>
          officialSeaPlugins
            .find((plugin) => plugin.name === name)
            .requiredSeedPaths.includes(`skills/${skill}/SKILL.md`),
        )
        .map((skill) => `skills/${skill}/SKILL.md`),
    ];
    for (const file of files) {
      assert.equal(
        await readFile(join(targetRoot, file), "utf8"),
        await readFile(join(sourceRoot, file), "utf8"),
        `Stale or missing staged ${name}/${file}`,
      );
    }
  }
  const builder = await readFile(
    join(root, "packages", "desktop", "electron-builder.config.js"),
    "utf8",
  );
  assert.ok(builder.includes("bundled-agents/${targetPlatform.key}/glm"));
  assert.ok(builder.includes('to: "glm"'));
}
console.info(
  `Builtin productivity manifests and release assets passed: ${expected.length} plugins, ${count} skills${process.argv.includes("--desktop") ? "; desktop installer staging verified" : ""}.`,
);
console.info(`Validated asset manifest: ${stagingDirectory}`);
