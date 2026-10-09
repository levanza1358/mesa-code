import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const source = await readFile(
  new URL("../packages/ui/src/v4/ConversationRowView.tsx", import.meta.url),
  "utf8",
);
assert.ok(!source.includes("ThumbsUpIcon"));
assert.ok(!source.includes("ThumbsDownIcon"));
assert.ok(!source.includes("TID_V4_FEEDBACK_LIKE"));
assert.ok(!source.includes("TID_V4_FEEDBACK_DISLIKE"));
assert.ok(source.includes("<CopyRowAction"));
assert.ok(source.includes("onFeedbackChange?: AssistantFeedbackHandler"));
console.log("Message actions source check passed.");
