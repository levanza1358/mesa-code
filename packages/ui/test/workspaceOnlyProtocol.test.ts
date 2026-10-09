// Workspace only 是叠加在权限模式之上的边界开关；这里锁定协议面契约，
// 防止后续演进时把 workspaceOnly 从任一命令载荷里丢掉。
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  commandPayloadSchemas,
  conversationInputIntentSchema,
  sessionConfigStateSchema,
} from "@mesa-code/shared/mesa-code-protocol-v4";
import { resolveExecutionState } from "@mesa-code/shared";

test("resolveExecutionState carries workspaceOnly and defaults it to false", () => {
  assert.equal(resolveExecutionState({ mode: "build", planEnabled: false }).workspaceOnly, false);
  assert.equal(
    resolveExecutionState({ mode: "yolo", workspaceOnly: true }).workspaceOnly,
    true,
  );
  // 未显式给出时沿用 current，而不是把已有约束悄悄关掉。
  assert.equal(
    resolveExecutionState(
      { mode: "edit" },
      { mode: "yolo", planEnabled: false, workspaceOnly: true },
    ).workspaceOnly,
    true,
  );
});

test("workspaceOnly is orthogonal to planEnabled", () => {
  const state = resolveExecutionState({ mode: "build", planEnabled: true, workspaceOnly: true });
  assert.equal(state.planEnabled, true);
  assert.equal(state.workspaceOnly, true);
});

test("createSession and firstInput accept workspaceOnly", () => {
  const parsed = commandPayloadSchemas.createSession.parse({
    workspaceId: "ws",
    config: { mode: "yolo", workspaceOnly: true },
    firstInput: { text: "hi", mode: "yolo", workspaceOnly: true },
  });
  assert.equal(parsed.config?.workspaceOnly, true);
  assert.equal(parsed.firstInput?.workspaceOnly, true);
});

test("sendText and sendGoalCommand accept workspaceOnly", () => {
  assert.equal(
    commandPayloadSchemas.sendText.parse({ text: "hi", workspaceOnly: true }).workspaceOnly,
    true,
  );
  assert.equal(
    commandPayloadSchemas.sendGoalCommand.parse({ text: "goal", workspaceOnly: true })
      .workspaceOnly,
    true,
  );
});

test("conversationInputIntent round-trips workspaceOnly", () => {
  const intent = conversationInputIntentSchema.parse({
    sourceCommandId: "c1",
    queueItemId: "q1",
    clientId: "cli",
    kind: "sendText",
    text: "hi",
    workspaceOnly: true,
    delivery: { requested: "auto", admitted: "startNow" },
    order: { admissionSeq: 1 },
    steer: { state: "notRequested" },
    dispatch: { state: "admitted" },
    admittedAt: 1,
  });
  assert.equal(intent.workspaceOnly, true);
});

test("SessionConfigState keeps workspaceOnly optional for old snapshots", () => {
  const legacy = sessionConfigStateSchema.parse({
    provider: "",
    model: "",
    thought: "",
    followupMode: "queue",
  });
  assert.equal(legacy.workspaceOnly, undefined);
  assert.equal(
    sessionConfigStateSchema.parse({
      provider: "",
      model: "",
      thought: "",
      followupMode: "queue",
      workspaceOnly: true,
    }).workspaceOnly,
    true,
  );
});
