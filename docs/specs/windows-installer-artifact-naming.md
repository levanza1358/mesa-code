# Windows installer artifact naming

**Status:** active  
**Owner:** desktop packaging maintainers  
**Authority:** contract  
**Scope:** production Windows NSIS artifact filename and identity  
**Updated:** 2026-10-12 08:39 (local time)  
**Verification:** source-only documentation review; no installer was built

## Product rule

The Windows NSIS installer built through `build-installer.bat` is a production-identity Mesa Code artifact. Its filename must be exactly:

```text
MesaCode-<version>-win-x64.exe
```

It must not include the user-facing Preview identity, backend environment suffixes such as `_TEST`, or other test labels.

## Ownership and interface

- `build-installer.bat` owns the environment for the Windows installer build and explicitly requests the production product identity.
- `packages/desktop/electron-builder.config.js` owns the platform artifact-name template.
- The Windows template uses the stable internal executable prefix `MesaCode`, the resolved application version, and electron-builder's architecture placeholder.

## Acceptance scenarios

1. Given a normal invocation of `build-installer.bat` on Windows x64, the generated installer filename matches `MesaCode-<version>-win-x64.exe`.
2. The generated filename does not contain `Preview`, `_TEST`, or `test`.
3. Existing macOS and Linux artifact naming and Preview packaging behavior remain unchanged.
