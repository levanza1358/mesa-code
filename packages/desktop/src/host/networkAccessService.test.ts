import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import type { AppSettings } from "@mesa-code/shared";
import { ServiceCollection, type ISettingService } from "@mesa-code/services";
import type { TailscaleProbe } from "./tailscaleProbe.js";
import { createNetworkAccessService, resolveWebStaticRoot } from "./networkAccessService.js";

/**
 * Lifecycle coverage for the LAN / Tailscale listener.
 *
 * The service is the single owner of the listener AND of the three persisted
 * fields, so these tests drive it through a fake ISettingService and assert the
 * listener follows the setting: enabling binds a port, a port change rebinds,
 * disabling releases it, and a remote workspace never binds at all.
 *
 * The Tailscale probe is injected, so no `tailscale` binary is needed. The host
 * is loopback so the sandbox never needs a routable interface.
 */

const NO_TAILSCALE: TailscaleProbe = async () => ({
  installed: false,
  running: false,
  addresses: [],
  executablePath: null,
});

function fakeSettingService(initial: Partial<AppSettings> = {}) {
  let settings = { ...initial } as AppSettings;
  const service: ISettingService = {
    get: async () => settings,
    update: async (patch) => {
      settings = { ...settings, ...patch };
    },
    updateDataBaseDir: async () => {},
    ensureDefaultProject: async () => ({ path: "", created: false }),
  };
  return service;
}

function createService(
  overrides: {
    initial?: Partial<AppSettings>;
    staticRoot?: () => string | undefined;
    remote?: boolean;
    probeTailscale?: TailscaleProbe;
    buildInstallPlan?: Parameters<typeof createNetworkAccessService>[0]["buildInstallPlan"];
    runInstall?: Parameters<typeof createNetworkAccessService>[0]["runInstall"];
  } = {},
) {
  const settings = fakeSettingService({
    networkAccessHost: "127.0.0.1",
    networkAccessPort: 0,
    ...overrides.initial,
  });
  return createNetworkAccessService({
    services: new ServiceCollection(),
    settingService: settings,
    resolveStaticRoot: overrides.staticRoot ?? (() => "/nonexistent-placeholder"),
    isRemoteWorkspace: () => overrides.remote === true,
    probeTailscale: overrides.probeTailscale ?? NO_TAILSCALE,
    ...(overrides.buildInstallPlan ? { buildInstallPlan: overrides.buildInstallPlan } : {}),
    ...(overrides.runInstall ? { runInstall: overrides.runInstall } : {}),
  });
}

async function withStaticRoot<T>(run: (root: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), "mesa-web-root-"));
  await writeFile(join(dir, "index.html"), "<!doctype html><title>probe</title>");
  try {
    return await run(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("enabling binds a port, disabling releases it", async () => {
  await withStaticRoot(async (root) => {
    const service = createService({ staticRoot: () => root });

    const enabled = await service.setEnabled(true);
    assert.equal(enabled.enabled, true);
    assert.equal(enabled.listening, true);
    assert.ok(typeof enabled.boundPort === "number" && enabled.boundPort > 0);
    assert.equal(enabled.error, null);

    const disabled = await service.setEnabled(false);
    assert.equal(disabled.listening, false);
    assert.equal(disabled.boundPort, null);
    assert.deepEqual(disabled.addresses, []);

    service.disposeAll();
  });
});

test("changing the port rebinds the listener to the new port", async () => {
  await withStaticRoot(async (root) => {
    const service = createService({
      initial: { networkAccessEnabled: true },
      staticRoot: () => root,
    });

    const first = await service.getState();
    assert.equal(first.listening, true);
    const firstPort = first.boundPort;
    assert.ok(typeof firstPort === "number" && firstPort > 0);

    const rebound = await service.setPort(firstPort + 1);
    assert.equal(rebound.port, firstPort + 1);
    assert.equal(rebound.listening, true);
    assert.equal(rebound.boundPort, firstPort + 1);

    service.disposeAll();
  });
});

test("a remote workspace never starts the listener even when enabled", async () => {
  await withStaticRoot(async (root) => {
    const service = createService({
      initial: { networkAccessEnabled: true },
      staticRoot: () => root,
      remote: true,
    });

    const state = await service.getState();
    assert.equal(state.remoteWorkspace, true);
    assert.equal(state.listening, false);
    assert.equal(state.boundPort, null);

    service.disposeAll();
  });
});

test("a missing web bundle surfaces a clear error instead of binding", async () => {
  const service = createService({
    initial: { networkAccessEnabled: true },
    staticRoot: () => undefined,
  });

  const state = await service.getState();
  assert.equal(state.listening, false);
  assert.match(state.error ?? "", /Web client bundle not found/);

  service.disposeAll();
});

test("state listeners are notified and can unsubscribe", async () => {
  await withStaticRoot(async (root) => {
    const service = createService({ staticRoot: () => root });

    const seen: boolean[] = [];
    // The service exposes RPC-style events: subscribing returns an IDisposable.
    const subscription = service.onStateChanged((state) => seen.push(state.listening));
    await service.setEnabled(true);
    assert.deepEqual(seen, [true]);

    subscription.dispose();
    await service.setEnabled(false);
    assert.deepEqual(seen, [true], "an unsubscribed listener must not fire again");

    service.disposeAll();
  });
});

test("resolveWebStaticRoot honours MESA_CODE_WEB_STATIC_ROOT only when it exists", async () => {
  await withStaticRoot(async (root) => {
    assert.equal(resolveWebStaticRoot({ MESA_CODE_WEB_STATIC_ROOT: root }), root);
  });
  const missing = "/definitely/missing/mesa-web-root";
  assert.notEqual(resolveWebStaticRoot({ MESA_CODE_WEB_STATIC_ROOT: missing }), missing);
});

test("installTailscale reports the manual fallback when no command is available", async () => {
  const service = createService({
    buildInstallPlan: () => ({
      supported: false,
      manualUrl: "https://tailscale.com/download",
      reason: "no package manager",
    }),
  });
  const states: string[] = [];
  service.onInstallStateChanged((install) => states.push(install.phase));

  const state = await service.installTailscale();
  assert.equal(state.tailscale.installed, false);
  assert.equal(state.install?.phase, "failed");
  assert.match(state.install?.message ?? "", /install manually/i);
  assert.deepEqual(states, ["failed"]);
});

test("installTailscale runs the plan and verifies honestly on success", async () => {
  let probedInstalled = false;
  let sawVerify = false;
  const service = createService({
    buildInstallPlan: () => ({
      supported: true,
      plan: { command: "winget", args: ["install"], manualUrl: "https://tailscale.com/download" },
    }),
    // The runner is responsible for emitting the terminal state (the real
    // runTailscaleInstall does); here the installer "succeeds" (flips the probe
    // result) and then verify() is what observes it.
    runInstall: async ({ plan, onState, verify }) => {
      assert.equal(plan.command, "winget");
      onState({ phase: "installing", message: "45%", percent: 45, manualUrl: plan.manualUrl });
      probedInstalled = true;
      sawVerify = await verify();
      onState({
        phase: sawVerify ? "done" : "failed",
        message: sawVerify ? "Tailscale installed." : "not detected",
        percent: sawVerify ? 100 : null,
        manualUrl: plan.manualUrl,
      });
    },
    probeTailscale: async () => ({
      installed: probedInstalled,
      running: probedInstalled,
      addresses: probedInstalled ? ["100.101.102.103"] : [],
      executablePath: probedInstalled ? "C:\\Program Files\\Tailscale\\tailscale.exe" : null,
    }),
  });

  const state = await service.installTailscale();
  assert.equal(sawVerify, true);
  assert.equal(state.install?.phase, "done");
  assert.equal(state.tailscale.installed, true);
});

test("installTailscale does not fabricate success when verification fails", async () => {
  const service = createService({
    buildInstallPlan: () => ({
      supported: true,
      plan: { command: "brew", args: ["install", "--cask", "tailscale"], manualUrl: "u" },
    }),
    runInstall: async ({ plan, onState, verify }) => {
      const installed = await verify(); // the probe still reports not installed
      onState({
        phase: installed ? "done" : "failed",
        message: installed ? "done" : "not detected",
        percent: null,
        manualUrl: plan.manualUrl,
      });
    },
    probeTailscale: NO_TAILSCALE,
  });

  const state = await service.installTailscale();
  assert.equal(state.tailscale.installed, false);
  assert.equal(state.install?.phase, "failed");
  assert.match(state.install?.message ?? "", /not detected/i);
});

test("installTailscale short-circuits when Tailscale is already present", async () => {
  let ran = false;
  const service = createService({
    probeTailscale: async () => ({
      installed: true,
      running: true,
      addresses: ["100.1.2.3"],
      executablePath: "tailscale",
    }),
    buildInstallPlan: () => {
      throw new Error("must not build a plan when already installed");
    },
    runInstall: async () => {
      ran = true;
    },
  });
  await service.getState(); // populate the tailscale status
  const state = await service.installTailscale();
  assert.equal(ran, false);
  assert.equal(state.install?.phase, "done");
  assert.equal(state.tailscale.installed, true);
});
