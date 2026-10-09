import assert from "node:assert/strict";
import test from "node:test";
import type { ModelInputMessage } from "@mesa-code/contracts";
import { normalizeToolCallHistory } from "../src/model/tool-call-history-normalization.js";

// Regression: an OpenAI-compatible upstream (CodeBuddy) rejects a request whose tool results do
// not pair with the assistant tool calls that declared them, answering the terminal business
// error `tool_call_sequence_broken`. A retry replays the same broken history, so the repair must
// happen locally on the outgoing request. These cases pin the three invariants that repair owns.

const assistantWithCall = (id: string): ModelInputMessage => ({
  role: "assistant",
  content: "",
  toolCalls: [{ id, name: "read_file", arguments: "{}" }],
});

const toolResult = (id: string): ModelInputMessage => ({
  role: "tool",
  content: "ok",
  toolCallId: id,
  toolName: "read_file",
});

test("drops a tool result that no assistant tool call declares", () => {
  const messages: ModelInputMessage[] = [
    { role: "user", content: "hi" },
    toolResult("orphan-id"),
  ];

  assert.deepEqual(normalizeToolCallHistory(messages), [{ role: "user", content: "hi" }]);
});

test("replaces a missing tool result with an interrupted placeholder", () => {
  const messages: ModelInputMessage[] = [
    { role: "user", content: "hi" },
    assistantWithCall("call-1"),
    { role: "user", content: "never mind" },
  ];

  const repaired = normalizeToolCallHistory(messages);
  const placeholder = repaired.find((message) => message.role === "tool");

  assert.ok(placeholder, "a placeholder result must be inserted");
  assert.equal(placeholder.toolCallId, "call-1");
  assert.equal(placeholder.toolName, "read_file");
  assert.equal(placeholder.isError, true);
  // The placeholder has to sit immediately after its declaring assistant turn.
  const assistantIndex = repaired.findIndex((message) => message.role === "assistant");
  assert.equal(repaired[assistantIndex + 1], placeholder);
});

test("collapses a duplicated tool result to its first occurrence", () => {
  const messages: ModelInputMessage[] = [
    assistantWithCall("call-1"),
    toolResult("call-1"),
    toolResult("call-1"),
  ];

  const repaired = normalizeToolCallHistory(messages);
  assert.equal(repaired.filter((message) => message.role === "tool").length, 1);
});

test("leaves an already consistent history untouched", () => {
  const messages: ModelInputMessage[] = [
    { role: "user", content: "hi" },
    assistantWithCall("call-1"),
    toolResult("call-1"),
    { role: "assistant", content: "done" },
  ];

  // Identity must hold, otherwise every send would allocate a new history array.
  assert.equal(normalizeToolCallHistory(messages), messages);
});
