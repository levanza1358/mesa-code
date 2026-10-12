#!/usr/bin/env node

// Desktop runtime asset: the built web client (packages/web/dist), staged into
// bundled-web/<platform> so electron-builder ships it as resources/web. The
// desktop Host serves it as the static root of the local network listener, so a
// browser can open the real web UI (same @mesa-code/ui Root) and drive the same
// session. See docs/specs/local-network-access.md.

import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { runCommand } from "../../../scripts/spawn-command.mjs";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const desktopRoot = resolve(scriptDir, "..");
const repoRoot = resolve(desktopRoot, "..", "..");
const webDist = resolve(repoRoot, "packages", "web", "dist");

function normalizePlatform(raw) {
  switch (raw) {
    case "mac":
    case "macos":
    case "darwin":
    case "osx":
      return "darwin";
    case "win":
    case "windows":
    case "win32":
      return "win32";
    default:
      return raw || process.platform;
  }
}

function normalizeArch(raw) {
  switch (raw) {
    case "x86_64":
    case "x64":
    case "amd64":
      return "x64";
    case "aarch64":
    case "arm64":
      return "arm64";
    default:
      return raw || process.arch;
  }
}

const platform = normalizePlatform(process.env.MESA_CODE_TARGET_OS || "");
const arch = normalizeArch(process.env.MESA_CODE_TARGET_ARCH || "");
const platformKey = `${platform}-${arch}`;
const targetDir = resolve(desktopRoot, "bundled-web", platformKey);

console.log("[prepare:web-bundle] building @mesa-code/web ...");
runCommand(
  process.platform === "win32" ? "pnpm.cmd" : "pnpm",
  ["--filter", "@mesa-code/web", "build"],
  {
    cwd: repoRoot,
    env: {
      ...process.env,
      // The web build must not fail on a missing optional endpoint config; the
      // server resolves a default origin. Keep the child workspace from re-running
      // install before the filtered build.
      PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN: "false",
    },
  },
);

if (!existsSync(webDist)) {
  throw new Error(`[prepare:web-bundle] expected web build output missing: ${webDist}`);
}

rmSync(targetDir, { recursive: true, force: true });
mkdirSync(targetDir, { recursive: true });
cpSync(webDist, targetDir, {
  recursive: true,
  filter: (source) => !source.endsWith(".map"),
});
console.log(`[prepare:web-bundle] staged web client to ${targetDir}`);
