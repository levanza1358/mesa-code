/**
 * Shared app.asar rewrite staging.
 *
 * `afterPack` needs to modify the packaged asar twice: once to inject hoisted
 * runtime modules that electron-builder missed, and once to strip sourcemap
 * references. Doing those as two independent extract/pack cycles is what made
 * packaging slow — the archive holds ~27,000 files, so each cycle reads and
 * rewrites ~300 MB.
 *
 * This module runs both fixes inside one extract and one repack. The callers
 * pass their mutations as functions over the staged directory; the module owns
 * the extract/pack lifecycle so the archive is touched exactly once.
 */

import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { replaceAppAsarFromStaging } from "./app-asar-repack.mjs";

/**
 * Extract `appAsarPath` into a staging directory, run each mutator, and repack
 * only when at least one mutator reported a change.
 *
 * @param {object} options
 * @param {string} options.appAsarPath      Absolute path to the packed asar.
 * @param {string} options.targetPlatformKey Platform key for the unpack glob (for example `win32-x64`).
 * @param {Array<(stagingDir: string) => {changed: boolean}}>} options.mutators
 *        Functions that mutate the staged tree and report whether anything changed.
 * @param {(args: string[]) => void} options.runAsarCommand
 * @param {(label: string, task: () => unknown) => unknown} options.runTimedSync
 * @param {(label: string, task: () => Promise<unknown>) => Promise<unknown>} options.runTimedAsync
 * @param {Console} [options.logger]
 * @returns {Promise<boolean>} Whether the archive was rewritten.
 */
export async function rewriteAppAsarOnce({
  appAsarPath,
  targetPlatformKey,
  mutators,
  runAsarCommand,
  runTimedSync,
  runTimedAsync,
  logger = console,
}) {
  // CI sometimes points TMPDIR at a project-local directory that the runner may
  // have cleaned before the script starts, so create the parent defensively.
  mkdirSync(tmpdir(), { recursive: true });
  const stagingDir = mkdtempSync(resolve(tmpdir(), "mesa-code-app-asar-"));

  try {
    runTimedSync("afterPack:asar-extract", () =>
      runAsarCommand(["extract", appAsarPath, stagingDir]),
    );

    let changed = false;
    for (const mutate of mutators) {
      const result = mutate(stagingDir);
      if (result?.changed) {
        changed = true;
      }
    }

    if (!changed) {
      logger.log("[afterPack] no asar changes required, skip repack");
      return false;
    }

    await runTimedAsync("afterPack:asar-pack", () =>
      replaceAppAsarFromStaging({
        sourceDir: stagingDir,
        appAsarPath,
        targetPlatformKey,
        runAsarCommand,
      }),
    );
    return true;
  } finally {
    rmSync(stagingDir, { force: true, recursive: true });
  }
}

/** True when the packaged asar exists. */
export function appAsarExists(appAsarPath) {
  return existsSync(appAsarPath);
}
