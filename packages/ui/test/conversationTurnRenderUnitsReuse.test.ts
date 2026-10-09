// The timeline rebuilds its turn render units on every projection frame. Streaming appends
// one `row.delta` per token, so without reuse a single streaming turn forced every
// already-finished turn to re-derive and re-render. `buildConversationTurnRenderUnits` takes
// a caller-owned cache and hands back the previous unit object for a turn whose member rows
// are referentially unchanged. These tests pin that reuse (and its two intended invariants:
// a running turn re-derives on `nowMs`, and a session-phase change re-derives).
import assert from "node:assert/strict";
import test from "node:test";

import {
  buildConversationTurnRenderUnits,
  type ConversationTurnRenderUnitsCache,
} from "../src/v4/conversationTurnRenderUnits.js";
import type { ConversationRow } from "@mesa-code/shared/mesa-code-protocol-v4";

function assistantText(
  rowId: number,
  turnId: string,
  text: string,
  state: "streaming" | "complete",
): ConversationRow {
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

test("a finished turn keeps its render-unit identity across nowMs ticks", () => {
  const cache: ConversationTurnRenderUnitsCache = new Map();
  const row = assistantText(1, "turn-a", "done", "complete");

  const first = buildConversationTurnRenderUnits([row], { nowMs: 1_000 }, cache);
  const second = buildConversationTurnRenderUnits([row], { nowMs: 5_000 }, cache);

  assert.equal(first.length, 1);
  // `nowMs` is irrelevant to a terminal turn, so the identity must survive the tick.
  assert.strictEqual(second[0], first[0]);
});

test("streaming the tail reuses the finished turn and rebuilds only the tail", () => {
  const cache: ConversationTurnRenderUnitsCache = new Map();
  const history = assistantText(1, "turn-a", "done", "complete");
  const tailBefore = assistantText(2, "turn-b", "Hel", "streaming");
  const tailAfter = assistantText(2, "turn-b", "Hello", "streaming");

  const before = buildConversationTurnRenderUnits([history, tailBefore], { nowMs: 1_000 }, cache);
  const after = buildConversationTurnRenderUnits([history, tailAfter], { nowMs: 1_000 }, cache);

  assert.equal(before.length, 2);
  assert.equal(after.length, 2);
  // The finished turn's member rows are untouched → same unit object → memoized group bails.
  assert.strictEqual(after[0], before[0]);
  // The tail's row changed identity → its unit is rebuilt.
  assert.notStrictEqual(after[1], before[1]);
});

test("a running turn re-derives when nowMs advances", () => {
  const cache: ConversationTurnRenderUnitsCache = new Map();
  const row = assistantText(1, "turn-b", "thinking", "streaming");

  const first = buildConversationTurnRenderUnits([row], { nowMs: 1_000 }, cache);
  const second = buildConversationTurnRenderUnits([row], { nowMs: 2_000 }, cache);

  // A running turn's derived unit depends on elapsed work time, so it must not be reused.
  assert.notStrictEqual(second[0], first[0]);
});

test("a session-phase change re-derives the turn", () => {
  const cache: ConversationTurnRenderUnitsCache = new Map();
  const row = assistantText(1, "turn-b", "thinking", "streaming");

  const first = buildConversationTurnRenderUnits([row], {}, cache);
  const second = buildConversationTurnRenderUnits([row], { sessionPhase: "error" }, cache);

  assert.notStrictEqual(second[0], first[0]);
});

test("without a cache the build is a plain fresh derivation each call", () => {
  const row = assistantText(1, "turn-a", "done", "complete");
  const first = buildConversationTurnRenderUnits([row], { nowMs: 1_000 });
  const second = buildConversationTurnRenderUnits([row], { nowMs: 1_000 });
  assert.notStrictEqual(second[0], first[0]);
});
