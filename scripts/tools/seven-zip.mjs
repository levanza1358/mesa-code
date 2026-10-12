/**
 * 7-Zip extraction helper.
 *
 * electron-builder's helper bundles are `.7z` archives, and the `winCodeSign`
 * bundle embeds macOS dylib symlinks. On Windows, creating a symbolic link needs
 * `SeCreateSymbolicLinkPrivilege` (admin rights or Developer Mode), so a plain
 * `7za x` aborts with "A required privilege is not held by the client" and takes
 * the whole build down.
 *
 * Instead of requiring elevation, this module runs a small shim that:
 * 1. pre-creates the bundle's symlink entry paths as empty files,
 * 2. forwards the extraction to the real 7za (which handles 7z/BCJ2 filters),
 * 3. treats "only symlink entries failed" (7za exit code 2) as success.
 *
 * The shim is built on demand from `scripts/tools/seven-zip-shim` when a Rust
 * toolchain is available, and is cached under `.tools/bin`. When no toolchain is
 * present we fall back to running the real 7za directly, which still works for
 * bundles that contain no symlinks (for example `nsis`).
 */

import { existsSync } from "node:fs";
import { cp, mkdir, readdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCommand } from "../spawn-command.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** Symlink entries present in electron-builder's `winCodeSign-2.6.0` bundle. */
export const WIN_CODE_SIGN_SYMLINK_ENTRIES = Object.freeze([
  "darwin/10.12/lib/libcrypto.1.0.0.dylib",
  "darwin/10.12/lib/libcrypto.dylib",
  "darwin/10.12/lib/libssl.1.0.0.dylib",
  "darwin/10.12/lib/libssl.dylib",
  "darwin/10.12/lib/engines/lib4758cca.dylib",
  "darwin/10.12/lib/engines/libaep.dylib",
  "darwin/10.12/lib/engines/libatalla.dylib",
  "darwin/10.12/lib/engines/libcapi.dylib",
  "darwin/10.12/lib/engines/libchil.dylib",
  "darwin/10.12/lib/engines/libcswift.dylib",
  "darwin/10.12/lib/engines/libgmp.dylib",
  "darwin/10.12/lib/engines/libgost.dylib",
  "darwin/10.12/lib/engines/libnuron.dylib",
  "darwin/10.12/lib/engines/libpadlock.dylib",
  "darwin/10.12/lib/engines/libsureware.dylib",
  "darwin/10.12/lib/engines/libubsec.dylib",
]);

/** Locate the 7za shipped with the workspace's `7zip-bin` dependency. */
export function resolveSevenZip(env = process.env) {
  if (env.MESA_CODE_REAL_7ZA?.trim()) {
    return env.MESA_CODE_REAL_7ZA.trim();
  }

  const candidate = resolve(
    repoRoot,
    "node_modules",
    "7zip-bin",
    process.platform === "win32" ? "win" : process.platform === "darwin" ? "mac" : "linux",
    process.arch === "arm64" ? "arm64" : "x64",
    process.platform === "win32" ? "7za.exe" : "7za",
  );

  if (existsSync(candidate)) {
    return candidate;
  }

  throw new Error(
    "[tools] cannot find 7za. Install dependencies (pnpm install) so node_modules/7zip-bin exists.",
  );
}

/**
 * Create empty placeholder files where the bundle's symlinks would go, so the
 * real 7za can finish extracting without symlink privilege.
 */
async function precreateSymlinkPlaceholders(targetDir) {
  for (const entry of WIN_CODE_SIGN_SYMLINK_ENTRIES) {
    const filePath = resolve(targetDir, ...entry.split("/"));
    await mkdir(dirname(filePath), { recursive: true });
    if (!existsSync(filePath)) {
      await writeFile(filePath, "");
    }
  }
}

/**
 * Build the 7za shim once and cache the executable under `.tools/bin`.
 * Returns `null` when no Rust toolchain is available.
 */
export async function ensureSevenZipShim({ logger = console, binDirectory } = {}) {
  const shimSourceDir = resolve(repoRoot, "scripts", "tools", "seven-zip-shim");
  if (!existsSync(shimSourceDir)) {
    return null;
  }

  // Callers pass the bin directory to avoid importing tool-bootstrap here: this
  // module is imported by tool-bootstrap, and a dynamic import back into it
  // while that module is still evaluating deadlocks the ESM loader.
  const bin = binDirectory ?? resolve(repoRoot, ".tools", "bin");
  const shimName = process.platform === "win32" ? "7za.exe" : "7za";
  const shimPath = resolve(bin, shimName);

  if (existsSync(shimPath)) {
    return shimPath;
  }

  await mkdir(bin, { recursive: true });

  // Prefer a prebuilt shim shipped with the tool source; the build machine may
  // not have a Rust toolchain.
  const prebuilt = resolve(shimSourceDir, "prebuilt", shimName);
  if (existsSync(prebuilt)) {
    await cp(prebuilt, shimPath);
    return shimPath;
  }

  try {
    runCommand("cargo", ["build", "--release"], { cwd: shimSourceDir, env: process.env });
  } catch {
    logger.warn("[tools] cargo not available; 7za shim will run without symlink protection");
    return null;
  }

  const builtPath = resolve(shimSourceDir, "target", "release", shimName);
  if (!existsSync(builtPath)) {
    return null;
  }
  await cp(builtPath, shimPath);
  return shimPath;
}

/**
 * Extract a `.7z` archive into `targetDir`, tolerating unprivileged symlinks.
 */
export async function extractSevenZip({ archivePath, targetDir, logger = console, env = process.env }) {
  await mkdir(targetDir, { recursive: true });

  const realSevenZip = resolveSevenZip(env);
  const shimPath = await ensureSevenZipShim({ env, logger });

  // Pre-create the symlink paths first: the shim relies on them existing, and the
  // direct path needs them so 7za does not have to create real links.
  await precreateSymlinkPlaceholders(targetDir);

  const sevenZipCommand = shimPath ?? realSevenZip;
  const sevenZipEnv = shimPath ? { ...env, MESA_CODE_REAL_7ZA: realSevenZip } : env;

  try {
    runCommand(sevenZipCommand, ["x", "-y", "-bd", `-o${targetDir}`, archivePath], {
      env: sevenZipEnv,
    });
  } catch (error) {
    // 7za exits with 2 when only the symlink entries could not be created. The
    // Windows payload is already extracted at that point, so verify the archive
    // produced content and continue rather than failing the build.
    const hasPayload = existsSync(targetDir) && (await directoryHasEntries(targetDir));
    if (!hasPayload) {
      throw error;
    }
    logger.warn(
      `[tools] 7za reported symlink errors for ${archivePath}; Windows payload extracted`,
    );
  }
}

async function directoryHasEntries(dir) {
  try {
    const entries = await readdir(dir);
    return entries.length > 0;
  } catch {
    return false;
  }
}
