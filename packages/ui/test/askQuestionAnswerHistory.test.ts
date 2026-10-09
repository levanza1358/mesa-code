// End-to-end read path for the AskUserQuestion card: a v4 tool row (as ProductProjection now
// emits it, with the accepted answers merged into `input`) must reach the renderer's answer
// reader through the row adapter. The card renders "No answer provided" whenever this chain
// drops the answers, so this is the user-visible half of the projection regression.
import assert from "node:assert/strict";
import test from "node:test";
import type { ToolCallRow } from "@mesa-code/shared/mesa-code-protocol-v4";
import { readAskUserQuestionAnswers } from "../src/lib/askUserQuestion.js";
import { toolCallRowToLegacyNode } from "../src/v4/toolCallRowAdapter.js";

const QUESTION = "Which library should we use for date formatting?";

function askUserQuestionRow(input: unknown): ToolCallRow {
  return {
    kind: "toolCall",
    rowId: 1,
    turnId: "turn-1",
    createdAt: 1_700_000_000_000,
    createdAtSeq: 1,
    toolCallId: "tool-1",
    toolName: "AskUserQuestion",
    status: "success",
    inputText: JSON.stringify(input),
    input,
    output: { text: "User has answered your questions." },
  } as ToolCallRow;
}

test("a row carrying merged answers reaches the renderer answer reader", () => {
  const row = askUserQuestionRow({
    questions: [{ question: QUESTION, header: "Library", options: [{ label: "date-fns" }] }],
    answers: { [QUESTION]: "date-fns" },
  });
  const legacy = toolCallRowToLegacyNode(row);
  assert.deepEqual(readAskUserQuestionAnswers(legacy.toolCall), { [QUESTION]: "date-fns" });
});

test("a row without answers yields no answers so the card can show its fallback", () => {
  const row = askUserQuestionRow({
    questions: [{ question: QUESTION, header: "Library", options: [{ label: "date-fns" }] }],
  });
  const legacy = toolCallRowToLegacyNode(row);
  assert.equal(readAskUserQuestionAnswers(legacy.toolCall), undefined);
});
