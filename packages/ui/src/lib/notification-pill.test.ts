import assert from "node:assert/strict";
import test from "node:test";
import type { NotificationPillPresentation } from "@mesa-code/shared";
import type { PendingInteraction } from "@mesa-code/shared/mesa-code-protocol-v4";
import {
  isCurrentNotificationPillAnswer,
  notificationPillOptions,
  notificationPillPreview,
} from "./notification-pill.js";
const pending = {
  interactionId: "request",
  kind: "permission",
  anchorRowId: null,
  createdAt: 1,
  payload: {
    kind: "permission",
    toolCallId: "call",
    toolName: "Read",
    summary: "Read file?",
    detail: null,
    options: [
      { optionId: "provider-once", label: "Allow once", kind: "allowOnce" },
      { optionId: "provider-no", label: "Deny", kind: "deny" },
      { optionId: "provider-always", label: "Always", kind: "allowAlways" },
    ],
  },
} as PendingInteraction;
const value: NotificationPillPresentation = {
  token: "opaque",
  context: {
    taskId: "session",
    requestId: "request",
    workspacePath: "C:/fixture",
    workspaceIdentity: "remote-key",
    remoteSessionId: "remote-session",
    logEpoch: "epoch",
    revision: 3,
  },
  kind: "permission",
  title: "Permission",
  body: "Read file?",
  preview: "",
  openLabel: "Open app",
  error: "",
  busy: false,
  options: notificationPillOptions(pending),
  appearance: { background: "", foreground: "", border: "", accent: "", fontSize: "" },
};
test("preview is answer text, whitespace normalized and bounded to 120", () => {
  assert.equal(notificationPillPreview("  Answer\n content  "), "Answer content");
  assert.equal(notificationPillPreview("x".repeat(200)).length, 120);
  assert.ok(notificationPillPreview("😀".repeat(100)).length <= 120);
  assert.equal(notificationPillPreview(), "");
});
test("safe options retain original IDs; rich detail, free text and ambiguous options require Open", () => {
  assert.deepEqual(
    value.options.map((option) => option.optionId),
    ["provider-once", "provider-no"],
  );
  if (pending.payload.kind !== "permission") throw Error("fixture");
  for (const patch of [
    { detail: { diff: "review" } },
    { freeText: true },
    { summary: "x".repeat(513) },
    { options: [pending.payload.options[0]] },
  ]) {
    assert.deepEqual(
      notificationPillOptions({ ...pending, payload: { ...pending.payload, ...patch } }),
      [],
    );
  }
});
test("exact live identity, remote attachment, epoch, revision, request and option required", () => {
  const action = {
    token: "opaque",
    action: "answer" as const,
    optionId: "provider-once",
    context: value.context,
  };
  assert.equal(isCurrentNotificationPillAnswer(action, value), true);
  for (const patch of [
    { taskId: "other" },
    { requestId: "other" },
    { workspaceIdentity: "other" },
    { workspacePath: "elsewhere" },
    { remoteSessionId: "other" },
    { logEpoch: "old" },
    { revision: 2 },
  ]) {
    assert.equal(
      isCurrentNotificationPillAnswer(
        { ...action, context: { ...action.context, ...patch } },
        value,
      ),
      false,
    );
  }
  assert.equal(isCurrentNotificationPillAnswer({ ...action, token: "stale" }, value), false);
  assert.equal(
    isCurrentNotificationPillAnswer({ ...action, optionId: "provider-always" }, value),
    false,
  );
  assert.equal(
    isCurrentNotificationPillAnswer(action, null),
    false,
    "resolved elsewhere/pref off/unmounted",
  );
  assert.equal(isCurrentNotificationPillAnswer(action, { ...value, busy: true }), false);
});
