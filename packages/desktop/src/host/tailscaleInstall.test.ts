import assert from "node:assert/strict";
import test from "node:test";
import type { TailscaleInstallState } from "@mesa-code/services";
import { resolveTailscaleExecutable, tailscaleExecutableCandidates } from "./tailscaleProbe.js";
import {
  buildTailscaleInstallPlan,
  parseInstallPercent,
  runTailscaleInstall,
} from "./tailscaleInstall.js";

/**
 * Detection and install-plan coverage for the Network feature.
 *
 * A packaged desktop app launched from a GUI often does not inherit the shell
 * PATH, so detection must also find Tailscale at the platform's default install
 * location — the exact case where "installed but reported as missing" happened.
 */

test("resolveTailscaleExecutable checks PATH-adjacent default locations per platform", () => {
  const alwaysFalse = () => false;
  assert.equal(resolveTailscaleExecutable("win32", alwaysFalse), null);

  const winFound = resolveTailscaleExecutable(
    "win32",
    (p) => p === "C:\\Program Files\\Tailscale\\tailscale.exe",
  );
  assert.equal(winFound, "C:\\Program Files\\Tailscale\\tailscale.exe");

  const macFound = resolveTailscaleExecutable(
    "darwin",
    (p) => p === "/Applications/Tailscale.app/Contents/MacOS/Tailscale",
  );
  assert.equal(macFound, "/Applications/Tailscale.app/Contents/MacOS/Tailscale");

  const linuxFound = resolveTailscaleExecutable("linux", (p) => p === "/usr/bin/tailscale");
  assert.equal(linuxFound, "/usr/bin/tailscale");
});

test("tailscaleExecutableCandidates returns the platform's known install paths", () => {
  assert.ok(
    tailscaleExecutableCandidates("win32").includes("C:\\Program Files\\Tailscale\\tailscale.exe"),
  );
  assert.ok(
    tailscaleExecutableCandidates("darwin").includes(
      "/Applications/Tailscale.app/Contents/MacOS/Tailscale",
    ),
  );
  assert.ok(tailscaleExecutableCandidates("linux").includes("/usr/bin/tailscale"));
  assert.deepEqual(tailscaleExecutableCandidates("freebsd"), [
    "/usr/bin/tailscale",
    "/usr/local/bin/tailscale",
    "/sbin/tailscale",
  ]);
});

test("buildTailscaleInstallPlan uses winget on Windows and brew cask on macOS", () => {
  const win = buildTailscaleInstallPlan("win32");
  assert.equal(win.supported, true);
  if (win.supported) {
    assert.equal(win.plan.command, "winget");
    assert.ok(win.plan.args.includes("Tailscale.Tailscale"));
  }

  const mac = buildTailscaleInstallPlan("darwin");
  assert.equal(mac.supported, true);
  if (mac.supported) {
    assert.equal(mac.plan.command, "brew");
    assert.deepEqual(mac.plan.args, ["install", "--cask", "tailscale"]);
  }
});

test("buildTailscaleInstallPlan offers the manual link when a package manager is missing", () => {
  const noWinget = buildTailscaleInstallPlan("win32", { wingetAvailable: false });
  assert.equal(noWinget.supported, false);
  assert.match(noWinget.supported === false ? noWinget.reason : "", /winget/i);

  const noBrew = buildTailscaleInstallPlan("darwin", { brewAvailable: false });
  assert.equal(noBrew.supported, false);
  assert.match(noBrew.supported === false ? noBrew.reason : "", /homebrew/i);

  const linux = buildTailscaleInstallPlan("linux");
  assert.equal(linux.supported, false);
  assert.equal(linux.manualUrl, "https://tailscale.com/download");
});

test("parseInstallPercent reads an installer progress percentage", () => {
  assert.equal(parseInstallPercent("Downloading... 45%"), 45);
  assert.equal(parseInstallPercent("  100%  "), 100);
  assert.equal(parseInstallPercent("no percentage here"), null);
  assert.equal(parseInstallPercent("999%"), null);
});

const PLAN = {
  command: "winget",
  args: ["install"],
  manualUrl: "https://tailscale.com/download",
};

test("runTailscaleInstall reports done only after verification succeeds", async () => {
  const states: TailscaleInstallState[] = [];
  await runTailscaleInstall({
    plan: PLAN,
    onState: (state) => states.push(state),
    verify: async () => true,
    run: async (_command, _args, onOutput) => {
      onOutput("Downloading 50%");
      return { exitCode: 0, stderr: "" };
    },
  });
  assert.equal(states.at(-1)?.phase, "done");
  assert.equal(
    states.some((state) => state.percent === 50),
    true,
  );
});

test("runTailscaleInstall reports failure on a non-zero exit", async () => {
  const states: TailscaleInstallState[] = [];
  await runTailscaleInstall({
    plan: PLAN,
    onState: (state) => states.push(state),
    verify: async () => {
      throw new Error("verify must not run after a failed install");
    },
    run: async () => ({ exitCode: 1, stderr: "user cancelled elevation" }),
  });
  assert.equal(states.at(-1)?.phase, "failed");
  assert.match(states.at(-1)?.message ?? "", /code 1/);
});

test("runTailscaleInstall reports failure when the installer finishes without Tailscale", async () => {
  const states: TailscaleInstallState[] = [];
  await runTailscaleInstall({
    plan: PLAN,
    onState: (state) => states.push(state),
    verify: async () => false,
    run: async () => ({ exitCode: 0, stderr: "" }),
  });
  assert.equal(states.at(-1)?.phase, "failed");
  assert.match(states.at(-1)?.message ?? "", /not detected/i);
});

test("runTailscaleInstall reports failure when the command cannot be spawned", async () => {
  const states: TailscaleInstallState[] = [];
  await runTailscaleInstall({
    plan: PLAN,
    onState: (state) => states.push(state),
    verify: async () => true,
    run: async () => {
      throw new Error("spawn winget ENOENT");
    },
  });
  assert.equal(states.at(-1)?.phase, "failed");
  assert.match(states.at(-1)?.message ?? "", /could not run/i);
});
