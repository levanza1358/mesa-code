// Tests for the workspace-only enforcement that does not depend on the runtime:
// path containment and the Bash command guard.
import assert from "node:assert/strict";
import test from "node:test";

import { isPathInsideWorkspace, resolveWorkspacePath } from "../src/tool/path-policy.js";
import { __testing__ as bashGuard } from "../src/tool/handlers/bash-workspace-only.js";

const WORKSPACE = process.platform === "win32" ? "C:\\work\\repo" : "/work/repo";

test("path inside the workspace is allowed when workspace-only is on", () => {
  const resolved = resolveWorkspacePath({
    inputPath: "src/index.ts",
    operation: "read",
    workingDirectory: WORKSPACE,
    workspaceRoot: WORKSPACE,
    workspaceOnly: true,
  });
  assert.ok(isPathInsideWorkspace(resolved, WORKSPACE));
});

test("workspace root itself is allowed", () => {
  const resolved = resolveWorkspacePath({
    inputPath: ".",
    operation: "read",
    workingDirectory: WORKSPACE,
    workspaceRoot: WORKSPACE,
    workspaceOnly: true,
  });
  assert.equal(resolved, WORKSPACE);
});

test("a sibling path is rejected when workspace-only is on", () => {
  assert.throws(
    () =>
      resolveWorkspacePath({
        inputPath: process.platform === "win32" ? "..\\other\\file.txt" : "../other/file.txt",
        operation: "read",
        workingDirectory: WORKSPACE,
        workspaceRoot: WORKSPACE,
        workspaceOnly: true,
      }),
    /outside the workspace/i,
  );
});

test("an absolute outside path is rejected when workspace-only is on", () => {
  const outside = process.platform === "win32" ? "C:\\Windows\\System32\\drivers\\etc\\hosts" : "/etc/passwd";
  assert.throws(
    () =>
      resolveWorkspacePath({
        inputPath: outside,
        operation: "read",
        workingDirectory: WORKSPACE,
        workspaceRoot: WORKSPACE,
        workspaceOnly: true,
      }),
    /outside the workspace/i,
  );
});

test("the same outside path is allowed when workspace-only is off", () => {
  const outside = process.platform === "win32" ? "C:\\Windows\\System32\\drivers\\etc\\hosts" : "/etc/passwd";
  const resolved = resolveWorkspacePath({
    inputPath: outside,
    operation: "read",
    workingDirectory: WORKSPACE,
    workspaceRoot: WORKSPACE,
    workspaceOnly: false,
  });
  assert.equal(resolved, outside);
});

test("isPathInsideWorkspace treats the root and descendants as inside", () => {
  const sep = process.platform === "win32" ? "\\" : "/";
  assert.equal(isPathInsideWorkspace(WORKSPACE, WORKSPACE), true);
  assert.equal(isPathInsideWorkspace(`${WORKSPACE}${sep}a${sep}b`, WORKSPACE), true);
  assert.equal(
    isPathInsideWorkspace(`${WORKSPACE}${sep}..${sep}elsewhere`, WORKSPACE),
    false,
  );
});

test("bash guard flags parent traversal", () => {
  assert.equal(bashGuard.commandTouchesParentTraversal("cd .."), true);
  assert.equal(bashGuard.commandTouchesParentTraversal("cd ../.."), true);
  assert.equal(bashGuard.commandTouchesParentTraversal("cat ../../secret"), true);
  assert.equal(bashGuard.commandTouchesParentTraversal("ls src"), false);
  assert.equal(bashGuard.commandTouchesParentTraversal("echo done"), false);
});

test("bash guard is inert when workspace-only is off", () => {
  const makeContext = (workspaceOnly: boolean) => ({
    workspaceRoot: WORKSPACE,
    workingDirectory: WORKSPACE,
    sessionModePort: { isWorkspaceOnly: () => workspaceOnly },
  });

  // Off: an outside absolute path is not blocked by the guard.
  const off = bashGuard.resolveBashWorkspaceOnlyViolation(
    process.platform === "win32" ? "type C:\\Windows\\win.ini" : "cat /etc/passwd",
    makeContext(false) as never,
  );
  assert.equal(off, undefined);

  // On: the same command is blocked.
  const on = bashGuard.resolveBashWorkspaceOnlyViolation(
    process.platform === "win32" ? "type C:\\Windows\\win.ini" : "cat /etc/passwd",
    makeContext(true) as never,
  );
  assert.ok(on, "expected a violation error when workspace-only is on");
});

test("bash guard blocks parent traversal when workspace-only is on", () => {
  const context = {
    workspaceRoot: WORKSPACE,
    workingDirectory: WORKSPACE,
    sessionModePort: { isWorkspaceOnly: () => true },
  };
  const violation = bashGuard.resolveBashWorkspaceOnlyViolation("cd .. && ls", context as never);
  assert.ok(violation, "expected traversal to be blocked");
});

test("bash guard allows a purely in-workspace command", () => {
  const context = {
    workspaceRoot: WORKSPACE,
    workingDirectory: WORKSPACE,
    sessionModePort: { isWorkspaceOnly: () => true },
  };
  const violation = bashGuard.resolveBashWorkspaceOnlyViolation(
    "npm test -- --runInBand",
    context as never,
  );
  assert.equal(violation, undefined);
});
