// Covers docs/specs/notification-settings.md rule 8: a subagent row reaching a non-success terminal
// state raises exactly one subagent-stall notification, and only for rows not yet seen.
import assert from "node:assert/strict";
import { test } from "node:test";
import type { ConversationSnapshot, SubagentRow } from "@mesa-code/shared/mesa-code-protocol-v4";
import { collectSubagentStalledNotificationPayloads } from "../src/lib/taskNotificationOrchestrator.js";

const formatMessage = ((descriptor: { id: string }, values?: Record<string, unknown>) =>
  values ? `${descriptor.id}:${JSON.stringify(values)}` : descriptor.id) as never;

function subagentRow(overrides: Partial<SubagentRow>): SubagentRow {
  return {
    rowId: 1,
    turnId: "turn-1",
    createdAt: "2026-10-11T00:00:00.000Z",
    createdAtSeq: 1,
    kind: "subagent",
    subagentType: "explore",
    status: "running",
    summaryText: "",
    ...overrides,
  } as SubagentRow;
}

function snapshotWith(rows: SubagentRow[]): ConversationSnapshot {
  return {
    sessionId: "session-1",
    rows: { window: rows, totalCount: rows.length, firstRowId: rows[0]?.rowId ?? null },
  } as unknown as ConversationSnapshot;
}

test("a failed subagent row raises one stall notification", () => {
  const payloads = collectSubagentStalledNotificationPayloads({
    snapshot: snapshotWith([subagentRow({ rowId: 7, status: "failed", summaryText: "explore agent" })]),
    previouslySeenRowIds: new Set(),
    formatMessage,
  });
  assert.equal(payloads.length, 1);
  assert.equal(payloads[0]?.status, "subagent_stalled");
  assert.equal(payloads[0]?.taskId, "session-1");
  assert.equal(payloads[0]?.requestId, "7");
  assert.equal(payloads[0]?.title, "notification.subagentStalled");
  assert.equal(
    payloads[0]?.body,
    `notification.subagentStalledBody:${JSON.stringify({ title: "explore agent" })}`,
  );
});

test("a cancelled subagent row also raises a stall notification", () => {
  const payloads = collectSubagentStalledNotificationPayloads({
    snapshot: snapshotWith([subagentRow({ rowId: 3, status: "cancelled" })]),
    previouslySeenRowIds: new Set(),
    formatMessage,
  });
  assert.equal(payloads.length, 1);
  // Falls back to the subagent type when there is no summary text.
  assert.equal(payloads[0]?.body, `notification.subagentStalledBody:${JSON.stringify({ title: "explore" })}`);
});

test("running and successful rows never notify", () => {
  const payloads = collectSubagentStalledNotificationPayloads({
    snapshot: snapshotWith([
      subagentRow({ rowId: 1, status: "running" }),
      subagentRow({ rowId: 2, status: "success" }),
    ]),
    previouslySeenRowIds: new Set(),
    formatMessage,
  });
  assert.deepEqual(payloads, []);
});

test("an already-seen stalled row is not notified again", () => {
  const payloads = collectSubagentStalledNotificationPayloads({
    snapshot: snapshotWith([subagentRow({ rowId: 9, status: "failed" })]),
    previouslySeenRowIds: new Set([9]),
    formatMessage,
  });
  assert.deepEqual(payloads, []);
});
