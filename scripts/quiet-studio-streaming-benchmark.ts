import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import type { ConversationRow } from "@mesa-code/shared/mesa-code-protocol-v4";
import {
  buildConversationTurnRenderUnits,
  buildConversationTurnRenderUnitsUncached,
} from "../packages/ui/src/v4/conversationTurnRenderUnits.js";

function row(rowId: number, turnId: string, text: string, state = "complete"): ConversationRow {
  return {
    kind: "assistantText",
    rowId,
    turnId,
    text,
    state,
    createdAt: rowId,
    createdAtSeq: rowId,
  } as ConversationRow;
}

// The old path fully materialized units before its identity-reuse pass.
// Timing only that derivation understates, rather than exaggerates, the old cost.
for (const historyTurns of [10, 100, 1000]) {
  for (const responseChars of [1000, 50000]) {
    const history = Array.from({ length: historyTurns }, (_, index) =>
      row(index + 1, `history-${index}`, "Generated completed response."),
    );
    const frames = Array.from({ length: 120 }, (_, index) => [
      ...history,
      row(
        historyTurns + 1,
        "live",
        "x".repeat(responseChars) + " token".repeat(index),
        "streaming",
      ),
    ]);
    const cache = new Map();
    const oldTimes: number[] = [];
    const newTimes: number[] = [];
    for (let index = 0; index < frames.length; index += 1) {
      const rows = frames[index]!;
      const options = { nowMs: 1000 };
      const measureOld = () => {
        const start = performance.now();
        const units = buildConversationTurnRenderUnitsUncached(rows, options).units;
        if (index >= 20) oldTimes.push(performance.now() - start);
        return units;
      };
      const measureNew = () => {
        const start = performance.now();
        const units = buildConversationTurnRenderUnits(rows, options, cache);
        if (index >= 20) newTimes.push(performance.now() - start);
        return units;
      };
      const oldUnits = index % 2 ? measureOld() : undefined;
      const newUnits = measureNew();
      assert.deepEqual(newUnits, oldUnits ?? measureOld());
    }
    const stats = (values: number[]) => {
      values.sort((a, b) => a - b);
      return { medianMs: Number(values[50]!.toFixed(3)), p95Ms: Number(values[95]!.toFixed(3)) };
    };
    console.log(
      JSON.stringify({
        historyTurns,
        responseChars,
        measuredFrames: 100,
        oldDerivation: stats(oldTimes),
        optimizedDerivation: stats(newTimes),
      }),
    );
  }
}
