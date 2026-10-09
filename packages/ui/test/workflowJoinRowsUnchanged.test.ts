// P3 regression: the workflow-join identity selector must treat a streaming-row object
// identity change as "unchanged" (so `rowContext` keeps its identity across tokens and
// memoized history turns bail), while a workflow-relevant row's identity change — or a
// window length change — must count as changed. This predicate is what stops the
// per-token rebuild of the workflow join tables in SessionPane.
import assert from "node:assert/strict";
import test from "node:test";

import type { ConversationRow } from "@mesa-code/shared/mesa-code-protocol-v4";
import { workflowJoinRowsUnchanged } from "../src/v4/workflowRunCardJoin.js";

// Only `kind` (and, for toolCall, the workflow-tool name) is read by the selector, so a
// minimal shape is enough; the cast documents that intent.
const assistantText = (rowId: number): ConversationRow =>
  ({ kind: "assistantText", rowId, turnId: "turn-1" }) as unknown as ConversationRow;
const toolCall = (rowId: number, toolName: string): ConversationRow =>
  ({ kind: "toolCall", rowId, turnId: "turn-1", toolName }) as unknown as ConversationRow;
const userInput = (rowId: number): ConversationRow =>
  ({ kind: "userInput", rowId, turnId: "turn-1" }) as unknown as ConversationRow;

test("a new object identity for a streaming assistantText row is 'unchanged' for joins", () => {
  const previous = [assistantText(1), toolCall(2, "Read"), assistantText(3)];
  // Same rowIds, but the streaming rows are fresh objects (as apply.ts produces per token).
  const next = [assistantText(1), previous[1]!, assistantText(3)];
  assert.notEqual(next[0], previous[0]);
  // Every position that changed identity is a non-workflow row → joins unchanged.
  assert.equal(workflowJoinRowsUnchanged(previous, next), true);
});

test("a workflow-relevant row identity change counts as changed", () => {
  const previous = [assistantText(1), toolCall(2, "CreateWorkflow")];
  const next = [previous[0]!, toolCall(2, "CreateWorkflow")];
  assert.equal(workflowJoinRowsUnchanged(previous, next), false);
});

test("a userInput identity change counts as changed (it may carry workflowLaunch)", () => {
  const previous = [assistantText(1), userInput(2)];
  const next = [previous[0]!, userInput(2)];
  assert.equal(workflowJoinRowsUnchanged(previous, next), false);
});

test("a length change counts as changed even if the overlap is identical", () => {
  const previous = [assistantText(1), assistantText(2)];
  const next = [previous[0]!];
  assert.equal(workflowJoinRowsUnchanged(previous, next), false);
});

test("a referentially identical window is unchanged", () => {
  const rows = [assistantText(1), toolCall(2, "Read"), assistantText(3)];
  assert.equal(workflowJoinRowsUnchanged(rows, rows), true);
});
