import assert from "node:assert/strict";
import test from "node:test";
import type {
  ConversationRow,
  ConversationSnapshot,
  SessionPhase,
} from "@mesa-code/shared/mesa-code-protocol-v4";
import {
  buildConversationTurnRenderUnits,
  buildConversationTurnRenderUnitsUncached,
  type ConversationTurnRenderUnitsCache,
} from "../src/v4/conversationTurnRenderUnits.js";
import { buildConversationFindIndex } from "../src/v4/conversationFindIndex.js";
import {
  composerSnapshotsEqual,
  projectConversationComposerSnapshot,
} from "../src/v4/conversation-composer-snapshot.js";

function text(rowId: number, turnId: string, state = "complete"): ConversationRow {
  return {
    kind: "assistantText",
    rowId,
    turnId,
    text: "Generated response",
    state,
    createdAt: rowId,
    createdAtSeq: rowId,
  } as ConversationRow;
}

function reasoning(rowId: number, turnId: string, content: string): ConversationRow {
  return {
    kind: "reasoning",
    rowId,
    turnId,
    text: content,
    state: "complete",
    createdAt: rowId,
    createdAtSeq: rowId,
  } as ConversationRow;
}

test("cached derivation agrees with uncached transitions and evicts removed turns", () => {
  const cache: ConversationTurnRenderUnitsCache = new Map();
  let rows = [text(1, "history"), text(2, "live", "streaming")];
  const check = (phase?: SessionPhase, nowMs = 1000) => {
    const options = { sessionPhase: phase, nowMs };
    assert.deepEqual(
      buildConversationTurnRenderUnits(rows, options, cache),
      buildConversationTurnRenderUnitsUncached(rows, options).units,
    );
  };
  check("running");
  rows = [rows[0]!, { ...rows[1]!, text: "Updated response" } as ConversationRow];
  check("running");
  check("running", 2000);
  rows = [text(0, "older"), ...rows];
  check("running");
  rows.push(reasoning(3, "hidden", " "));
  check("running");
  rows.push(text(4, "next", "streaming"));
  check("running");
  rows = rows.map((row) => (row.kind === "assistantText" ? { ...row, state: "complete" } : row));
  check("completedSuccess");
  check("completedInterrupted");
  check("error");
  rows = rows.filter((row) => row.turnId !== "history");
  check("error");
  assert.equal(cache.has("history"), false);
  rows = [];
  check("completedSuccess");
  assert.equal(cache.size, 0);
});

test("cached derivation preserves header, tool, guide and work-segment transitions", () => {
  const cache: ConversationTurnRenderUnitsCache = new Map();
  let rows: ConversationRow[] = [
    {
      kind: "turnHeader",
      rowId: 1,
      turnId: "live",
      entityId: "header",
      origin: "userInput",
      state: "running",
      startedAt: 100,
      createdAt: 100,
      createdAtSeq: 1,
    },
    {
      kind: "userInput",
      rowId: 2,
      turnId: "live",
      entityId: "input",
      origin: "realUser",
      text: "Generated prompt",
      createdAt: 100,
      createdAtSeq: 2,
    },
    {
      kind: "toolCall",
      rowId: 3,
      turnId: "live",
      entityId: "tool",
      toolCallId: "tool",
      toolName: "Read",
      status: "inputStreaming",
      inputText: "{",
      createdAt: 101,
      createdAtSeq: 3,
    },
  ] as ConversationRow[];
  const check = (nowMs: number, sessionPhase: SessionPhase = "running") => {
    const options = { nowMs, sessionPhase };
    assert.deepEqual(
      buildConversationTurnRenderUnits(rows, options, cache),
      buildConversationTurnRenderUnitsUncached(rows, options).units,
    );
  };
  check(200);
  for (const status of ["pendingApproval", "running", "success", "error", "cancelled"] as const) {
    rows = rows.map((row) =>
      row.kind === "toolCall"
        ? {
            ...row,
            status,
            inputText: '{"path":"generated.txt"}',
            startedAt: 110,
            endedAt: status === "success" ? 150 : undefined,
          }
        : row,
    );
    check(250);
  }
  rows.push({
    kind: "userInput",
    rowId: 4,
    turnId: "live",
    entityId: "guide",
    origin: "realUser",
    guided: true,
    text: "Generated guide",
    createdAt: 300,
    createdAtSeq: 4,
  } as ConversationRow);
  rows = rows.map((row) =>
    row.kind === "turnHeader"
      ? {
          ...row,
          workSegments: [
            { segmentId: "initial", startedAt: 100, endedAt: 200, activeMs: 100 },
            { segmentId: "guide", triggerEntityId: "guide", startedAt: 300 },
          ],
        }
      : row,
  );
  rows.push(text(5, "live", "streaming"));
  check(500);
  check(700);
  rows = rows.map((row) =>
    row.kind === "turnHeader"
      ? { ...row, state: "completedInterrupted", endedAt: 700, activeMs: 400 }
      : row.kind === "assistantText"
        ? { ...row, state: "interrupted" }
        : row,
  );
  check(800, "completedInterrupted");
  rows = [text(0, "paged"), ...rows, text(6, "next", "streaming")];
  check(900);
});

test("unchanged historical turns skip materialization", () => {
  let reads = 0;
  const history = reasoning(1, "history", "work");
  Object.defineProperty(history, "text", {
    get: () => {
      reads += 1;
      return "work";
    },
  });
  const cache: ConversationTurnRenderUnitsCache = new Map();
  buildConversationTurnRenderUnits([history, text(2, "live", "streaming")], { nowMs: 1000 }, cache);
  assert.ok(reads > 0);
  reads = 0;
  buildConversationTurnRenderUnits([history, text(2, "live", "streaming")], { nowMs: 2000 }, cache);
  assert.equal(reads, 0, "History text must not be inspected by materialization again");
});

test("empty find counts rows without accessing or projecting response text", () => {
  const units = buildConversationTurnRenderUnits([text(1, "live", "streaming")]);
  Object.defineProperty(units[0]!.assistantTextRows[0]!, "text", {
    get: () => {
      throw new Error("Empty find read text");
    },
  });
  assert.deepEqual(buildConversationFindIndex(units, " ", { projectAssistantCodeComments: true }), {
    query: "",
    matches: [],
    matchCount: 0,
    loadedRowCount: 1,
  });
});

test("nonempty find still locates response matches", () => {
  const units = buildConversationTurnRenderUnits([text(1, "complete")]);
  const found = buildConversationFindIndex(units, "response");
  assert.equal(found.matchCount, 1);
  assert.equal(found.loadedRowCount, 1);
  assert.equal(found.matches[0]!.sourceText, "Generated response");
});

test("composer projection ignores text updates but tracks all consumed fields", () => {
  const snapshot = {
    inputRouting: { mode: "startNow" },
    control: { phase: "running", canStop: true },
    config: {},
    usage: {},
    queue: { items: [] },
    backgroundWorks: [],
    sharedContextImport: null,
    rows: { totalCount: 1, window: [text(1, "live", "streaming")] },
  } as unknown as ConversationSnapshot;
  const original = projectConversationComposerSnapshot(snapshot);
  const changedText = { ...snapshot, rows: { ...snapshot.rows, window: [text(1, "live")] } };
  assert.equal(
    composerSnapshotsEqual(original, projectConversationComposerSnapshot(changedText)),
    true,
  );
  for (const field of [
    "inputRouting",
    "control",
    "config",
    "usage",
    "queue",
    "backgroundWorks",
    "sharedContextImport",
  ] as const) {
    const changed = {
      ...snapshot,
      [field]: field === "backgroundWorks" ? [{}] : {},
    } as ConversationSnapshot;
    assert.equal(
      composerSnapshotsEqual(original, projectConversationComposerSnapshot(changed)),
      false,
      field,
    );
  }
  assert.equal(
    composerSnapshotsEqual(
      original,
      projectConversationComposerSnapshot({
        ...snapshot,
        rows: { ...snapshot.rows, totalCount: 2 },
      }),
    ),
    false,
  );
  assert.equal(composerSnapshotsEqual(original, null), false);
  assert.equal(composerSnapshotsEqual(null, null), true);
});
