import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

/** Each minor and patch field is capped at this value before carrying into the next field. */
export const COMPONENT_MAX = 10;

const VERSION_PATTERN = /^(\d+)\.(\d+)\.(\d+)$/;

/**
 * Advances an installer version by exactly one capped patch step: the patch field increments by
 * one; a patch above COMPONENT_MAX resets to 0 and carries into the minor field; a minor above
 * COMPONENT_MAX resets to 0 and carries into the major field. The major field is uncapped.
 *
 * Scheme: 1.0.0 -> ... -> 1.0.10 -> 1.1.0 -> ... -> 1.10.10 -> 2.0.0.
 */
export function bumpInstallerVersion(current) {
  const match = VERSION_PATTERN.exec(current);

  if (!match) {
    throw new Error(`Unsupported package version: ${current}`);
  }

  let major = Number(match[1]);
  let minor = Number(match[2]);
  let patch = Number(match[3]) + 1;

  if (patch > COMPONENT_MAX) {
    patch = 0;
    minor += 1;
  }
  if (minor > COMPONENT_MAX) {
    minor = 0;
    major += 1;
  }

  return `${major}.${minor}.${patch}`;
}

async function main() {
  const packagePath = resolve(import.meta.dirname, "../package.json");
  const packageJson = JSON.parse(await readFile(packagePath, "utf8"));

  packageJson.version = bumpInstallerVersion(packageJson.version);
  await writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);

  console.log(`Mesa Code version: ${packageJson.version}`);
}

// Only run the file mutation when this module is the process entry point, so importing the pure
// function from tests does not touch the root package.json.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
