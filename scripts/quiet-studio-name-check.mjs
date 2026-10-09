import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolveDesktopProductIdentity } from "../packages/desktop/scripts/desktop-product-identity.mjs";

for (const [env, appId, flavor] of [
  [{ MESA_CODE_ENV: "production" }, "dev.mesaCode.app", "production"],
  [{ MESA_CODE_ENV: "test" }, "dev.mesaCode.app.preview", "preview"],
  [
    { MESA_CODE_ENV: "production", MESA_CODE_PREVIEW_IDENTITY: "1" },
    "dev.mesaCode.app.preview",
    "preview",
  ],
]) {
  const identity = resolveDesktopProductIdentity(env);
  assert.equal(identity.productName, "Mesa Code");
  assert.equal(identity.executableName, "MesaCode");
  assert.equal(identity.appId, appId);
  assert.equal(identity.flavor, flavor);
  if (flavor === "preview") {
    assert.equal(identity.linuxPackageName, "mesacode-preview");
    assert.equal(identity.cuaHelperInstallVariant, "preview");
  }
}
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const runtime = await read("packages/desktop/src/main/desktopRuntimeEnv.ts");
assert.match(
  runtime,
  /runtimeApplicationName\s*=\s*readRuntimeEnvOverride\("MESA_CODE_DESKTOP_APPLICATION_NAME"\)\s*\?\?\s*"Mesa Code"/,
);
assert.ok(runtime.includes("runtimeProfileDirectoryName"));
assert.ok(runtime.includes('"Mesa Code Dev"'));
assert.ok(runtime.includes('"Mesa Code Preview"'));
assert.ok(runtime.includes('"MESA_CODE_DESKTOP_USER_DATA_DIR"'));
const builder = await read("packages/desktop/electron-builder.config.js");
assert.ok(builder.includes('shortcutName: "Mesa Code"'));
assert.ok(builder.includes('uninstallDisplayName: "Mesa Code"'));
assert.ok(builder.includes("productName: desktopProductIdentity.productName"));
assert.ok(builder.includes('artifactName: "MesaCode-${version}-win-${arch}.${ext}"'));
assert.ok(
  (await read("scripts/quiet-studio-dev.mjs")).includes(
    'MESA_CODE_DESKTOP_APPLICATION_NAME: "Mesa Code"',
  ),
);
const manifest = JSON.parse(await read("packages/desktop/package.json"));
assert.equal(manifest.name, "@mesa-code/desktop");
assert.equal(manifest.productName, "Mesa Code");
assert.equal(manifest.description, "Mesa Code");
console.info("Mesa Code app/installer display names and existing profile identities passed.");
