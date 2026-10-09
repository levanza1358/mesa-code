// ============================================================
// Tool Path Policy
// ============================================================

import { isAbsolute, normalize, relative, resolve } from "node:path";
import { CoreErrorType, createCoreError } from "@mesa-code/contracts";

interface ToolWorkspacePathOptions {
  inputPath: string;
  workingDirectory: string;
  workspaceRoot: string;
  operation: "read" | "write" | "execute";
  /**
   * When true, a resolved path outside `workspaceRoot` is rejected instead of
   * being passed through. Set from the session's "Workspace only" toggle.
   */
  workspaceOnly?: boolean;
}

export function resolveWorkspacePath(options: ToolWorkspacePathOptions): string {
  const workingDirectory = normalizeAbsoluteDirectory(
    options.workingDirectory,
    "workingDirectory",
  );
  const workspaceRoot = normalizeAbsoluteDirectory(options.workspaceRoot, "workspaceRoot");
  const requestedPath = options.inputPath;

  if (requestedPath.length === 0) {
    throw createCoreError(CoreErrorType.ToolExecutionFailed, "Tool path must not be empty", {
      context: {
        operation: options.operation,
      },
      recoverable: true,
    });
  }

  const resolvedPath = isAbsolute(requestedPath)
    ? normalize(requestedPath)
    : resolve(workingDirectory, requestedPath);

  if (options.workspaceOnly === true && !isPathInsideWorkspace(resolvedPath, workspaceRoot)) {
    throw createWorkspaceOnlyViolation(resolvedPath, workspaceRoot, options.operation);
  }

  // 未开启 Workspace only 时保留原有放行行为：subagent 可能需要查看用户指定的
  // 兄弟仓库或外部文件，权限适配器尚未为它们建立独立的 ask/deny 规则。
  return resolvedPath;
}

/**
 * True when `candidate` is the workspace root itself or lives inside it.
 * Both paths must already be normalized absolute paths.
 */
export function isPathInsideWorkspace(candidate: string, workspaceRoot: string): boolean {
  const rel = relative(workspaceRoot, candidate);
  if (rel.length === 0) return true;
  return !rel.startsWith("..") && !isAbsolute(rel);
}

function createWorkspaceOnlyViolation(
  resolvedPath: string,
  workspaceRoot: string,
  operation: ToolWorkspacePathOptions["operation"],
): ReturnType<typeof createCoreError> {
  return createCoreError(
    CoreErrorType.ToolExecutionFailed,
    `Path is outside the workspace: "${resolvedPath}". "Workspace only" is enabled, so this session can only use files under "${workspaceRoot}". Either use a path inside the workspace, or ask the user to turn off "Workspace only".`,
    {
      context: {
        operation,
        workspaceRoot,
        requestedPath: resolvedPath,
        reason: "workspace_only",
      },
      recoverable: true,
    },
  );
}

export function resolveToolWorkingDirectory(
  inputCwd: string | undefined,
  options: Omit<ToolWorkspacePathOptions, "inputPath">,
): string {
  if (!inputCwd) {
    const workingDirectory = normalizeAbsoluteDirectory(
      options.workingDirectory,
      "workingDirectory",
    );
    normalizeAbsoluteDirectory(options.workspaceRoot, "workspaceRoot");
    return workingDirectory;
  }

  return resolveWorkspacePath({
    ...options,
    inputPath: inputCwd,
  });
}

function normalizeAbsoluteDirectory(value: string, label: string): string {
  const normalized = normalize(value);
  if (!isAbsolute(normalized)) {
    throw createCoreError(
      CoreErrorType.ConfigurationError,
      `${label} must be an absolute path for tool execution`,
      {
        context: {
          [label]: value,
        },
        recoverable: false,
      },
    );
  }
  return normalized;
}
