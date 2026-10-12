import { execFile } from "node:child_process";
import { existsSync } from "node:fs";

/**
 * Read-only Tailscale detection.
 *
 * `tailscale status --json` is the authoritative source: absence of the CLI means
 * "not installed"; any other failure means the CLI exists but the daemon is down
 * or not logged in. We never install or modify anything here — installing is a
 * separate, admin-elevated step (see the spec).
 *
 * A packaged desktop app launched from a GUI (Windows Start menu, macOS Finder)
 * frequently does NOT inherit the shell PATH, so `tailscale` is often installed
 * but not on PATH. Detection therefore tries PATH first and then the platform's
 * default install locations.
 */

export interface TailscaleProbeResult {
  installed: boolean;
  running: boolean;
  addresses: string[];
  executablePath: string | null;
}

export type TailscaleProbe = () => Promise<TailscaleProbeResult>;

const PROBE_TIMEOUT_MS = 3000;

interface TailscaleStatusJson {
  BackendState?: string;
  Self?: { TailscaleIPs?: string[] };
}

/** Default install locations, checked when `tailscale` is not on PATH. */
export function tailscaleExecutableCandidates(platform: NodeJS.Platform): string[] {
  switch (platform) {
    case "win32":
      return [
        "C:\\Program Files\\Tailscale\\tailscale.exe",
        "C:\\Program Files (x86)\\Tailscale\\tailscale.exe",
      ];
    case "darwin":
      return [
        "/Applications/Tailscale.app/Contents/MacOS/Tailscale",
        "/usr/local/bin/tailscale",
        "/opt/homebrew/bin/tailscale",
        "/Applications/Tailscale.app/Contents/MacOS/tailscale",
      ];
    default:
      return ["/usr/bin/tailscale", "/usr/local/bin/tailscale", "/sbin/tailscale"];
  }
}

/**
 * Resolve the `tailscale` executable. Returns the bare command name when it is on
 * PATH (checked via PATHEXT-aware `existsSync` fallbacks only for absolute paths),
 * otherwise the first existing default install location, otherwise null.
 */
export function resolveTailscaleExecutable(
  platform: NodeJS.Platform = process.platform,
  exists: (path: string) => boolean = existsSync,
): string | null {
  for (const candidate of tailscaleExecutableCandidates(platform)) {
    if (exists(candidate)) {
      return candidate;
    }
  }
  return null;
}

export const probeTailscale: TailscaleProbe = () =>
  new Promise<TailscaleProbeResult>((resolve) => {
    // An explicit install path wins over PATH so a GUI-launched app finds a
    // Tailscale that the shell PATH would otherwise hide; "tailscale" is the
    // PATH fallback.
    const executable = resolveTailscaleExecutable() ?? "tailscale";
    execFile(
      executable,
      ["status", "--json"],
      { timeout: PROBE_TIMEOUT_MS, windowsHide: true },
      (error, stdout) => {
        if (error) {
          const code = (error as NodeJS.ErrnoException).code;
          // ENOENT (POSIX) and its Windows equivalent both surface as "not found".
          const notInstalled = code === "ENOENT";
          resolve({
            installed: !notInstalled,
            running: false,
            addresses: [],
            executablePath: notInstalled ? null : executable,
          });
          return;
        }
        try {
          const status = JSON.parse(stdout) as TailscaleStatusJson;
          // Keep IPv4 only; the listener is IPv4 (networkUrls in the runner are IPv4 too).
          const addresses = (status.Self?.TailscaleIPs ?? []).filter((ip) => ip.includes("."));
          resolve({
            installed: true,
            running: status.BackendState === "Running",
            addresses,
            executablePath: executable,
          });
        } catch {
          resolve({ installed: true, running: false, addresses: [], executablePath: executable });
        }
      },
    );
  });
