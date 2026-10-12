# Build tools

**Status:** reference  
**Owner:** desktop/build maintainers  
**Authority:** runbook  
**Scope:** local helper-bundle cache, bootstrap commands, and environment overrides  
**Updated:** 2026-10-12 08:39 (local time)  
**Verification:** source-only review; no download, bootstrap, build, or installer check was run

Read the [documentation index](README.md) first, then the
[setup and Windows build runbook](quiet-studio/setup-and-windows-build.md)
for the full build procedure. This document covers only the external tools a
build depends on.

## Why a tool cache exists

Packaging the desktop app needs binaries that are not npm packages:

- electron-builder's helper bundles — `winCodeSign` (rcedit, signtool),
  `nsis` (the installer compiler), and `nsis-resources` — are the three current
  entries in `TOOL_CATALOG` and the scope of `tools:bootstrap`.
- Electron and bundled native search tools (`ripgrep`, `bfs`, `ugrep`) have
  separate preparation paths. Their readiness is not established by this
  helper-bundle catalog or its `--check` result.

These used to be fetched into scattered locations at unpredictable times. A
missing or half-extracted tool then surfaced as an opaque failure late in
packaging. The cache makes the set explicit, verified, and reusable.

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm tools:bootstrap` | Download, checksum-verify, and extract the catalog's three installer helper bundles |
| `pnpm tools:list` | Show the catalog and whether each tool is present |
| `node scripts/tools/tool-bootstrap.mjs --check` | Check helper directories only; no download or checksum/payload validation. Exits non-zero when one is missing |
| `node scripts/tools/tool-bootstrap.mjs --force` | Redownload everything |
| `node scripts/tools/tool-bootstrap.mjs` | Ensure the toolset (safe to re-run; uses the cache) |

A normal `pnpm bundle:desktop` run calls the bootstrap automatically, so a
missing tool is downloaded instead of failing the build. `build-installer.bat`
runs `--check` first, before bumping the version, and downloads only when
something is missing. You only need the commands above to pre-warm the cache or
inspect its state.

## Cache layout

```text
.tools/
  README.md                 this cache's own quick reference
  state.json                what was downloaded, and which checksum it matched
  bin/                      helper executables placed on PATH for the build (7za shim)
  downloads/                verified archives, kept so later builds skip the network
  winCodeSign-2.6.0/        extracted electron-builder bundle (name must match release)
  nsis-3.0.4.1/
  nsis-resources-3.4.1/
```

The extracted directory names match electron-builder's release names because its
bundled `app-builder` binary resolves bundles as `<cache>/<name>-<version>`.

The directory is gitignored. Nothing in it is source.

## Checksums

Every archive carries a SHA-512 checksum in
[`scripts/tools/tool-catalog.mjs`](../scripts/tools/tool-catalog.mjs). The
bootstrap verifies the download before extraction, so a truncated or substituted
mirror response is rejected rather than silently producing a broken installer.

`--check` tests directory existence only. Normal cached reuse checks a matching
`state.json` SHA-512 entry plus directory existence, not every extracted byte.
A successful readiness check therefore does not prove an intact extraction or
successful installer. Treat suspected corruption separately; `--force` downloads
and extracts again.

- `nsis` and `nsis-resources` checksums come from `app-builder-lib`'s own table,
  so they match what electron-builder would validate.
- The `winCodeSign` checksum was computed from the archive that produced a
  verified installer.

## The 7za shim

electron-builder extracts its helper bundles by running `7za` from `PATH`. The
`winCodeSign` bundle embeds macOS dylib **symlinks**, and creating a symbolic
link on Windows requires `SeCreateSymbolicLinkPrivilege` — admin rights or
Developer Mode. Without it, extraction aborts:

```text
ERROR: Cannot create symbolic link : A required privilege is not held by the client.
```

Rather than require elevation, the build uses a small shim
([`scripts/tools/seven-zip-shim`](../scripts/tools/seven-zip-shim)) that:

1. pre-creates the bundle's symlink paths as empty files,
2. forwards the extraction to the real 7za (which handles 7z/BCJ2 filters),
3. answers `-y` and closes stdin so an overwrite prompt cannot block the build,
4. treats 7za exit code 2 ("only symlink entries failed") as success.

The shim is placed at `.tools/bin/7za.exe` and prepended to `PATH` for the
packaging process. A prebuilt binary ships in the tool source, so no Rust
toolchain is required; `cargo` is used only when the prebuilt is absent.

## Environment overrides

| Variable | Effect |
| --- | --- |
| `MESA_CODE_TOOLS_DIR` | Use a different cache root instead of `.tools` |
| `MESA_CODE_TOOLS_OFFLINE` | When `1`, never download; fail if a tool is missing |
| `MESA_CODE_REAL_7ZA` | Point the shim at a specific 7za executable |
| `ELECTRON_BUILDER_BINARIES_MIRROR` | Override the helper-bundle mirror |
| `MESA_CODE_DEPS_BASE_URL`, `MESA_INTRANET_HOST` | Prefer an intranet dependency mirror |

Mirror precedence for helper bundles is: intranet base URL (when configured),
then `ELECTRON_BUILDER_BINARIES_MIRROR` or the npmmirror binary mirror, then the
upstream GitHub release URL.
