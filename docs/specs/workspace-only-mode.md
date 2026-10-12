# Workspace only permission boundary

**Status:** active  
**Owner:** CLI execution-state, path-policy, and composer maintainers  
**Authority:** contract  
**Scope:** workspace confinement independent of permission mode and plan state  
**Updated:** 2026-10-12 08:39 (local time)  
**Verification:** source-only review; filesystem containment limitations remain below

## Product rules

Workspace only is a boundary toggle layered over the permission modes, not a
fourth mode. When enabled, work must stay inside the current workspace. When
disabled, access outside the workspace still requires an explicit user request
and the applicable permissions.

- The composer mode menu (`V4ComposerModeSwitch`) places the toggle below the
  permission choices, separated from them.
- Legacy `session/setMode` accepts optional `workspaceOnly`.
- V4 carries it through `SessionConfigState.workspaceOnly`,
  `createSession.config.workspaceOnly`, `firstInput.workspaceOnly`,
  `sendText.workspaceOnly`, and `sendGoalCommand.workspaceOnly`.

| Dimension | Values | Meaning |
| --- | --- | --- |
| `mode` | `build`, `edit`, `yolo` (internal `auto`) | Tool approval policy |
| `planEnabled` | boolean | Research/plan phase rather than implementation |
| `workspaceOnly` | boolean | Workspace path boundary |

All three dimensions are independent. Full Access (`yolo`) changes approval;
it does not remove Workspace only. Plan and Workspace only do not toggle each
other. The default is **off**, preserving existing outside-workspace behavior:
`executionStateSchema` defaults to `false`, and `resolveExecutionState()` uses
`input.workspaceOnly ?? current.workspaceOnly ?? false`. Old session snapshots
may omit the optional field.

## File-tool boundary

[`resolveWorkspacePath()`](../../apps/mesa-code-cli/packages/core/src/tool/path-policy.ts)
normalizes/resolves an absolute path and checks `isPathInsideWorkspace()` when
the toggle is on. Outside paths throw before permission approval, with
`reason: "workspace_only"`. This applies to tools using that resolver, including
Read, Write, Edit, Glob, Grep, and NotebookEdit.

The current predicate permits the root itself or a relative result that does not
start with `..` and is not absolute. This is **lexical containment**, not proof of
filesystem confinement: the resolver does not canonicalize symlinks/junctions
with `realpath`. The specification's intended inside-workspace guarantee remains;
symlink/junction traversal requires a separate implementation/security decision.
Do not advertise the current check as an OS sandbox or a verified hard security
boundary. The prefix check can also reject an in-root name beginning with `..`;
that is a source limitation, not a new product prohibition.

## Bash guardrail, not a sandbox

The OS-level Bash sandbox is absent from the current execution path.
`ExecutionSandboxPolicy` remains a contract type, but its existence does not prove
an enforcing adapter. Bash confinement is best-effort:

1. `resolveBashWorkspaceCwd()` pins the initial cwd to the workspace root.
2. `resolveBashWorkspaceOnlyViolation()` checks path-shaped absolute tokens and
   rejects those resolving outside the root; absolute paths inside it are allowed
   by the current helper. It also rejects `..` path segments.

The owner is
[`bash-workspace-only.ts`](../../apps/mesa-code-cli/packages/core/src/tool/handlers/bash-workspace-only.ts).
Interpreters, downloaded executables, environment-variable construction, and other
indirection can bypass a command-text check. Strong confinement would require an
OS-level mechanism, not more regex claims.

## Prompt guidance

`WORKSPACE_ONLY_REMINDER` / `buildWorkspaceOnlyReminderBody` in
`apps/mesa-code-cli/packages/core/src/runtime/helpers/runtime-reminders.ts` tells
the model to treat the workspace root as its filesystem boundary, avoid external
paths, and ask the user to turn off Workspace only when external files are needed.
This shapes planning but grants no permissions and proves no model compliance.

## Owners and event order

```text
Composer toggle -> V4ComposerDraft.workspaceOnly (session-scoped local draft)
  -> submission freezes ComposerSubmissionConfig.workspaceOnly
  -> command/queue item/conversationInputIntent
  -> applySubmissionExecutionState -> applyRuntimeExecutionState
  -> runtime.config + SESSION_ENTRY_EXECUTION_STATE + SessionModeChanged
  -> tool context.sessionModePort.isWorkspaceOnly()

Cold restore -> transcript-hydration intent -> runtime execution state
  -> v4-bridge config seed -> product-projection config.workspaceOnly
  -> state.updated delta -> renderer
```

The composer owns only the uncommitted draft; the runtime owns applied execution
state. CommandInbox admission and remote identity rules remain unchanged. No
second durable owner is introduced.

## Verification scenarios

- Enable Workspace only under each permission mode; confirm an outside file-tool
  path fails without an approval bypass, and the workspace root remains valid.
- Toggle Plan independently; confirm neither setting changes the other.
- Submit, queue, restore, and replay the execution state through the same owner.
- Check Bash cwd, outside absolute paths, parent traversal, and inside absolute
  paths against the helper's actual behavior; do not claim interpreter isolation.
- Exercise symlinks/junctions separately before claiming filesystem confinement.

Existing focused check:
`pnpm exec tsx --test apps/mesa-code-cli/packages/core/test/workspace-only-policy.test.ts`.
It was not run for this documentation review; lexical path tests alone do not
prove symlink confinement or a launched session's behavior.

## Source map

| Concern | Repository-relative source |
| --- | --- |
| Shared execution state | `packages/shared/src/execution-state.ts` |
| V4 session configuration | `packages/shared/src/mesa-code-protocol-v4/session-config.ts` |
| V4 commands and intent | `packages/shared/src/mesa-code-protocol-v4/command.ts`, `input-intent.ts` |
| File path policy | `apps/mesa-code-cli/packages/core/src/tool/path-policy.ts` |
| Bash guardrail | `apps/mesa-code-cli/packages/core/src/tool/handlers/bash-workspace-only.ts`, `bash.ts` |
| Runtime state | `apps/mesa-code-cli/packages/core/src/runtime/execution-state.ts` |
| Projection | `apps/mesa-code-cli/packages/bootstrap/src/mesa-code-protocol-v4/product-projection.ts` |
| Composer controls | `packages/ui/src/v4/composer/V4ComposerModeControls.tsx` |
