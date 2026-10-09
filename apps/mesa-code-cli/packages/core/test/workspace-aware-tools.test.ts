import assert from "node:assert/strict";
import test from "node:test";
import { isWorkspaceToolContext } from "../src/runtime/methods/config.js";

test("exposes tools for any connected workspace path, including non-Git folders", () => {
  assert.equal(isWorkspaceToolContext({ cwd: "C:\\project" }), true);
  assert.equal(isWorkspaceToolContext({ cwd: "C:\\project", isGitRepository: true }), true);
  assert.equal(isWorkspaceToolContext({ cwd: "C:\\project", isGitRepository: false }), true);
  assert.equal(isWorkspaceToolContext({ cwd: "  C:\\project  " }), true);
  assert.equal(isWorkspaceToolContext({ cwd: "" }), false);
  assert.equal(isWorkspaceToolContext(undefined), false);
});