// The v4 delta reducer is the protocol's semantic reference: `coalesce` is judged by it
// (`applyAll(s, coalesce(ds))` must equal `applyAll(s, ds)` byte for byte). Streaming jank
// came from this reducer copying `rows.window` and rebuilding the touched row on every
// token even when nothing changed; the identity guarantees below are what let the client
// store and the conversation timeline skip rebuilding untouched turns. These tests pin
// both the value semantics and the identity retention.
import assert from "node:assert/strict";
import test from "node:test";

import { applyConversationDelta, applyConversationDeltas } from "../src/mesa-code-protocol-v4/apply.js";
import { coalesceConversationDeltas } from "../src/mesa-code-protocol-v4/coalesce.js";
import type { ConversationDelta } from "../src/mesa-code-protocol-v4/delta.js";
import type { ConversationRow } from "../src/mesa-code-protocol-v4/rows.js";
import type { ConversationSnapshot } from "../src/mesa-code-protocol-v4/snapshot.js";

// Only `rows` is read (and spread) by the reducer, so a minimal fixture is enough here;
// the tests target reducer semantics, not schema parsing.
function snapshotOf(window: ConversationRow[], totalCount = window.length): ConversationSnapshot {
  return {
    rows: { window, totalCount, firstRowId: window[0]?.rowId ?? null },
  } as unknown as ConversationSnapshot;
}

function assistantText(rowId: number, turnId: string, text: string, state: "streaming" | "complete"): ConversationRow {
  return {
    kind: "assistantText",
    rowId,
    turnId,
    text,
    state,
    createdAt: 1_000 + rowId,
    createdAtSeq: rowId,
  } as ConversationRow;
}

function toolCall(rowId: number, turnId: string): ConversationRow {
  return {
    kind: "toolCall",
    rowId,
    turnId,
    toolCallId: `tool-${rowId}`,
    toolName: "Bash",
    status: "success",
    inputText: "ls",
    createdAt: 1_000 + rowId,
    createdAtSeq: rowId,
  } as ConversationRow;
}

test("row.delta replaces only the target row and keeps every other row identity", () => {
  const other = assistantText(1, "t1", "first", "complete");
  const target = assistantText(2, "t1", "Hel", "streaming");
  const before = snapshotOf([other, target]);

  const after = applyConversationDelta(before, {
    op: "row.delta",
    rowId: 2,
    path: "text",
    append: "lo",
  });

  assert.notStrictEqual(after, before);
  assert.notStrictEqual(after.rows.window, before.rows.window);
  // Untouched rows are the very same objects, so memoized consumers can bail out.
  assert.strictEqual(after.rows.window[0], other);
  assert.notStrictEqual(after.rows.window[1], target);
  assert.equal((after.rows.window[1] as { text: string }).text, "Hello");
  // The original snapshot is never mutated.
  assert.equal((before.rows.window[1] as { text: string }).text, "Hel");
});

test("row.delta whose path does not apply to the row is a full no-op (same snapshot)", () => {
  const other = assistantText(1, "t1", "first", "complete");
  const target = toolCall(2, "t1");
  const before = snapshotOf([other, target]);

  // `text` only appends to assistantText/reasoning; on a toolCall it changes nothing.
  const after = applyConversationDelta(before, {
    op: "row.delta",
    rowId: 2,
    path: "text",
    append: "ignored",
  });

  assert.strictEqual(after, before);
  assert.strictEqual(after.rows.window, before.rows.window);
});

test("row.delta targeting a missing row returns the same snapshot object", () => {
  const before = snapshotOf([assistantText(1, "t1", "first", "complete")]);
  const after = applyConversationDelta(before, {
    op: "row.delta",
    rowId: 99,
    path: "text",
    append: "x",
  });
  assert.strictEqual(after, before);
});

test("row.upserted with the identical object reference is a no-op", () => {
  const row = assistantText(1, "t1", "done", "complete");
  const before = snapshotOf([row]);
  const after = applyConversationDelta(before, { op: "row.upserted", row });
  assert.strictEqual(after, before);
  assert.strictEqual(after.rows.window, before.rows.window);
});

test("row.upserted targeting a missing row returns the same snapshot object", () => {
  const before = snapshotOf([assistantText(1, "t1", "done", "complete")]);
  const after = applyConversationDelta(before, {
    op: "row.upserted",
    row: assistantText(2, "t1", "other", "complete"),
  });
  assert.strictEqual(after, before);
});

test("coalescing preserves the applied value and the identity of untouched rows", () => {
  const userRow = assistantText(1, "t1", "q", "complete");
  const streamInitial = assistantText(2, "t1", "", "streaming");
  const streamFinal = assistantText(2, "t1", "Hello world", "complete");
  const before = snapshotOf([userRow, streamInitial]);

  const deltas: ConversationDelta[] = [
    { op: "row.delta", rowId: 2, path: "text", append: "Hello" },
    { op: "row.delta", rowId: 2, path: "text", append: " world" },
    // Supersedes the two appends above (rule 3): a whole-row replace wins.
    { op: "row.upserted", row: streamFinal },
    { op: "state.updated", patch: { revision: 5 } },
    { op: "state.updated", patch: { goal: null } },
  ];

  const coalesced = coalesceConversationDeltas(deltas);
  // Same (rowId, path) appends merge; the append is dropped by the later upsert; the two
  // state.updated patches fold into one — so the frame is strictly smaller than the input.
  assert.ok(coalesced.length < deltas.length);

  const stepwise = applyConversationDeltas(before, deltas);
  const coalescedApply = applyConversationDeltas(before, coalesced);

  // Value equivalence is the golden invariant.
  assert.deepEqual(coalescedApply, stepwise);
  // Identity: a row the frame never touched keeps its object through both paths.
  assert.strictEqual(stepwise.rows.window[0], userRow);
  assert.strictEqual(coalescedApply.rows.window[0], userRow);
  assert.equal((coalescedApply.rows.window[1] as { text: string }).text, "Hello world");
});

test("coalescing never crosses a row.removed barrier", () => {
  // A row.delta before and an identical (rowId, path) row.delta after a removal must NOT
  // merge, because the removal reorders/evicts the row in between.
  const deltas: ConversationDelta[] = [
    { op: "row.delta", rowId: 2, path: "text", append: "a" },
    { op: "row.removed", fromRowId: 5 },
    { op: "row.delta", rowId: 2, path: "text", append: "b" },
  ];
  const coalesced = coalesceConversationDeltas(deltas);
  assert.equal(coalesced.length, 3);
});
