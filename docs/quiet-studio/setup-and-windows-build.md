# Quiet Studio setup and Windows build

**Status:** active runbook  
**Owner:** desktop/build maintainers  
**Authority:** setup, isolation, validation, and Windows packaging procedure  
**Scope:** project-local development and Windows x64 packaging  
**Updated:** 2026-10-09 16:31 (local time)

Read the [documentation index](../README.md) first. This runbook defines supported commands and safety boundaries; it does not claim that a command, launch, package, install, signature, or runtime interaction passed unless [`verification-log.md`](../verification-log.md) records current evidence.

Run commands only from `C:\Users\Kuroneko\Documents\project\mesacode-quiet-studio`. Do not modify or launch the original project as part of this workflow. Quiet Studio is Mesa Code presentation work; copied backend features and stable identifiers remain intact. See [scope](architecture-and-scope.md) and [stage-1 spec](../specs/quiet-studio.md).

## Requirements and preparation

- Windows x64 for the default desktop installer target.
- Node.js **24.14.0** and pnpm **10.33.2**, pinned in `mise.toml` and root `package.json`.
- Git for repository workflows; network access for dependencies and runtime/build assets.
- Native Windows compilation may require Visual Studio C++ build tools and Python when a matching prebuilt native module is unavailable. Do not assume every installation rebuilds native modules.

```powershell
Set-Location 'C:\Users\Kuroneko\Documents\project\mesacode-quiet-studio'
node --version
pnpm --version
node scripts/check-workspace-freshness.mjs
pnpm bootstrap
```

`pnpm bootstrap` first invokes Git submodule initialization, then installs dependencies, prepares local desktop runtime assets, and invokes `build:bootstrap`. With no Git metadata, bootstrap can fail before installing dependencies. For this source copy, the existing non-Git preparation sequence is:

```powershell
pnpm install
$env:MESA_CODE_SKIP_REMOTE_ASSETS = '1'
pnpm prepare:desktop-runtime
pnpm build:bootstrap
```

This fallback is documented from existing scripts, not asserted as a successful build. Remote assets are not prepared by default; `pnpm bootstrap:with-remote` is the existing optional remote-assets entry point. `pnpm install` alone installs dependencies but does not replace runtime preparation.

The copied project had no `.git` entry during inspection. The freshness command failed with `Error: Command failed: git fetch origin --prune`; it did not establish a fresh baseline. Git-dependent checks require a deliberate repository/origin setup. Do not point the original project at this working directory or claim a successful freshness check.

## Choose the procedure

| Goal                         | Read / run                                      | Evidence required                                          |
| ---------------------------- | ----------------------------------------------- | ---------------------------------------------------------- |
| Isolated desktop development | `pnpm dev:desktop:test` or `pnpm dev:desktop`   | Current runtime interaction record                         |
| Web development              | `pnpm dev:web`                                  | Server readiness and browser interaction record            |
| Source validation            | `pnpm typecheck`, `pnpm lint`, `pnpm fmt:check` | Command output in verification log                         |
| Architecture validation      | `pnpm architecture:check --changed`             | Git metadata must be available                             |
| Windows package              | `pnpm bundle:desktop -- --os win --arch x64`    | Artifact, signature, install, launch, and uninstall checks |

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

Direct package dev scripts, `dev:server`, and `dev:desktop:remote-prod` do not use this wrapper. Do not use them as isolated Quiet Studio launch paths without independent configuration. Do not use the obsolete `MESA_DATA_BASE_DIR` spelling. Source isolation settings are verified; actual runtime writes and launch remain unverified here.

## Web development

The root entry point `pnpm dev:web` now uses the same Quiet Studio wrapper to start `@mesa-code/server` and `@mesa-code/web`, with server `PORT=3031` and Vite arguments `--port 5174 --strictPort --host 127.0.0.1`.

```powershell
pnpm dev:web
```

Expected browser origin is `http://127.0.0.1:5174`; verify actual server readiness and client/backend connectivity before concurrent use. Browser storage isolation depends on origin, not copied source location. Source port configuration is verified, not successful runtime connection. Keep independent provider/environment configuration; never copy `.env.local` from the original project.

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

No typecheck, lint, interaction test or package build result is asserted here. Report actual outputs separately, including existing failures and Git-baseline limitations.

## Windows .exe packaging

The existing root packaging entry point calls the desktop `bundle` script. It prepares runtime assets, builds production bundles, invokes Electron Builder, and validates packaged dependencies. The default target is Windows x64; the current configuration uses NSIS.

```powershell
$env:MESA_CODE_SKIP_REMOTE_ASSETS = '1'
pnpm bundle:desktop -- --os win --arch x64
```

`MESA_CODE_SKIP_REMOTE_ASSETS` skips remote-asset preparation; it does not mean local runtime assets or required native tools can be omitted. For distribution needing remote assets, prepare and validate those assets instead of treating this local-build shortcut as a complete remote release. Do not use the obsolete `MESA_SKIP_REMOTE_ASSETS` spelling.

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

Without separately provisioned Windows signing credentials, treat output as an unsigned local installer; SmartScreen or publisher warnings are possible. Release signing belongs to the existing Electron Builder signing configuration and secure release environment. Never put certificates, passwords or signing secrets into source or documentation. Verify signature on the actual artifact rather than assuming signing succeeded.

All build flavors display Mesa Code, including the executable product label, NSIS shortcut, and uninstall entry. Preview flavor still keeps its existing app ID, helper variant, and profile directory; the display-name change does not migrate data or change backend selection. Development paths remain project-local. Shared shortcut names or existing production identity can collide with another installation, so do not install beside the original until installer identity/data isolation is independently verified. Use a separate test environment for installation validation. Run `node scripts/quiet-studio-name-check.mjs` to validate source naming and preserved identity fields; this is not an installer execution test.

No `.exe` build or installation was performed for this documentation update. Packaging, artifact existence, signature, installed launch and uninstall behavior remain to be verified by the packaging task.
