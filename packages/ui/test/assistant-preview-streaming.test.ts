import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { AssistantTextRow } from "@mesa-code/shared/mesa-code-protocol-v4";
import { useAssistantPreviewCardsForAssistantTextRow } from "../src/v4/useAssistantPreviewCardsForRow.js";

function previewCount(row: AssistantTextRow, latest = row): number {
  let count = -1;
  function Probe() {
    count = useAssistantPreviewCardsForAssistantTextRow({
      row,
      latestAssistantTextRow: latest,
      assistantTextRows: [row],
      workspacePath: "synthetic-workspace",
      fileChangesTarget: null,
    }).length;
    return null;
  }
  renderToStaticMarkup(createElement(Probe));
  return count;
}

test("ineligible streaming or historical preview rows never read response text", () => {
  const row = {
    kind: "assistantText",
    rowId: 1,
    turnId: "synthetic",
    state: "streaming",
    get text(): string {
      throw new Error("Ineligible preview must not join text");
    },
  } as AssistantTextRow;
  assert.equal(previewCount(row), 0);
  const complete = Object.create(row) as AssistantTextRow;
  Object.defineProperty(complete, "state", { value: "complete" });
  assert.equal(
    previewCount(complete, {
      kind: "assistantText",
      text: "",
      rowId: 2,
      state: "complete",
    } as AssistantTextRow),
    0,
  );
});

test("complete and interrupted latest responses still produce preview cards", () => {
  for (const state of ["complete", "interrupted"] as const) {
    let reads = 0;
    const row = {
      kind: "assistantText",
      rowId: 1,
      turnId: "synthetic",
      state,
      get text() {
        reads++;
        return "[Generated preview](http://127.0.0.1:4321/)";
      },
    } as AssistantTextRow;
    assert.equal(previewCount(row), 1);
    assert.equal(reads, 1);
  }
});
