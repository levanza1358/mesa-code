import { existsSync } from "node:fs";
import type { Server } from "node:http";
import { join } from "node:path";
import { Emitter } from "@mesa-code/rpc";
import { createHttpServer } from "@mesa-code/server";
import type {
  INetworkAccessService,
  ISettingService,
  ServiceCollection,
} from "@mesa-code/services";
import type {
  NetworkAccessState,
  TailscaleInstallState,
  TailscaleStatus,
} from "@mesa-code/services";
import { collectLocalAddresses, formatAccessUrl } from "./networkAccessAddresses.js";
import { probeTailscale, type TailscaleProbe } from "./tailscaleProbe.js";
import {
  buildTailscaleInstallPlan,
  runTailscaleInstall,
  TAILSCALE_MANUAL_URL,
} from "./tailscaleInstall.js";

/**
 * Host implementation of local network access (LAN / Tailscale).
 *
 * It starts `@mesa-code/server`'s HTTP+WS server, backed by the window Host's
 * own service collection and static web build, so a browser opening
 * `http://<ip>:<port>` gets the real web client and connects to the same-origin
 * `/ws` endpoint — the SAME session as the desktop window (web-remote-replayable).
 *
 * Single owner: this service owns the listener AND the three persisted fields
 * (networkAccessEnabled / networkAccessHost / networkAccessPort), which it
 * writes through `ISettingService`. There is no second write path.
 *
 * SECURITY: there is NO authentication. Enabling this lets anyone who can reach
 * the address drive the session. See docs/specs/local-network-access.md.
 */

const DEFAULT_HOST = "0.0.0.0";
const TAILSCALE_PROBE_TTL_MS = 15_000;

export interface CreateNetworkAccessServiceOptions {
  /** The window Host's own services; exposed over the LAN listener. */
  services: ServiceCollection;
  /** Persisted preference source (enabled flag, host, port). */
  settingService: ISettingService;
  /** Resolve the built web client's static root, or undefined when unavailable. */
  resolveStaticRoot: () => string | undefined;
  /** True when the active workspace is remote (SSH/WSL/docker); access is unavailable there. */
  isRemoteWorkspace: () => boolean;
  /** Injectable for tests. */
  probeTailscale?: TailscaleProbe;
  /** Per-platform install plan builder; injectable for tests. */
  buildInstallPlan?: typeof buildTailscaleInstallPlan;
  /** Install runner; injectable for tests. Defaults to the real process runner. */
  runInstall?: typeof runTailscaleInstall;
  log?: (message: string) => void;
}

interface NetworkSettings {
  enabled: boolean;
  host: string;
  port: number;
}

/** Resolve the built web client directory following the bundled-resource conventions. */
export function resolveWebStaticRoot(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const fromEnv = env.MESA_CODE_WEB_STATIC_ROOT?.trim();
  if (fromEnv && existsSync(fromEnv)) {
    return fromEnv;
  }
  const resourcesPath = (process as NodeJS.Process & { resourcesPath?: string }).resourcesPath;
  const candidates: string[] = [];
  if (resourcesPath) {
    candidates.push(join(resourcesPath, "web"));
  }
  // Dev/run-from-source: out/host -> packages/web/dist, plus cwd-based fallbacks.
  candidates.push(join(import.meta.dirname, "../../../web/dist"));
  candidates.push(join(process.cwd(), "packages", "web", "dist"));
  candidates.push(join(process.cwd(), "web"));
  return candidates.find((candidate) => existsSync(candidate));
}

function normalizePort(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 65535
    ? value
    : 0;
}

export function createNetworkAccessService(
  options: CreateNetworkAccessServiceOptions,
): INetworkAccessService {
  const { services, settingService, resolveStaticRoot, isRemoteWorkspace } = options;
  const probe = options.probeTailscale ?? probeTailscale;
  const buildInstallPlan = options.buildInstallPlan ?? buildTailscaleInstallPlan;
  const runInstall = options.runInstall ?? runTailscaleInstall;
  const log = options.log ?? (() => {});

  // State/install progress are Emitters exposed as `Event`s on the service, so the
  // renderer RPC proxy (ProxyChannel.fromService/toService) maps them to channel
  // `listen` subscriptions and hands the caller an IDisposable. A hand-rolled listener
  // Set with an unsubscribe function did not survive that proxy — see the interface note
  // in packages/services/src/network-access/networkAccess.ts.
  const stateEmitter = new Emitter<NetworkAccessState>();
  const installEmitter = new Emitter<TailscaleInstallState>();

  let server: Server | null = null;
  let boundHost: string | null = null;
  let boundPort: number | null = null;
  let lastError: string | null = null;
  let tailscale: TailscaleStatus = {
    installed: false,
    running: false,
    addresses: [],
    executablePath: null,
  };
  let tailscaleCheckedAt = 0;
  let install: TailscaleInstallState | null = null;
  /** Serialize reconcile() so concurrent reads cannot double-bind the listener. */
  let reconciling: Promise<NetworkAccessState> | null = null;

  async function readSettings(): Promise<NetworkSettings> {
    const settings = await settingService.get();
    return {
      enabled: settings.networkAccessEnabled === true,
      host: settings.networkAccessHost?.trim() || DEFAULT_HOST,
      port: normalizePort(settings.networkAccessPort),
    };
  }

  async function refreshTailscale(): Promise<void> {
    const now = Date.now();
    if (now - tailscaleCheckedAt < TAILSCALE_PROBE_TTL_MS) {
      return;
    }
    const localTailscaleAddresses = collectLocalAddresses()
      .filter((entry) => entry.kind === "tailscale")
      .map((entry) => entry.address);
    const result = await probe();
    const addresses = Array.from(new Set([...localTailscaleAddresses, ...result.addresses]));
    tailscale = {
      installed: result.installed,
      running: result.running || localTailscaleAddresses.length > 0,
      addresses,
      executablePath: result.executablePath,
    };
    tailscaleCheckedAt = now;
  }

  function buildState(settings: NetworkSettings): NetworkAccessState {
    const listening = server !== null && boundPort !== null;
    const displayPort = boundPort ?? settings.port;
    const addresses = collectLocalAddresses()
      .filter((entry) => (entry.kind === "tailscale" ? tailscale.running : true))
      .map((entry) => ({
        kind: entry.kind,
        address: entry.address,
        url: formatAccessUrl(entry.address, displayPort),
      }));
    return {
      enabled: settings.enabled,
      host: settings.host,
      port: settings.port,
      listening,
      boundPort,
      addresses: listening ? addresses : [],
      localUrl: listening && boundPort !== null ? formatAccessUrl("127.0.0.1", boundPort) : null,
      tailscale,
      install,
      error: lastError,
      remoteWorkspace: isRemoteWorkspace(),
    };
  }

  async function emitInstall(state: TailscaleInstallState): Promise<void> {
    install = state;
    installEmitter.fire(state);
  }

  /** Install Tailscale (Phase 2) and re-probe on success. Never claims a false success. */
  async function installTailscale(): Promise<NetworkAccessState> {
    if (tailscale.installed) {
      await emitInstall({
        phase: "done",
        message: "Tailscale is already installed.",
        percent: 100,
        manualUrl: TAILSCALE_MANUAL_URL,
      });
      return reconcile();
    }
    const planResult = buildInstallPlan(process.platform);
    if (!planResult.supported) {
      await emitInstall({
        phase: "failed",
        message: `${planResult.reason} Install manually from ${planResult.manualUrl}.`,
        percent: null,
        manualUrl: planResult.manualUrl,
      });
      return reconcile();
    }
    await runInstall({
      plan: planResult.plan,
      onState: (state) => {
        void emitInstall(state);
      },
      verify: async () => {
        // Force a fresh probe (bypass the TTL) so the result reflects the installer.
        tailscaleCheckedAt = 0;
        await refreshTailscale();
        return tailscale.installed;
      },
    });
    return reconcile();
  }

  async function emit(state: NetworkAccessState): Promise<void> {
    stateEmitter.fire(state);
  }

  async function stopListener(): Promise<void> {
    const current = server;
    server = null;
    boundHost = null;
    boundPort = null;
    if (!current) {
      return;
    }
    await new Promise<void>((resolve) => {
      current.close(() => resolve());
      // close() only stops accepting new connections; an idle keep-alive socket
      // holds the port otherwise. closeAllConnections exists on Node 18+.
      (current as Server & { closeAllConnections?: () => void }).closeAllConnections?.();
    });
  }

  async function startListener(settings: NetworkSettings): Promise<void> {
    lastError = null;
    const staticRoot = resolveStaticRoot();
    if (!staticRoot) {
      lastError =
        "Web client bundle not found. Build the web app (packages/web) before enabling network access.";
      return;
    }
    const next = createHttpServer(services, settings.port, {
      host: settings.host,
      staticRoot,
      spaFallback: true,
      // No authToken by explicit product decision; anyone on the network has
      // full access. See docs/specs/local-network-access.md.
    }) as unknown as Server;

    try {
      if (!next.listening) {
        await new Promise<void>((resolve, reject) => {
          const onListening = () => {
            next.off("error", onError);
            resolve();
          };
          const onError = (cause: Error) => {
            next.off("listening", onListening);
            reject(cause);
          };
          next.once("listening", onListening);
          next.once("error", onError);
        });
      }
      const address = next.address();
      server = next;
      boundHost = settings.host;
      boundPort = typeof address === "object" && address ? address.port : settings.port;
      log(`[network-access] listening on http://${settings.host}:${boundPort}`);
    } catch (cause) {
      next.close(() => {});
      lastError = `Could not start network access on port ${settings.port}: ${
        cause instanceof Error ? cause.message : String(cause)
      }`;
      log(`[network-access] ${lastError}`);
    }
  }

  function needsRebind(settings: NetworkSettings): boolean {
    if (server === null) {
      return true;
    }
    if (boundHost !== settings.host) {
      return true;
    }
    // A requested port of 0 means "whatever we bound"; only an explicit port must match.
    return settings.port !== 0 && boundPort !== settings.port;
  }

  async function reconcile(): Promise<NetworkAccessState> {
    if (reconciling) {
      return reconciling;
    }
    reconciling = (async () => {
      const settings = await readSettings();
      const shouldListen = settings.enabled && !isRemoteWorkspace();
      if (!shouldListen) {
        await stopListener();
        lastError = null;
      } else if (needsRebind(settings)) {
        await stopListener();
        await startListener(settings);
      }
      await refreshTailscale();
      const state = buildState(settings);
      await emit(state);
      return state;
    })();
    try {
      return await reconciling;
    } finally {
      reconciling = null;
    }
  }

  return {
    getState: () => reconcile(),
    async setEnabled(enabled: boolean) {
      await settingService.update({ networkAccessEnabled: enabled });
      return reconcile();
    },
    async setPort(port: number, host?: string) {
      const patch: { networkAccessPort: number; networkAccessHost?: string } = {
        networkAccessPort: normalizePort(port),
      };
      if (host?.trim()) {
        patch.networkAccessHost = host.trim();
      }
      await settingService.update(patch);
      return reconcile();
    },
    installTailscale,
    onStateChanged: stateEmitter.event,
    onInstallStateChanged: installEmitter.event,
    /** Host lifecycle: release the port on shutdown. */
    disposeAll(): void {
      void stopListener();
    },
  };
}
