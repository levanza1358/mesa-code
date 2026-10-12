# Quiet Studio setup and Windows build

**Status:** active runbook  
**Owner:** desktop/build maintainers  
**Authority:** setup, isolation, validation, and Windows packaging procedure  
**Scope:** project-local development and Windows x64 packaging  
**Updated:** 2026-10-12 10:09 (local time)

Read the [documentation index](../README.md) first. This runbook defines supported commands and safety boundaries; it does not claim that a command, launch, package, install, signature, or runtime interaction passed unless [`verification-log.md`](../verification-log.md) records current evidence.

For the Electron Builder helper cache (`winCodeSign`, NSIS, NSIS resources) and non-admin Windows extraction, see [build tools](../build-tools.md). Electron and native runtime assets use the separate runtime-preparation scripts.

Run commands only from the checkout containing `AGENTS.md`; paths below are relative to that repository root. Do not modify or launch another checkout as part of this workflow. Quiet Studio is Mesa Code presentation work; copied backend features and stable identifiers remain intact. See [scope](architecture-and-scope.md) and [stage-1 spec](../specs/quiet-studio.md).

## Requirements and preparation

- Windows x64 for the default desktop installer target.
- Node.js **24.14.0** and pnpm **10.33.2**, pinned in `mise.toml` and root `package.json`.
- Git for repository workflows; network access for dependencies and runtime/build assets.
- Native Windows compilation may require Visual Studio C++ build tools and Python when a matching prebuilt native module is unavailable. Do not assume every installation rebuilds native modules.

```powershell
# Run from the checkout containing AGENTS.md.
node --version
pnpm --version
node scripts/check-workspace-freshness.mjs
```

`pnpm bootstrap` first invokes Git submodule initialization, then installs dependencies, prepares local desktop runtime assets, and invokes `build:bootstrap`.

> **Known limitation:** `scripts/bootstrap.mjs` runs
> `git submodule update --init --recursive apps/mesaCode-cli`, but the directory is
> spelled `apps/mesa-code-cli` and is not a submodule. `pnpm bootstrap` therefore
> fails at that step. Use the explicit sequence below instead.

For this source copy, the supported preparation sequence is:

```powershell
pnpm install
pnpm tools:bootstrap
$env:MESA_CODE_SKIP_REMOTE_ASSETS = '1'
pnpm prepare:desktop-runtime
pnpm build:bootstrap
```

`pnpm tools:bootstrap` downloads and verifies the non-npm build tools into
`.tools/` (see [build tools](../build-tools.md)). It is optional here —
`pnpm bundle:desktop` runs it automatically — but pre-warming it separates tool
download failures from compile failures. Remote assets are not prepared by this
sequence. `pnpm bootstrap:with-remote` exists but shares the same initial path
mismatch and also retains obsolete `@mesaCode/*` build filters; do not treat it
as a working alternative. `pnpm prepare:remote-assets` is the current direct
remote-assets script, subject to its platform/environment requirements.
`pnpm install` alone does not replace runtime preparation.

**Node version matters.** The pinned Node.js **24.14.0** from `mise.toml` is
required, not merely recommended. Under Node 26 the optional `ssh2` native
binding fails to compile (`v8::Context::GetIsolate` was removed from V8), and
`apps/mesa-code-cli` declares `engines.node >= 24.14.0`. Install the pinned
runtime before building.

This checkout has Git metadata, so Git-dependent checks are available. Branch, refs, upstream access, and working-tree changes are live state, not runbook guarantees. Do not point another checkout at this working directory or treat a successful local check as proof of a fresh upstream baseline.

## Choose the procedure

| Goal                                              | Read / run                                                    | Evidence required                                                |
| ------------------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------- |
| Isolated desktop development                      | `pnpm dev:desktop:test` or `pnpm dev:desktop`                 | Current runtime interaction record                               |
| Web development                                   | `pnpm dev:web`                                                | Server readiness and browser interaction record                  |
| Reach the app from another device (LAN/Tailscale) | the **Exposing the app on the LAN / Tailscale** section below | Listener readiness and reachability from the other device record |
| Source validation                                 | `pnpm typecheck`, `pnpm lint`, `pnpm fmt:check`               | Command output in verification log                               |
| Architecture validation                           | `pnpm architecture:check --changed`                           | Git metadata must be available                                   |
| Windows package                                   | `pnpm bundle:desktop -- --os win --arch x64`                  | Artifact, signature, install, launch, and uninstall checks       |

## Isolated desktop development

`dev:desktop` delegates to `dev:desktop:prod`; `dev:desktop:test` selects the test environment. Both public entry points now invoke `scripts/quiet-studio-dev.mjs` before the existing desktop runner:

```powershell
pnpm dev:desktop:test
```

The wrapper sets these child-process overrides:

| Variable                                                                       | Value under project root                 |
| ------------------------------------------------------------------------------ | ---------------------------------------- |
| `HOME`, `USERPROFILE`, `MESA_CODE_DATA_BASE_DIR`, `MESA_CODE_DESKTOP_HOME_DIR` | `.quiet-studio-runtime\home`             |
| `MESA_CODE_DESKTOP_APPLICATION_NAME`                                           | `Mesa Code`                              |
| `MESA_CODE_DESKTOP_USER_DATA_DIR`                                              | `.quiet-studio-runtime\electron`         |
| `MESA_CODE_DESKTOP_SESSION_DATA_DIR`                                           | `.quiet-studio-runtime\electron\session` |
| `MESA_CODE_DESKTOP_USE_ELECTRON_DEFAULT_USER_DATA`                             | `0`                                      |
| `MESA_CODE_DISABLE_FIXED_REMOTE_DEBUGGING_PORT`                                | `1`                                      |
| `PORT`                                                                         | `3031`                                   |

Service data resolves under `.quiet-studio-runtime\home\.mesaCode`; workspace-free conversation cwd uses that data root. Never copy original user data to populate this folder. The wrapper inherits other environment variables, including any existing `MESA_CODE_HOME` or provider overrides; start from an independently configured shell and do not inherit original data/secret paths. External providers/tools may have separate paths, so this is not a sandbox for arbitrary tool execution.

Direct package dev scripts, `dev:server`, and `dev:desktop:remote-prod` do not use this wrapper. Do not use them as isolated Quiet Studio launch paths without independent configuration. Do not use the obsolete `MESA_DATA_BASE_DIR` spelling. This review confirms the source isolation settings only. Prior runtime evidence applies only to the exact dated launch/scenario in the ledger; recheck inherited paths and actual writes before each launch.

Before starting Electron, the runner builds everything the desktop app and its **Network mirror** need, in order: `pre-dev` (runtime assets + clean `out`), `pnpm --filter @mesa-code/web build` (the built web client at `packages/web/dist` that the LAN listener serves), the desktop agent CLI, and finally `dev:runtime` (tsup + vite + Electron). So `pnpm dev:desktop` is a single, complete command for testing the desktop app **and** opening the mirrored session from a browser. The web build is a one-shot step, not a watcher: after editing `packages/ui` run `pnpm --filter @mesa-code/web build` again (or restart `dev:desktop`) to refresh what the mirror serves. A build failure there aborts the launch; it does not fall back to a stale bundle.

## Web development

The root entry point `pnpm dev:web` now uses the same Quiet Studio wrapper to start `@mesa-code/server` and `@mesa-code/web`, with server `PORT=3031` and Vite arguments `--port 5174 --strictPort --host 127.0.0.1`.

```powershell
pnpm dev:web
```

Expected browser origin is `http://127.0.0.1:5174`; verify actual server readiness and client/backend connectivity before concurrent use. Browser storage isolation depends on origin, not copied source location. Source port configuration is verified, not successful runtime connection. Keep independent provider/environment configuration; never copy `.env.local` from the original project.

## Exposing the app on the LAN / Tailscale (two paths)

There are two supported ways to reach Quiet Studio from another device, and they are not the same thing:

|             | Standalone server                                                     | In-app mirror (Network settings)                            |
| ----------- | --------------------------------------------------------------------- | ----------------------------------------------------------- |
| Entry point | `pnpm dev:web` (local dev) or `pnpm dev:server` (`@mesa-code/server`) | Desktop Settings → **Network**                              |
| Session     | Its **own** Agent/Host/services (a separate session)                  | The **same** session as the running desktop window          |
| Host/port   | `MESA_CODE_SERVER_HOST` / `HOST`, `PORT` (environment)                | Persisted settings, editable from the UI                    |
| Auth        | Open by default; optional `MESA_CODE_SERVER_AUTH_TOKEN`               | Open by explicit product decision (no token)                |
| Spec        | [local-network-access.md](../specs/local-network-access.md) rule 12   | [local-network-access.md](../specs/local-network-access.md) |

`pnpm dev:web` starts the server **and** a Vite dev client that binds only `127.0.0.1:5174`, so
that UI is reachable from this machine only. Serve another device the built web client through
`pnpm dev:server` with `MESA_CODE_WEB_STATIC_ROOT` (below); do not expect the Vite dev origin to be
reachable over the LAN.

**Security boundary.** The desktop mirror has no token authentication. Anyone who can reach its listener can control the attached session. Use only a trusted LAN or restricted Tailscale network; do not expose it to the public internet. The standalone server supports an optional token, but still needs independent runtime/data isolation.

**Standalone server.** `@mesa-code/server` binds all interfaces when the host is `0.0.0.0`; reachability also depends on firewall and network configuration. Configure independent home/data/provider paths first, because `dev:server` bypasses the isolation wrapper. To serve a previously built web client:

```powershell
$env:PORT = '3030'
$env:MESA_CODE_SERVER_HOST = '0.0.0.0'
$env:MESA_CODE_WEB_STATIC_ROOT = (Resolve-Path 'packages/web/dist')   # build first: pnpm --filter @mesa-code/web build
# Set MESA_CODE_SERVER_AUTH_TOKEN independently to require authentication.
# An unset token leaves this listener open; never reuse another checkout's secret.
pnpm dev:server
```

`pnpm dev:web` wraps the same server with the Vite dev client (server `PORT=3031`) for live front-end editing; `pnpm dev:server` runs the built server alone. This path is a **separate** session, so use it when you only want the app reachable by IP and do not need to mirror a specific desktop window.

**In-app mirror.** Enable it from the desktop Settings → **Network** page; it serves the web client from the window Host so a browser sees and drives the **same** session, with the port changeable in the UI. Runtime interaction for this path is not asserted by this runbook; see [verification-log.md](../verification-log.md).

**Firewall (both paths).** Windows Firewall and interface policy can block either listener, including Tailscale traffic. Verify the actual interface and trusted inbound scope; do not assume Tailscale bypasses the firewall. Creating or verifying a Windows Firewall inbound rule is out of scope here and must be done on a real Windows host; see the acceptance/limitation notes in [local-network-access.md](../specs/local-network-access.md).

## Validation

Available root scripts:

```powershell
pnpm typecheck
pnpm lint
pnpm fmt:check
pnpm architecture:check --changed
pnpm verify:pre-push
```

`verify:pre-push` runs lint and the changed architecture check, not all tests. Package test entry points must be read from current package manifests and actual test files; there is no documented universal test command. For code changes, use `pnpm architecture:context <module-id>` and the architecture policy. Documentation-only updates do not require running builds or lint.

Run UI TypeScript tests with the UI tsconfig so the `@/` aliases resolve, for example:

```powershell
pnpm exec tsx --tsconfig packages/ui/tsconfig.json --test packages/ui/test/settingsSidebarLocalization.test.ts
```

This is one focused test, not a unified suite or a runtime navigation check. Report actual outputs in the verification ledger, including existing failures, runtime-version differences, and Git-baseline limitations.

## Windows .exe packaging

The existing root packaging entry point calls the desktop `bundle` script. It prepares runtime assets, builds production bundles, ensures the external build tools, invokes Electron Builder, and validates packaged dependencies. The default target is Windows x64; the current configuration uses NSIS.

```powershell
$env:MESA_CODE_SKIP_REMOTE_ASSETS = '1'
pnpm bundle:desktop -- --os win --arch x64
```

`MESA_CODE_SKIP_REMOTE_ASSETS` skips remote-asset preparation; it does not mean local runtime assets or required native tools can be omitted. For distribution needing remote assets, prepare and validate those assets instead of treating this local-build shortcut as a complete remote release. Do not use the obsolete `MESA_SKIP_REMOTE_ASSETS` spelling.

The source packaging path includes the web client: `prepare:runtime-assets` runs `prepare:web-bundle`, staging it to `bundled-web/<platform>`; `electron-builder.config.js` ships that as `resources/web`. The desktop Host's `resolveWebStaticRoot()` supplies the Network listener's `staticRoot`. The ledger's 2026-10-11 21:45 build record confirms `resources/web/index.html` in the unsigned 1.0.2 artifact, not installed browser control or later source changes. A "Web client bundle not found" error requires checking the actual artifact/static root; older packages may lack the bundle. Do not assume a development source edit reached an existing installer. Rebuild and validate in an isolated installation environment when packaging is the assigned task.

### Build tools

Packaging needs three helper bundles that are not npm packages: `winCodeSign`,
`nsis`, and `nsis-resources`. `pnpm bundle:desktop` prepares them automatically
via `scripts/tools/tool-bootstrap.mjs`, which downloads each one into `.tools/`
and verifies its checksum before extraction. A missing tool is therefore
downloaded on demand rather than failing the build.

On Windows the `winCodeSign` bundle contains macOS dylib symlinks. Creating those
needs admin rights or Developer Mode, so extraction uses a bundled `7za` shim
that skips them. No elevation is required. See [build tools](../build-tools.md)
for the cache layout, checksums, and environment overrides.

### Incremental speed

The `afterPack` stage rewrites `app.asar` to inject runtime modules and strip
sourcemap references. That work is done in **one** extract/repack cycle over a
~27,000-file archive. Keep it that way: splitting those mutations into separate
cycles multiplies the dominant packaging cost, because each cycle reads and
rewrites roughly 300 MB.

For a packaging-only re-run, when runtime assets and production bundles are already current:

```powershell
pnpm bundle:desktop -- --os win --arch x64 --skip-prepare --skip-build
```

`--skip-prepare` and `--skip-build` reuse existing build output; use them only
when runtime assets and production bundles are already current.

For automatic GitHub publication, read [`../specs/github-release-automation.md`](../specs/github-release-automation.md). `.github/workflows/windows-release.yml` runs the same Windows x64 bundle on `main`, validates one installer, and publishes an immutable release using the runner-provided `GITHUB_TOKEN`. It does not perform local commits, configure Git credentials, or sign the installer.

Default output directory: `packages\desktop\dist`. Override exists as `MESA_CODE_DESKTOP_DIST_DIR`; leave it unset for the documented path. Configured installer filename:

```text
MesaCode-${version}-win-${arch}.exe
```

The version comes from build metadata; do not infer the final filename from the root version alone. Inspect produced output:

```powershell
Get-ChildItem packages\desktop\dist -Filter '*.exe'
```

`pnpm build:installer` and `build-installer.bat` additionally run `scripts/bump-desktop-version.mjs` before bundling. That script advances the root `package.json` version by one capped patch step (patch and minor cap at 10, then carry: `1.0.10` -> `1.1.0`, `1.10.10` -> `2.0.0`); see the [installer version scheme](../specs/installer-version-scheme.md). Avoid these commands for a non-version-changing local build and use `pnpm bundle:desktop` directly. `pnpm build` is a recursive workspace build, not an installer command.

### `build-installer.bat`

The batch entry point runs three steps in order:

1. **Check build tools** — runs `tool-bootstrap.mjs --check`, which reports
   whether `winCodeSign`, `nsis`, and `nsis-resources` are present. If anything
   is missing it downloads the toolset before continuing.
2. **Bump the installer version** — runs `bump-desktop-version.mjs`.
3. **Build** — runs `pnpm bundle:desktop`.

The tool check happens **before** the version bump on purpose. A missing tool
previously surfaced after the version had already been rewritten and after
several minutes of building; now a download failure leaves the version untouched.

Without separately provisioned Windows signing credentials, treat output as an unsigned local installer; SmartScreen or publisher warnings are possible. Release signing belongs to the existing Electron Builder signing configuration and secure release environment. Never put certificates, passwords or signing secrets into source or documentation. Verify signature on the actual artifact rather than assuming signing succeeded.

All build flavors display Mesa Code, including the executable product label, NSIS shortcut, and uninstall entry. Preview flavor still keeps its existing app ID, helper variant, and profile directory; the display-name change does not migrate data or change backend selection. Development paths remain project-local. Shared shortcut names or existing production identity can collide with another installation, so do not install beside the original until installer identity/data isolation is independently verified. Use a separate test environment for installation validation. Run `node scripts/quiet-studio-name-check.mjs` to validate source naming and preserved identity fields; this is not an installer execution test.

This documentation-only update adds no build, app launch, or installation evidence. Typecheck, lint, and focused source-test results are recorded in the 2026-10-12 documentation-audit entry of the verification ledger. The 2026-10-11 21:45 ledger entry records a built, metadata-inspected, unsigned 1.0.2 installer; it was not installed or launched. Notifications, Sound, and pill-answer changes recorded later are not covered by that installer evidence. A new package needs new artifact, signature, installed launch, interaction, and uninstall evidence.
