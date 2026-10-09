# Installer version scheme

## Status

Implemented

## Product rule

Every Windows installer build carries a three-field numeric version `MAJOR.MINOR.PATCH`.
A new installer is produced by incrementing the version by exactly one patch step, with each
field capped at 10:

1. `PATCH += 1`.
2. If `PATCH > 10`, set `PATCH = 0` and `MINOR += 1`.
3. If `MINOR > 10`, set `MINOR = 0` and `MAJOR += 1`.

`MAJOR` has no cap. `PATCH` and `MINOR` never exceed 10 in a produced version. The version line
managed by this rule starts at `1.0.0`.

Worked examples of successive installer versions:

```text
1.0.0 -> 1.0.1 -> ... -> 1.0.9 -> 1.0.10 -> 1.1.0 -> ... -> 1.10.10 -> 2.0.0
```

## Ownership and interface

- The single owner of the version value is the root `package.json` `version` field.
- `scripts/bump-desktop-version.mjs` is the only writer. It exports the pure function
  `bumpInstallerVersion(current)` (plus `COMPONENT_MAX = 10`); running the file as a script reads
  the root `package.json`, applies one bump step, and writes the result back.
- `build-installer.bat` and `pnpm build:installer` invoke that script before bundling, so each
  installer build advances the version by one step.
- Consumers read the value unchanged and require the strict `^\d+\.\d+\.\d+$` shape:
  `packages/desktop/scripts/build-metadata.mjs` (`appVersion`) feeds
  `extraMetadata.version` in `electron-builder.config.js` and therefore the NSIS
  `MesaCode-<version>-win-x64.exe` filename, and
  `packages/desktop/scripts/build-windows-browser-import-helper.mjs` reads it for the assembly
  version. The scheme only ever emits numeric three-field versions, so both stay valid.

## Acceptance scenarios

1. Given the version `1.0.0`, one bump step yields `1.0.1`.
2. Given the version `1.0.10`, one bump step yields `1.1.0` (patch capped at 10, carried into minor).
3. Given the version `1.10.10`, one bump step yields `2.0.0` (minor capped at 10, carried into major).
4. Given the version `1.10.9`, one bump step yields `1.10.10`.
5. A produced version always matches `^\d+\.\d+\.\d+$`, and its `MINOR`/`PATCH` fields are never
   greater than 10.
6. Running `build-installer.bat` on Windows x64 produces exactly one new
   `MesaCode-<version>-win-x64.exe` under `packages/desktop/dist` whose `<version>` is the bumped
   value from the root `package.json`.
