import { execFile } from "node:child_process";
import type { TailscaleInstallState } from "@mesa-code/services";

/**
 * Tailscale installation (Phase 2).
 *
 * Installing Tailscale needs administrator rights. This module builds the OS
 * command for that and runs it; the operation is intentionally explicit and its
 * result is reported honestly. Where no command is available (an unsupported
 * platform, or a missing package manager), the plan is "unsupported" and the page
 * offers the manual download link instead of pretending to install.
 *
 * The elevated prompt itself comes from the package manager (winget raises UAC for
 * a machine-scope package; Homebrew installs the cask at user scope). A declined
 * prompt surfaces as a non-zero exit / spawn error and is reported as a failure.
 */

/** Download page offered whenever the automatic path cannot run. */
export const TAILSCALE_MANUAL_URL = "https://tailscale.com/download";

export interface TailscaleInstallPlan {
  command: string;
  args: string[];
  manualUrl: string;
}

export interface TailscaleInstallPlanOptions {
  /** Whether `winget` exists on this machine (Windows). Defaults to assumed present. */
  wingetAvailable?: boolean;
  /** Whether `brew` exists on this machine (macOS). Defaults to assumed present. */
  brewAvailable?: boolean;
}

export type TailscaleInstallPlanResult =
  | { supported: true; plan: TailscaleInstallPlan }
  | { supported: false; manualUrl: string; reason: string };

/** Build the install command for a platform, or an "unsupported" result with a manual link. */
export function buildTailscaleInstallPlan(
  platform: NodeJS.Platform,
  options: TailscaleInstallPlanOptions = {},
): TailscaleInstallPlanResult {
  if (platform === "win32") {
    if (options.wingetAvailable === false) {
      return {
        supported: false,
        manualUrl: TAILSCALE_MANUAL_URL,
        reason: "Windows Package Manager (winget) was not found on this machine.",
      };
    }
    return {
      supported: true,
      plan: {
        command: "winget",
        // winget escalates itself (UAC) because the package is machine-scope.
        args: [
          "install",
          "--id",
          "Tailscale.Tailscale",
          "-e",
          "--silent",
          "--accept-package-agreements",
          "--accept-source-agreements",
        ],
        manualUrl: TAILSCALE_MANUAL_URL,
      },
    };
  }
  if (platform === "darwin") {
    if (options.brewAvailable === false) {
      return {
        supported: false,
        manualUrl: TAILSCALE_MANUAL_URL,
        reason: "Homebrew was not found on this machine.",
      };
    }
    return {
      supported: true,
      plan: {
        command: "brew",
        args: ["install", "--cask", "tailscale"],
        manualUrl: TAILSCALE_MANUAL_URL,
      },
    };
  }
  return {
    supported: false,
    manualUrl: TAILSCALE_MANUAL_URL,
    reason: "Automatic Tailscale installation is not supported on this platform yet.",
  };
}

/** Read an installer progress percentage (e.g. winget's `45%`) from an output chunk. */
export function parseInstallPercent(chunk: string): number | null {
  const match = chunk.match(/(\d{1,3})\s*%/);
  if (!match) {
    return null;
  }
  const value = Number(match[1]);
  return Number.isInteger(value) && value >= 0 && value <= 100 ? value : null;
}

export interface TailscaleInstallOutput {
  exitCode: number;
  stderr: string;
}

export type TailscaleInstallRunner = (
  command: string,
  args: string[],
  onOutput: (chunk: string) => void,
) => Promise<TailscaleInstallOutput>;

export interface TailscaleInstallRunOptions {
  plan: TailscaleInstallPlan;
  onState: (state: TailscaleInstallState) => void;
  /** Re-probe after the installer exits; must return true when Tailscale is now usable. */
  verify: () => Promise<boolean>;
  /** Injectable for tests. */
  run?: TailscaleInstallRunner;
}

const INSTALL_TIMEOUT_MS = 10 * 60_000;

const defaultRunner: TailscaleInstallRunner = (command, args, onOutput) =>
  new Promise<TailscaleInstallOutput>((resolve, reject) => {
    execFile(
      command,
      args,
      { timeout: INSTALL_TIMEOUT_MS, windowsHide: true, maxBuffer: 4 * 1024 * 1024 },
      (error, stdout, stderr) => {
        // A spawn failure (command missing) surfaces as a string `code`; a
        // completed-but-failing process surfaces as a numeric `code`. The former
        // is "could not run", the latter is a normal returned outcome.
        if (error && typeof error.code === "string") {
          reject(error);
          return;
        }
        onOutput(stdout);
        const exitCode = error ? Number(error.code ?? 1) : 0;
        resolve({
          exitCode: Number.isInteger(exitCode) ? exitCode : 1,
          stderr: `${stderr}${stdout}`,
        });
      },
    );
  });

/** Run an install plan, emitting progress, and verify the result honestly. */
export async function runTailscaleInstall(options: TailscaleInstallRunOptions): Promise<void> {
  const { plan, onState, verify } = options;
  const run = options.run ?? defaultRunner;
  onState({
    phase: "installing",
    message: `Running ${plan.command} ${plan.args.join(" ")} …`,
    percent: null,
    manualUrl: plan.manualUrl,
  });

  let output: TailscaleInstallOutput;
  try {
    output = await run(plan.command, plan.args, (chunk) => {
      const percent = parseInstallPercent(chunk);
      const line = chunk.trim().split("\n").pop()?.trim() ?? "";
      onState({
        phase: "installing",
        message: line.length > 0 ? line : "Installing…",
        percent,
        manualUrl: plan.manualUrl,
      });
    });
  } catch (cause) {
    onState({
      phase: "failed",
      message: `Could not run ${plan.command}: ${
        cause instanceof Error ? cause.message : String(cause)
      }. Install manually from ${plan.manualUrl}.`,
      percent: null,
      manualUrl: plan.manualUrl,
    });
    return;
  }

  if (output.exitCode !== 0) {
    const detail = output.stderr.trim().split("\n").slice(-3).join(" ");
    onState({
      phase: "failed",
      message: `${plan.command} exited with code ${output.exitCode}${
        detail ? `: ${detail}` : ""
      }. Install manually from ${plan.manualUrl}.`,
      percent: null,
      manualUrl: plan.manualUrl,
    });
    return;
  }

  onState({
    phase: "verifying",
    message: "Verifying Tailscale…",
    percent: 100,
    manualUrl: plan.manualUrl,
  });
  const installed = await verify();
  onState(
    installed
      ? { phase: "done", message: "Tailscale installed.", percent: 100, manualUrl: plan.manualUrl }
      : {
          phase: "failed",
          message: `The installer finished but Tailscale was not detected. Install manually from ${plan.manualUrl}.`,
          percent: null,
          manualUrl: plan.manualUrl,
        },
  );
}
