# Mesa Code Windows-only distribution

**Status:** active  
**Owner:** release and desktop packaging maintainers  
**Authority:** contract  
**Scope:** Windows x64 distribution target and explicit uninstall data deletion  
**Updated:** 2026-10-12 08:39 (local time)  
**Verification:** source-only documentation review; no package or uninstall was run

## Product rule

Mesa Code desktop distribution targets Windows x64 only. macOS and Linux installers are not supported release targets.

## Scope

- `pnpm bundle:desktop` defaults to `win/x64`.
- `--os` accepts only `win`, `windows`, or `win32`.
- Windows installer target remains NSIS.
- Runtime asset preparation uses Windows target identity.
- Internal protocol, package names, environment variables, and storage paths remain unchanged.

## Acceptance

- Default desktop bundle command does not select macOS.
- Passing Linux or macOS target fails before preparation.
- Windows x64 bundle continues to produce `.exe` artifacts.
- Interactive uninstaller shows a delete-data option, disabled by default.
- When selected, uninstaller removes Mesa Code app data, caches, and `%USERPROFILE%\.mesaCode` after application files are removed.
- Silent uninstall keeps existing behavior unless `--delete-app-data` is explicitly passed.
