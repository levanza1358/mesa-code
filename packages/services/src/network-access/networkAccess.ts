import type { Event } from "@mesa-code/rpc";
import { ServiceChannels } from "@mesa-code/shared";
import { createServiceDescriptor } from "../descriptors.js";

/** One reachable address a browser can use to open this session. */
export interface NetworkAccessAddress {
  /** Tailscale CGNAT addresses (100.64.0.0/10) are labelled "tailscale", the rest "lan". */
  kind: "lan" | "tailscale";
  /** Bare IPv4 address, e.g. "192.168.1.20" or "100.101.102.103". */
  address: string;
  /** Full URL a browser opens, e.g. "http://192.168.1.20:3031". */
  url: string;
}

export interface TailscaleStatus {
  /** The `tailscale` CLI was found (on PATH or at a known install location). */
  installed: boolean;
  /** A 100.64.0.0/10 interface is present (the daemon is up and this node is on a tailnet). */
  running: boolean;
  /** Tailscale IPv4 addresses discovered on this machine. */
  addresses: string[];
  /**
   * Resolved `tailscale` executable path, or null when not found. Detection checks
   * PATH first and then the platform's default install locations, because a packaged
   * desktop app launched from a GUI often does not inherit the shell PATH that
   * contains `tailscale`.
   */
  executablePath: string | null;
}

/** Progress of a Tailscale installation attempt. */
export type TailscaleInstallPhase = "downloading" | "installing" | "verifying" | "done" | "failed";

export interface TailscaleInstallState {
  phase: TailscaleInstallPhase;
  /** Human-readable status, shown verbatim in the page. */
  message: string;
  /** 0..100 when the installer reports it, otherwise null (indeterminate). */
  percent: number | null;
  /** Download page for a manual install; always present so the page can offer a fallback. */
  manualUrl: string;
}

export interface NetworkAccessState {
  /** Whether the listener should be running (persisted preference). */
  enabled: boolean;
  /** Bind host. "0.0.0.0" binds every interface (LAN + Tailscale). */
  host: string;
  /** Requested port; 0 means "let the OS choose an ephemeral port". */
  port: number;
  /** Whether a listener is currently bound. */
  listening: boolean;
  /** The port actually bound (resolved when the requested port was 0). */
  boundPort: number | null;
  /** Every non-internal IPv4 address of this machine, LAN and Tailscale. */
  addresses: NetworkAccessAddress[];
  /** Same-machine URL for convenience, or null when not listening. */
  localUrl: string | null;
  tailscale: TailscaleStatus;
  /** Current installation attempt, or null when none is in progress. */
  install: TailscaleInstallState | null;
  /** Last bind/close error, or null. Never a fabricated success. */
  error: string | null;
  /** True when the active workspace is remote (SSH/WSL/docker); access is unavailable there. */
  remoteWorkspace: boolean;
}

/**
 * Local network access (LAN / Tailscale).
 *
 * There is no authentication: enabling this lets anyone who can reach the
 * address drive the session. See docs/specs/local-network-access.md.
 */
export interface INetworkAccessService {
  getState(): Promise<NetworkAccessState>;
  setEnabled(enabled: boolean): Promise<NetworkAccessState>;
  /** Re-bind to a new port (and optionally host). Closes the current listener first. */
  setPort(port: number, host?: string): Promise<NetworkAccessState>;
  /**
   * Install Tailscale on this machine when it is missing (Phase 2). Resolves when
   * the attempt settles (success or failure) and returns the resulting state.
   * The first step raises the OS elevation prompt; a declined prompt is reported
   * as a failure, never as a silent success. Download page is available as a
   * fallback via `TailscaleStatus`/`TailscaleInstallState.manualUrl`.
   */
  installTailscale(): Promise<NetworkAccessState>;
  /**
   * State change events. Declared as an RPC `Event` (like `IBroadcastService.onMessage`)
   * so the renderer proxy in `ProxyChannel.toService` exposes it correctly: the UI calls
   * `service.onStateChanged(listener)` to subscribe and disposes the returned
   * `IDisposable`. Declaring it as `(listener) => () => void` looked simpler but was
   * wrong over RPC — the proxy returns the event itself, so the subscription returned an
   * `IDisposable` object where the caller expected an unsubscribe function, and React's
   * effect cleanup then threw `destroy is not a function` when the settings layer
   * unmounted. See docs/specs/local-network-access.md.
   */
  onStateChanged: Event<NetworkAccessState>;
  /** Installation progress events. Same `Event` contract as `onStateChanged`. */
  onInstallStateChanged: Event<TailscaleInstallState>;
  /** Host lifecycle: release the port on shutdown. */
  disposeAll(): void;
}

export const INetworkAccessService = createServiceDescriptor<INetworkAccessService>(
  ServiceChannels.NetworkAccess,
);
