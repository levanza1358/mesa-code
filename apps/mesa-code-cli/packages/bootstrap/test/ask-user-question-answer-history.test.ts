// Regression: the AskUserQuestion card used to render "No answer provided" after a submit.
// The runtime carries the accepted answers in PermissionResolvedPayload.modifiedInput, but
// ProductProjection dropped it, so the tool row kept the pre-answer input and the renderer
// read no answers. These cases fail if the projection stops merging that field back.
import assert from "node:assert/strict";
import test from "node:test";
import type { SessionEvent } from "@mesa-code/contracts";
import { SessionEventType } from "@mesa-code/contracts";
import { ProductProjection } from "../src/mesa-code-protocol-v4/product-projection.js";

const SESSION_ID = "session-ask-history";
const TURN_ID = "turn-1";

function baseEvent(type: string, payload: unknown): SessionEvent {
  return {
    id: `event-${type}` as SessionEvent["id"],
    sessionId: SESSION_ID as SessionEvent["sessionId"],
    turnId: TURN_ID as SessionEvent["turnId"],
    type: type as SessionEvent["type"],
    timestamp: new Date(1_700_000_000_000),
    traceId: "trace-ask-history" as SessionEvent["traceId"],
    sequenceNumber: 1,
    payload,
  };
}

const QUESTIONS = [
  {
    question: "Which library should we use for date formatting?",
    header: "Library",
    options: [
      { label: "date-fns", description: "Functional helpers." },
      { label: "dayjs", description: "Small and familiar." },
    ],
    multiSelect: false,
  },
];

/** Drive a live turn up to a pending AskUserQuestion tool row. */
function projectPendingAskUserQuestion(): ProductProjection {
  const projection = new ProductProjection(SESSION_ID, "epoch-1");
  projection.applyEvent(
    baseEvent(SessionEventType.TurnStarted, {
      turnNumber: 1,
      input: "Ask me something",
      messageId: "msg-1",
      executionKind: "agent",
    }),
  );
  projection.applyEvent(
    baseEvent(SessionEventType.ToolCallScheduled, {
      toolCallId: "tool-1",
      assistantMessageId: "msg-2",
      toolName: "AskUserQuestion",
      input: { questions: QUESTIONS },
      schedule: { parallelGroups: [["tool-1"]], executionOrder: ["tool-1"] },
    }),
  );
  projection.applyEvent(
    baseEvent(SessionEventType.PermissionRequested, {
      requestId: "req-1",
      toolCallId: "tool-1",
      toolName: "AskUserQuestion",
      riskLevel: "low",
      reason: "Answer the clarifying questions",
      input: { questions: QUESTIONS },
      suggestedPermissionUpdates: [],
    }),
  );
  return projection;
}

function findToolRow(projection: ProductProjection) {
  return projection.getSnapshot().rows.window.find((row) => row.kind === "toolCall");
}

test("a submitted answer map is projected into the AskUserQuestion tool row", () => {
  const projection = projectPendingAskUserQuestion();
  projection.applyEvent(
    baseEvent(SessionEventType.PermissionResolved, {
      requestId: "req-1",
      toolCallId: "tool-1",
      decision: "modify",
      modifiedInput: {
        questions: QUESTIONS,
        answers: { "Which library should we use for date formatting?": "date-fns" },
      },
    }),
  );

  const row = findToolRow(projection);
  assert.ok(row && row.kind === "toolCall");
  const input = row.input as {
    questions?: unknown;
    answers?: Record<string, string>;
  };
  assert.deepEqual(input.answers, {
    "Which library should we use for date formatting?": "date-fns",
  });
  // Questions survive the merge so the card can still render the prompt list.
  assert.deepEqual(input.questions, QUESTIONS);
  assert.match(row.inputText, /date-fns/);
});

test("a partial answer map keeps only the submitted answers", () => {
  const projection = projectPendingAskUserQuestion();
  projection.applyEvent(
    baseEvent(SessionEventType.PermissionResolved, {
      requestId: "req-1",
      toolCallId: "tool-1",
      decision: "modify",
      modifiedInput: { questions: QUESTIONS, answers: {} },
    }),
  );

  const row = findToolRow(projection);
  assert.ok(row && row.kind === "toolCall");
  assert.deepEqual((row.input as { answers?: unknown }).answers, {});
});

test("a denied resolution does not attach answers", () => {
  const projection = projectPendingAskUserQuestion();
  projection.applyEvent(
    baseEvent(SessionEventType.PermissionResolved, {
      requestId: "req-1",
      toolCallId: "tool-1",
      decision: "deny",
      modifiedInput: { answers: { "Which library should we use for date formatting?": "dayjs" } },
    }),
  );

  const row = findToolRow(projection);
  assert.ok(row && row.kind === "toolCall");
  assert.deepEqual(row.input, { questions: QUESTIONS });
});

test("a resolution without answers keeps the existing input", () => {
  const projection = projectPendingAskUserQuestion();
  projection.applyEvent(
    baseEvent(SessionEventType.PermissionResolved, {
      requestId: "req-1",
      toolCallId: "tool-1",
      decision: "allow",
      modifiedInput: { questions: QUESTIONS },
    }),
  );

  const row = findToolRow(projection);
  assert.ok(row && row.kind === "toolCall");
  assert.deepEqual(row.input, { questions: QUESTIONS });
});
