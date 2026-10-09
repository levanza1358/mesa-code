// ============================================================
// Bash workspace confinement
// ============================================================
// "Workspace only" must keep a session inside its workspace root. File tools
// enforce that exactly through `resolveWorkspacePath`. Bash cannot be enforced
// the same way: a shell can leave the workspace with an absolute path, `cd ..`,
// an interpreter one-liner, or any downloaded binary. This module therefore
// does the strongest thing that is honest without an OS sandbox:
//
//   1. pin the command's cwd to the workspace root, and
//   2. reject commands that clearly name a path outside the workspace.
//
// It is a guardrail against accidental escapes, not a security boundary. The
// prompt tells the model the rule up front so it does not try in the first
// place; see `createBashProviderDescription`.

import { isAbsolute, normalize, relative, resolve, sep } from "node:path";
import { CoreErrorType, createCoreError } from "@mesa-code/contracts";
import { isPathInsideWorkspace, resolveToolWorkingDirectory } from "../path-policy.js";
import type { ToolExecutionContext } from "../types.js";

/** Path-shaped tokens that could point outside the workspace. */
const ABSOLUTE_PATH_PATTERN = /(^|[\s"'`=(<|;&])((?:[a-zA-Z]:[\\/]|\\\\|\/)[^\s"'`)|;&<>]*)/gu;

/**
 * Resolve the cwd for a Bash command. When workspace-only is on the command
 * always starts at the workspace root, so a relative path cannot silently
 * resolve outside it.
 */
export function resolveBashWorkspaceCwd(context: ToolExecutionContext): string {
  const workspaceOnly = context.sessionModePort?.isWorkspaceOnly?.() === true;
  const base = resolveToolWorkingDirectory(undefined, {
    operation: "execute",
    workingDirectory: context.workingDirectory,
    workspaceRoot: context.workspaceRoot,
  });
  if (!workspaceOnly) return base;
  return normalize(context.workspaceRoot);
}

/**
 * Reject a Bash command that appears to touch a path outside the workspace
 * while workspace-only is on. Returns an error to throw, or undefined when the
 * command is acceptable.
 *
 * Known and accepted limits (documented in docs/specs/workspace-only-mode.md):
 * a hostile command can still escape through indirection the pattern cannot
 * see. This is why the prompt states the rule and the check is described as a
 * guardrail, not a sandbox.
 */
export function resolveBashWorkspaceOnlyViolation(
  command: string,
  context: ToolExecutionContext,
): ReturnType<typeof createCoreError> | undefined {
  if (context.sessionModePort?.isWorkspaceOnly?.() !== true) return undefined;

  const workspaceRoot = normalize(context.workspaceRoot);
  for (const match of command.matchAll(ABSOLUTE_PATH_PATTERN)) {
    const candidate = match[2];
    if (!candidate) continue;
    const resolved = normalize(isAbsolute(candidate) ? candidate : resolve(candidate));
    if (isPathInsideWorkspace(resolved, workspaceRoot)) continue;
    // 相对路径含 `..` 时，即便不是绝对路径也可能离开 workspace（cwd 固定在根，
    // 但 `../../x` 仍越界）。这里一并拦截，避免"看起来是相对路径"的绕过。
    return createBashWorkspaceOnlyViolation(resolved, workspaceRoot);
  }

  if (commandTouchesParentTraversal(command)) {
    return createBashWorkspaceOnlyViolation(undefined, workspaceRoot);
  }

  return undefined;
}

/** True when the command navigates above the workspace root. */
function commandTouchesParentTraversal(command: string): boolean {
  // Match `cd ..`, `cd ../..`, and `..` used as a path segment in arguments.
  return /(^|[\s;&|"'`(])\.\.(?:[\\/]|[\s;&|"'`)]|$)/u.test(command);
}

function createBashWorkspaceOnlyViolation(
  resolvedPath: string | undefined,
  workspaceRoot: string,
): ReturnType<typeof createCoreError> {
  const target = resolvedPath ? `"${resolvedPath}"` : "a path above the workspace root";
  return createCoreError(
    CoreErrorType.ToolExecutionFailed,
    `Bash blocked: ${target} is outside the workspace "${workspaceRoot}". "Workspace only" is enabled for this session, so commands must stay inside it. Use a relative path inside the workspace, or ask the user to turn off "Workspace only".`,
    {
      context: {
        operation: "execute",
        workspaceRoot,
        requestedPath: resolvedPath,
        reason: "workspace_only",
      },
      recoverable: true,
    },
  );
}

/** Exposed for tests. */
export const __testing__ = {
  commandTouchesParentTraversal,
  resolveBashWorkspaceOnlyViolation,
  ABSOLUTE_PATH_PATTERN,
  sep,
};
