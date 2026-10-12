# 7za extraction shim

A tiny Rust wrapper around 7-Zip that makes electron-builder's tool extraction
work on Windows **without administrator rights**.

## Problem

electron-builder's bundled `app-builder` binary extracts its helper bundles by
running `7za` from `PATH`. The `winCodeSign` bundle contains macOS dylib
**symlinks**:

```text
darwin/10.12/lib/libcrypto.dylib -> libcrypto.1.0.0.dylib
```

Creating a symbolic link on Windows requires `SeCreateSymbolicLinkPrivilege`,
which a normal (non-elevated, Developer-Mode-off) account does not hold. 7-Zip
then aborts:

```text
ERROR: Cannot create symbolic link : A required privilege is not held by the client.
```

and the whole installer build fails. 7-Zip 21.07 has **no** switch to skip
symlink creation during extraction, so the fix has to sit in front of it.

## What the shim does

For `7za x ... -o<dir> <archive>` it:

1. creates empty placeholder files at the bundle's known symlink paths, so 7-Zip
   does not have to create real links there;
2. forwards the command to the real 7-Zip (which handles the 7z/BCJ2 filters
   that pure-JS extractors cannot);
3. appends `-y` and closes the child's stdin, so an overwrite prompt can never
   block an unattended build;
4. maps 7-Zip exit code `2` — "only the symlink entries failed" — to success,
   because the Windows payload (`rcedit-x64.exe`, `windows-*/signtool.exe`) has
   already been extracted by then.

Any non-`x` command is passed straight through.

## Layout

```text
Cargo.toml      crate manifest (produces bin `7za`)
Cargo.lock      pinned (no dependencies)
src/main.rs     the shim
prebuilt/7za.exe  committed binary, so no Rust toolchain is required to build
```

## Building

Only needed when changing `src/main.rs`. Requires a Rust toolchain:

```powershell
cargo build --release
Copy-Item target\release\7za.exe prebuilt\7za.exe -Force
```

Refresh `prebuilt/7za.exe` whenever the source changes, otherwise machines
without Rust keep running the old shim.

## Environment

| Variable | Purpose |
| --- | --- |
| `MESA_CODE_REAL_7ZA` | Absolute path to the real 7-Zip executable to delegate to. Required. |

The build sets this automatically; see
[`docs/build-tools.md`](../../../docs/build-tools.md).
