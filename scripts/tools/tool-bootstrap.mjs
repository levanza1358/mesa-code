/**
 * Build tool bootstrap.
 *
 * Downloads, verifies, and extracts the non-npm tools a Windows installer build
 * needs, storing them under `.tools/` so later builds reuse the cache. Build
 * scripts call `ensureTools()`; a missing tool is fetched automatically instead
 * of failing midway through packaging.
 *
 * Design notes:
 * - Downloads are verified against the catalog checksum before extraction, so a
 *   truncated mirror response never becomes a half-built artifact.
 * - Extraction is atomic-ish: payload goes to a temp directory and is renamed
 *   into place, so an interrupted run cannot leave a partial tool that later
 *   looks "present".
 * - Windows symlink entries inside electron-builder bundles are skipped, because
 *   creating them requires elevation. Only Windows payload is needed.
 */

import { createHash } from "node:crypto";
import { createWriteStream, existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { pipeline } from "node:stream/promises";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  DEFAULT_ELECTRON_BUILDER_BINARIES_MIRROR,
  OFFICIAL_ELECTRON_BUILDER_BINARIES_MIRROR,
  TOOL_CATALOG,
  toolIdsForProfile,
} from "./tool-catalog.mjs";
import { resolveIntranetDepsBaseUrl } from "../intranetDefaults.mjs";
import { extractSevenZip, ensureSevenZipShim, resolveSevenZip } from "./seven-zip.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** Root of the tool cache. Overridable so CI can place it on a faster disk. */
export function resolveToolsDir(env = process.env) {
  const override = env.MESA_CODE_TOOLS_DIR?.trim();
  return override ? resolve(override) : resolve(repoRoot, ".tools");
}

function toolsSubdir(name, env) {
  return resolve(resolveToolsDir(env), name);
}

export function downloadsDir(env = process.env) {
  return toolsSubdir("downloads", env);
}

export function binDir(env = process.env) {
  return toolsSubdir("bin", env);
}

/** Directory holding an extracted tool, or where a single-file tool is stored. */
export function toolDir(toolId, env = process.env) {
  return toolsSubdir(toolId, env);
}

/**
 * Directory electron-builder reads a helper bundle from.
 *
 * `app-builder` resolves bundles as `<cache>/<releaseName>`, so the extracted
 * payload must live in a directory named after the release rather than the
 * catalog id.
 */
export function builderBundleDir(tool, env = process.env) {
  return resolve(resolveToolsDir(env), tool.releaseName);
}

function statePath(env) {
  return resolve(resolveToolsDir(env), "state.json");
}

async function readState(env) {
  try {
    return JSON.parse(await readFile(statePath(env), "utf8"));
  } catch {
    return { tools: {} };
  }
}

async function writeState(state, env) {
  await mkdir(resolveToolsDir(env), { recursive: true });
  await writeFile(statePath(env), `${JSON.stringify(state, null, 2)}\n`);
}

async function sha512Base64(filePath) {
  const data = await readFile(filePath);
  return createHash("sha512").update(data).digest("base64");
}

/**
 * Resolve candidate URLs for a tool, honoring the intranet mirror first, then
 * the public mirror, then upstream GitHub.
 */
export function resolveToolUrls(tool, env = process.env) {
  if (tool.kind !== "electron-builder-bundle") {
    return [];
  }

  const intranetBase = env.MESA_CODE_DEPS_BASE_URL?.trim() || env.MESA_INTRANET_HOST?.trim();
  const bases = [];

  if (intranetBase) {
    bases.push(`${resolveIntranetDepsBaseUrl(env)}/electron-builder-binaries/`);
  }

  bases.push(
    env.ELECTRON_BUILDER_BINARIES_MIRROR?.trim() || DEFAULT_ELECTRON_BUILDER_BINARIES_MIRROR,
  );
  bases.push(OFFICIAL_ELECTRON_BUILDER_BINARIES_MIRROR);

  return bases.map((base) => `${base.replace(/\/+$/u, "")}/${tool.releaseName}/${tool.fileName}`);
}

async function downloadTo(urls, targetPath, tool, logger) {
  await mkdir(dirname(targetPath), { recursive: true });

  let lastError = null;
  for (const url of urls) {
    logger.log(`[tools] downloading ${tool.id} from ${url}`);
    try {
      const response = await fetch(url);
      if (!response.ok || !response.body) {
        throw new Error(`HTTP ${response.status}`);
      }
      await pipeline(response.body, createWriteStream(targetPath));

      if (tool.sha512) {
        const actual = await sha512Base64(targetPath);
        if (actual !== tool.sha512) {
          throw new Error(`checksum mismatch (expected ${tool.sha512}, got ${actual})`);
        }
      }
      return;
    } catch (error) {
      lastError = error;
      logger.warn(`[tools] ${tool.id} download failed from ${url}: ${error.message}`);
      await rm(targetPath, { force: true });
    }
  }

  throw new Error(`[tools] could not download ${tool.id}: ${lastError?.message ?? "no mirror"}`);
}

/**
 * Extract a 7z archive with the platform 7za, skipping entries the extractor
 * cannot create unprivileged (macOS symlinks inside electron-builder bundles).
 */
async function extractToolArchive(tool, archivePath, targetDir, logger) {
  if (tool.extract === "seven-zip") {
    await extractSevenZip({ archivePath, targetDir, logger });
    return;
  }
  throw new Error(`[tools] unsupported extract kind: ${tool.extract}`);
}

/**
 * Ensure one tool is present in the cache. Skips work when the payload and a
 * matching state entry already exist.
 */
export async function ensureTool(tool, { env = process.env, logger = console, force = false } = {}) {
  const state = await readState(env);
  const existing = state.tools?.[tool.id];
  // electron-builder's app-builder reads helper bundles from `<cache>/<releaseName>`.
  const targetDir = builderBundleDir(tool, env);
  const archivePath = resolve(downloadsDir(env), tool.fileName);

  if (!force && existing?.sha512 === tool.sha512 && existsSync(targetDir)) {
    return { id: tool.id, status: "cached", path: targetDir };
  }

  if (env.MESA_CODE_TOOLS_OFFLINE === "1") {
    throw new Error(
      `[tools] ${tool.id} is missing and MESA_CODE_TOOLS_OFFLINE=1 forbids downloading it`,
    );
  }

  if (force || !existsSync(archivePath) || !(await fileMatchesChecksum(archivePath, tool))) {
    await downloadTo(resolveToolUrls(tool, env), archivePath, tool, logger);
  } else {
    logger.log(`[tools] reusing verified archive for ${tool.id}`);
  }

  // Extract into a temp dir next to the target, then swap it in. This keeps a
  // failed extraction from leaving a directory that looks usable.
  await mkdir(resolveToolsDir(env), { recursive: true });
  const stagingParent = await mkdtemp(join(resolveToolsDir(env), ".staging-"));
  const stagingDir = resolve(stagingParent, "payload");
  await mkdir(stagingDir, { recursive: true });

  try {
    await extractToolArchive(tool, archivePath, stagingDir, logger);
    await rm(targetDir, { force: true, recursive: true });
    await rename(stagingDir, targetDir);
  } finally {
    await rm(stagingParent, { force: true, recursive: true });
  }

  state.tools = state.tools ?? {};
  state.tools[tool.id] = {
    sha512: tool.sha512 ?? null,
    fileName: tool.fileName,
    extractedAt: new Date().toISOString(),
  };
  await writeState(state, env);

  logger.log(`[tools] ${tool.id} ready at ${targetDir}`);
  return { id: tool.id, status: "installed", path: targetDir };
}

async function fileMatchesChecksum(filePath, tool) {
  if (!tool.sha512) {
    return true;
  }
  try {
    return (await sha512Base64(filePath)) === tool.sha512;
  } catch {
    return false;
  }
}

/**
 * Ensure every tool required by `profile` (for example `installer`) is present.
 * Returns the resolved tool paths and publishes helper executables on PATH.
 */
export async function ensureTools({ profile = "installer", env = process.env, logger = console, force = false } = {}) {
  const ids = toolIdsForProfile(profile);
  const results = [];

  for (const id of ids) {
    const tool = TOOL_CATALOG.find((entry) => entry.id === id);
    if (!tool) {
      throw new Error(`[tools] unknown tool id: ${id}`);
    }
    results.push(await ensureTool(tool, { env, logger, force }));
  }

  return results;
}

/** Resolve a tool directory, failing with an actionable message when absent. */
export function requireToolDir(toolId, env = process.env) {
  const dir = toolDir(toolId, env);
  if (!existsSync(dir)) {
    throw new Error(
      `[tools] ${toolId} is not prepared. Run: node scripts/tools/tool-bootstrap.mjs`,
    );
  }
  return dir;
}

export { resolveSevenZip };

// ---------------------------------------------------------------------------
// CLI entry point
//
//   node scripts/tools/tool-bootstrap.mjs            # prepare installer toolset
//   node scripts/tools/tool-bootstrap.mjs --list     # show catalog + cache status
//   node scripts/tools/tool-bootstrap.mjs --check    # report readiness only, no download
//   node scripts/tools/tool-bootstrap.mjs --force    # redownload everything
// ---------------------------------------------------------------------------

/** True when every tool required by the installer profile is already extracted. */
function allInstallerToolsPresent() {
  return TOOL_CATALOG.filter((tool) => tool.requiredFor.includes("installer")).every((tool) =>
    existsSync(builderBundleDir(tool)),
  );
}

function printCatalog() {
  const toolsDir = resolveToolsDir();
  console.log(`[tools] cache: ${toolsDir}`);
  console.log("");

  for (const tool of TOOL_CATALOG) {
    const present = existsSync(builderBundleDir(tool));
    console.log(`${tool.id.padEnd(18)} ${(present ? "present" : "missing").padEnd(8)} ${tool.fileName}`);
    console.log(`  ${tool.description}`);
  }

  console.log("");
  console.log(`[tools] required for installer: ${toolIdsForProfile("installer").join(", ")}`);
}

async function runCli(argv) {
  if (argv.includes("--list")) {
    printCatalog();
    return;
  }

  // `--check` reports readiness without downloading, so a caller (for example
  // build-installer.bat) can decide whether to prepare tools before committing
  // to a long build. Exits non-zero when anything is missing.
  if (argv.includes("--check")) {
    const ready = allInstallerToolsPresent();
    printCatalog();
    console.log("");
    console.log(`[tools] ready=${ready}`);
    if (!ready) {
      console.log("[tools] run: pnpm tools:bootstrap");
      process.exitCode = 1;
    }
    return;
  }

  const force = argv.includes("--force");
  console.log(`[tools] preparing: ${toolIdsForProfile("installer").join(", ")}`);

  const results = await ensureTools({ profile: "installer", force });
  for (const result of results) {
    console.log(`[tools] ${result.id}: ${result.status}`);
  }

  if (process.platform === "win32") {
    try {
      resolveSevenZip();
      const shim = await ensureSevenZipShim({ binDirectory: binDir() });
      console.log(`[tools] 7za shim: ${shim ?? "not available (cargo missing)"}`);
    } catch (error) {
      console.warn(`[tools] 7za shim skipped: ${error.message}`);
    }
  }

  console.log("[tools] done");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await runCli(process.argv.slice(2));
}