# Local network access (LAN / Tailscale)

**Status:** active specification  
**Owner:** desktop host and Settings maintainers  
**Authority:** product contract, security model, and acceptance scenarios  
**Scope:** exposing the running desktop session to a browser on the local network or a Tailscale tailnet  
**Updated:** 2026-10-12 08:39 (local time)  
**Verification:** requirements and source alignment; the in-app listener, the standalone server path, and Tailscale detection were exercised on a real machine, and the desktop Host registration was confirmed at runtime — see [`../verification-log.md`](../verification-log.md) for the dated evidence and what remains unverified.

This document defines intended behavior. It does not by itself prove implementation, that a socket binds, that a browser renders, or that Tailscale can be installed. Read [`../README.md`](../README.md) and [`../quiet-studio/architecture-and-scope.md`](../quiet-studio/architecture-and-scope.md) for routing and ownership.

## Purpose

Quiet Studio adds an opt-in **Network** settings page. When enabled, the desktop application serves the same web client that the web distribution uses, on a local HTTP + WebSocket listener, so a browser on the LAN or a Tailscale tailnet can open `http://<ip>:<port>` and see and drive the **same session** the desktop window is running.

The browser is a second client of the same window Host. It connects over the existing `/ws` WebSocket endpoint as a `web-remote-replayable` client; it does not start a second Agent, a second Host, or a second session runtime.

## Security model (read this first)

This feature is **explicitly open**: the listener has **no authentication**. This is a deliberate, user-confirmed product decision, not a secure default. The current reusable server is `packages/server/src/http.ts`; `packages/server/src/entry-http.ts` enables token authentication only when `MESA_CODE_SERVER_AUTH_TOKEN` is supplied. The former `packages/mesa-code-server-cli` and `scripts/mesa-code-distribution` paths are absent from this checkout and must not be cited as current enforcement. Consequences that must be stated in the UI next to the toggle:

- Anyone who can reach the address (anyone on the LAN, or anyone on the tailnet) gets **full control** of the session: run shell commands, read and write workspace files, and use the configured provider credentials.
- It is **off by default** and stays off until the user turns it on and accepts the warning.
- No new credential, token, or pairing flow is introduced, and none is implied to exist.

The specification records this as an accepted risk owned by the user, not as a secure default. A future token/pairing variant would be a separate change with its own spec.

## Product rules

1. **One owner.** A single host service (`INetworkAccessService`) owns the listener: its enabled flag, bind host, port, the running `node:http` server handle, the current address list, and the Tailscale status. Nothing else opens, closes, or re-binds the listener.
2. **Reuse the existing server.** The listener is `createHttpServer(services, port, { host, staticRoot })` from `@mesa-code/server`, fed the window Host's own `ServiceCollection`, so the exposed channels are exactly the ones the renderer already sees. The service layer (`packages/services`) must not import `@mesa-code/server` (that package depends on services); the implementation therefore lives in the desktop Host.
3. **Static root.** The listener serves the built web client as its static root with SPA fallback, so a browser loads the real Quiet Studio UI (the same `@mesa-code/ui` `Root`), not a bespoke page.
4. **Default off, port from settings.** The enabled flag, bind host, and port are persisted settings. Default: disabled, host `0.0.0.0` (all interfaces, so LAN and Tailscale are both reachable), port `0` (an ephemeral port chosen by the OS until the user sets one).
5. **Port is editable from the UI.** Applying a new port re-binds: the current listener is closed cleanly and a new one is opened on the requested port. If the port is unavailable the change fails with a visible message and the previous listener state is reported honestly; the service never leaves two listeners or a half-closed listener.
6. **Address discovery.** The page lists every non-internal IPv4 address of the machine as `http://<ip>:<port>`: addresses in the Tailscale CGNAT range `100.64.0.0/10` are labelled **Tailscale**, the rest **LAN**. Addresses are recomputed on each state read and after each re-bind; no polling timer is introduced.
7. **Tailscale detection is robust.** Tailscale presence is detected by (a) a CLI probe (`tailscale status --json`), and (b) the presence of a `100.64.0.0/10` interface. The CLI is resolved from `PATH` **and** from the platform's default install locations (Windows `C:\Program Files\Tailscale\tailscale.exe`; macOS `/Applications/Tailscale.app/Contents/MacOS/Tailscale` and Homebrew prefixes; Linux `/usr/bin`, `/usr/local/bin`, `/sbin`), because a packaged desktop app launched from a GUI frequently does not inherit the shell `PATH` that contains `tailscale`. Detection is read-only.
8. **Install is explicit and honest (Phase 2).** When Tailscale is not detected, the page offers an **Install Tailscale** button. Installation runs the platform's package manager — winget (`Tailscale.Tailscale`) on Windows, `brew install --cask tailscale` on macOS — which raises the OS elevation prompt itself; the install is never silent and never auto-starts. Where no command exists (an unsupported platform, or a missing package manager) the page reports that and offers the manual download link (`https://tailscale.com/download`). Progress is streamed to the page. The result is reported honestly: the outcome is decided by re-running detection after the installer exits, so a declined prompt, a non-zero exit, or an installer that finishes without Tailscale is reported as a failure, never a fabricated success.
9. **Desktop host only.** The listener runs in the desktop window Host, only when the workspace is local. Remote-workspace sessions (SSH/WSL/docker) do not start it: the Host's services are bound to a remote environment there, and serving them on the LAN would cross the remote boundary. The page reports this limitation rather than silently doing nothing.
10. **Lifecycle is bounded and honest.** Disabling the feature, changing the port, closing the window, or shutting the app closes the listener and frees the port. There is no timeout used to paper over a stuck listener; a close failure is surfaced.
11. **Presentation only, real feature.** The page is a settings surface; the feature it controls is real. No fake status, no simulated addresses, and no fabricated Tailscale result.
12. **A standalone IP-exposure path already exists (not this feature).** `pnpm dev:web` / `@mesa-code/server` (`packages/server/src/entry-http.ts`) starts its own local service set and HTTP + WebSocket listener, with host from `MESA_CODE_SERVER_HOST`/`HOST`, port from `PORT`, static root from `MESA_CODE_WEB_STATIC_ROOT`, and an optional `MESA_CODE_SERVER_AUTH_TOKEN`. It already serves on all interfaces when `host` is `0.0.0.0` (or `HOST` is set to it), so a browser can reach it from the LAN or tailnet with no code change. That path is a **separate session** (its own Agent/Host/services), not a mirror of a running desktop window, and its port/host are set by environment variables rather than from the UI. This specification governs only the in-app mirror listener; the standalone path is documented for completeness in [`../quiet-studio/setup-and-windows-build.md`](../quiet-studio/setup-and-windows-build.md) and is not a second implementation of this feature. Do not present the standalone server as the mirrored session or the mirror as the only way to expose an IP.
13. **Events follow the channel contract.** `onStateChanged` and `onInstallStateChanged` are RPC `Event`s (the same shape as `IBroadcastService.onMessage`), not `(listener) => () => void` methods. Over `ProxyChannel`, an `on*` member is an event: the renderer subscribes with `service.onStateChanged(listener)` and disposes the returned `IDisposable` (e.g. `return () => subscription.dispose()` in a React effect). Returning the subscription object itself as a React effect cleanup makes React call it as a function and throws `destroy is not a function` when the Settings layer unmounts — the defect this rule prevents.

## State owner and interface

- `packages/services/src/network-access/networkAccess.ts` owns the `INetworkAccessService` interface, the result types, and the service descriptor (channel `network-access`). It must stay free of `@mesa-code/server` and `node:http` imports.
- `packages/desktop/src/host/networkAccessService.ts` owns the implementation: it imports `createHttpServer`, `node:os`, and the process runner, and is registered on the Host `ServiceCollection` after `createLocalServices` (the desktop-host-only registration pattern already used for `IMesaCodeTaskService`).
- `packages/desktop/src/host/networkAccessAddresses.ts` owns address discovery (`collectLocalAddresses`, `isTailscaleAddress`, `formatAccessUrl`) as pure helpers. `packages/desktop/src/host/tailscaleProbe.ts` owns the read-only `tailscale status --json` probe and the `PATH`-then-default-location executable resolution. `packages/desktop/src/host/tailscaleInstall.ts` owns the install plan builder, the installer runner, and progress parsing.
- `packages/shared/src/validationAppSettings.ts` owns the persisted fields (`networkAccessEnabled`, `networkAccessHost`, `networkAccessPort`).
- `packages/ui/src/settings/NetworkSection.tsx` owns the page; `settingsPageConfig.ts` and `lib/settingsNavigation.ts` own its navigation entry; `SettingsPage.tsx` owns its render branch.
- `packages/services/src/accessor.ts` and `packages/client/src/remoteServiceAccess.ts` expose the service to the UI through the existing channel-proxy path.
- `packages/desktop/scripts/prepare-web-bundle.mjs` (wired through `prepare-runtime-assets.mjs` and `electron-builder.config.js`) stages the built web client to the packaged `web/` resource that the listener serves as `staticRoot`.

```ts
export interface NetworkAccessAddress {
  kind: "lan" | "tailscale";
  address: string;
  url: string;
}

export interface TailscaleStatus {
  installed: boolean;
  running: boolean;
  addresses: string[];
  /** Resolved `tailscale` executable path, or null when not found. */
  executablePath: string | null;
}

export interface TailscaleInstallState {
  phase: "downloading" | "installing" | "verifying" | "done" | "failed";
  message: string;
  percent: number | null;
  manualUrl: string;
}

export interface NetworkAccessState {
  enabled: boolean;
  host: string;
  port: number;
  listening: boolean;
  /** The port actually bound; differs from `port` when `port` was 0 (ephemeral). */
  boundPort: number | null;
  addresses: NetworkAccessAddress[];
  localUrl: string | null;
  tailscale: TailscaleStatus;
  /** Current installation attempt, or null when none is in progress. */
  install: TailscaleInstallState | null;
  error: string | null;
  /** True when the active workspace is remote; access is unavailable there. */
  remoteWorkspace: boolean;
}

export interface INetworkAccessService {
  getState(): Promise<NetworkAccessState>;
  setEnabled(enabled: boolean): Promise<NetworkAccessState>;
  setPort(port: number, host?: string): Promise<NetworkAccessState>;
  /** Install Tailscale (Phase 2); resolves when the attempt settles. */
  installTailscale(): Promise<NetworkAccessState>;
  // Events are RPC `Event`s (the same shape as IBroadcastService.onMessage), NOT
  // `(listener) => () => void` functions. Over the channel proxy an `on*` member is an
  // event: calling `onStateChanged(listener)` subscribes and returns an `IDisposable`.
  onStateChanged: Event<NetworkAccessState>;
  onInstallStateChanged: Event<TailscaleInstallState>;
  /** Host lifecycle: release the port on shutdown. */
  disposeAll(): void;
}
```

## Event order

The **persisted setting is the source of truth**; the listener is reconciled to it. Every entry point (`getState`, `setEnabled`, `setPort`) funnels through one serialized `reconcile()` so concurrent reads cannot double-bind or leave a half-open listener.

```text
Settings toggle "Enable network access"
  => settingService.update({ networkAccessEnabled })
  => INetworkAccessService.setEnabled => reconcile()
       => read settings (enabled, host, port)
       => enabled && local workspace && needs bind
            => createHttpServer(windowHostServices, port, { host, staticRoot, spaFallback })
            => resolve the bound port (ephemeral port 0 becomes the real one)
       => address discovery (non-internal IPv4) + Tailscale probe
       => state broadcast to subscribers

Settings "Apply port"
  => settingService.update({ networkAccessPort })
  => INetworkAccessService.setPort => reconcile()
       => close() current listener (await close + closeAllConnections)
       => createHttpServer(..., newPort, ...)
       => on failure: report error and expose NO listener; the old port is not silently kept

Browser on http://<ip>:<port>/
  => static SPA served from staticRoot (real web client)
  => client connects to same-origin /ws (web-remote-replayable)
  => same window Host services and the same session runtime as the desktop window

Remote workspace active
  => reconcile() refuses to bind (remoteWorkspace true); state reports the limitation

Window close / app shutdown
  => Host disposeServiceResources / disposeServiceResourcesAndWait
       => INetworkAccessService.disposeAll()
       => server.close() + closeAllConnections() frees the port
```

No presentation store, no polling timer, no second Host, no second session runtime, and no idempotency key are introduced.

## Acceptance scenarios

1. Settings shows a **Network** section (Data group) only on desktop. It states plainly that enabling access requires no authentication and that anyone who can reach the address gets full access, before the toggle is switched on.
2. Turning the toggle on starts one listener on the configured host/port and lists the machine's LAN and Tailscale `http://<ip>:<port>` URLs. Turning it off stops the listener and the URLs disappear; the port is freed.
3. The listed URLs open the real Quiet Studio web client, which then shows and drives the same session as the desktop window (the conversation, files, and tools are the shared session, not a new one).
4. Editing the port and applying re-binds to the new port: the new URL works and the old port no longer answers. An unavailable port reports an error and does not leave two listeners or a half-open listener.
5. The page reports Tailscale presence and its `100.x` addresses honestly when present, and says it is not detected when absent; it never fabricates a result. Tailscale installed at its default location is detected even when the app's `PATH` does not contain it.
6. With a remote (SSH/WSL/docker) workspace active, the page reports that network access is unavailable for remote workspaces and does not start a listener.
7. Closing the window or quitting the app stops the listener.
8. Enabling the feature performs no provider/network call of its own and introduces no new credential, token, or pairing state.
9. When Tailscale is missing, the page offers **Install Tailscale**. Installing runs the platform package manager (raising the OS elevation prompt), streams progress, and re-detects on completion; a declined prompt or a failed install is reported as a failure with the manual download link, never as success. Where no command is available the page says so and offers the manual link.
10. The page and its documentation never claim the mirrored listener is the only way to expose the app: the standalone `@mesa-code/server` path (rule 12) is described as the independent-session alternative when a full mirror is not required.
11. Opening the mirrored web client on a **phone** uses the web client's phone layout (see [`quiet-studio-mobile-web-layout.md`](quiet-studio-mobile-web-layout.md)): the browser mirror and the standalone web client share the same responsive shell, so no separate mobile presentation is introduced by this feature.
12. Opening and closing the **Network** settings section never throws: the state/install event subscriptions are disposed through their `IDisposable`, so leaving Settings produces no `destroy is not a function` error (see rule 13 and [`../verification-log.md`](../verification-log.md)).
13. The mirrored web client survives a phone lock screen or app switch without a manual reload: the dropped WebSocket is detected, in-flight RPCs fail fast, and the client reconnects on resume against the same Host and session (see [`web-remote-reconnect.md`](web-remote-reconnect.md)).

## Out of scope

- Authentication, tokens, or pairing for the LAN listener (explicitly removed by product decision).
- Silent or automatic Tailscale installs: the install is always user-triggered, shows the elevation prompt, and is reported honestly.
- Windows Firewall inbound-rule creation and verification (must be verified on a real Windows host).
- A second Agent/Host/session runtime for the browser.
- iOS focus-zoom, standalone PWA, or offline behavior beyond what the existing web client already does.
