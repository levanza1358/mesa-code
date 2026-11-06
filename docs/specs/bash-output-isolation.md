# Bash output isolation

**Status:** active  
**Owner:** CLI execution adapter maintainers  
**Scope:** temporary persistence of merged Bash stdout/stderr during command execution  
**Updated:** 2026-10-31  
**Authority:** contract

## Product rule

Merged Bash output uses a per-process temporary directory under the platform temp root when available. The existing Mesa Code execution output directory remains the fallback when the temporary filesystem cannot be created or opened.

The selected output path is prepared before process spawn and remains stable for the complete execution. Background-task records expose that same path. Cancellation, adapter shutdown, and preparation failure close and remove only newly-created temporary files; an existing fallback artifact is never deleted accidentally.

## Ownership and event order

```text
Execution adapter
  → prepare output path/file
  → spawn Bash with stdout+stderr redirected
  → watch/read output
  → close/discard file
  → settle execution result
```

`NodeExecutionAdapterRun` owns preparation and cleanup. `NodeExecutionAdapterLifecycle` passes the prepared file into foreground/background execution. Bootstrap supplies `tmpdir()` to the adapter, including workflow child runtimes.

## Compatibility

This changes only transient Bash output placement. Persisted output contracts, `MESA_CODE_*` identifiers, task/session state, and protocol frames remain unchanged. If the temp filesystem is unavailable (`EACCES`, `EPERM`, `EROFS`, `ENOENT`, `ENOTDIR`, `ENOSPC`, or `EDQUOT`), the adapter falls back to its existing output root.

## Verification

- CLI package typecheck/build.
- Focused execution adapter tests when available.
- Repository `pnpm typecheck`, `pnpm lint`, and architecture checks.
