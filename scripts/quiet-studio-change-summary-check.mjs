import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("packages/ui/src/v4/ConversationFileSummaryPanel.tsx", "utf8");
for (const kind of ["added", "removed"]) {
  assert.equal((source.match(new RegExp(`bg-diff-${kind} px-1.5 py-0.5 text-diff-${kind}-foreground`, "g")) ?? []).length, 2);
  assert.ok(!source.includes(`className="text-diff-${kind}"`));
}
assert.ok(source.includes("onClick={handlePreviewRewind}"));
assert.ok(source.includes("openDiff(item, context)"));
console.log("Change summary badge checks passed.");
