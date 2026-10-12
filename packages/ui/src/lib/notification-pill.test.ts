import assert from "node:assert/strict";
import test from "node:test";
import type { NotificationPillAnswerPrompt, NotificationPillPresentation } from "@mesa-code/shared";
import type { PendingInteraction } from "@mesa-code/shared/mesa-code-protocol-v4";
import {
  isCurrentNotificationPillAnswer,
  isCurrentNotificationPillUserInputAnswer,
  notificationPillAnswerPrompt,
  notificationPillOptions,
  notificationPillPreview,
  notificationPillUserInputContent,
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
test("safe options retain original IDs; rich display, truncation and ambiguous options require Open", () => {
  assert.deepEqual(
    value.options.map((option) => option.optionId),
    ["provider-once", "provider-no"],
  );
  if (pending.payload.kind !== "permission") throw Error("fixture");
  // detail (the tool input) and freeText (optional deny feedback) do not make a pill answer unsafe:
  // the pill submits the option's own decision and never forwards edited input or feedback.
  for (const patch of [
    { detail: { diff: "review" } },
    { freeText: true },
    { detail: "raw input" },
  ]) {
    assert.deepEqual(
      notificationPillOptions({ ...pending, payload: { ...pending.payload, ...patch } }).map(
        (option) => option.optionId,
      ),
      ["provider-once", "provider-no"],
    );
  }
  // A rich display preview (structured content the single-line pill cannot render) stays Open only.
  const withDisplay: PendingInteraction = {
    ...pending,
    payload: {
      ...pending.payload,
      display: { kind: "respond_to_coordinator", status: "success" },
    },
  };
  assert.deepEqual(notificationPillOptions(withDisplay), []);
  for (const patch of [
    { summary: "" },
    { summary: "   " },
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

const userInputPending = {
  interactionId: "question",
  kind: "userInput",
  anchorRowId: null,
  createdAt: 1,
  payload: {
    kind: "userInput",
    prompt: "Which library?",
    freeText: true,
    questions: [
      {
        question: "Which library should we use?",
        header: "Library",
        options: [
          { value: "a", label: "Option A" },
          { value: "b", label: "Option B" },
        ],
      },
    ],
  },
} as PendingInteraction;
const questionValue: NotificationPillPresentation = {
  token: "opaque",
  context: {
    taskId: "session",
    requestId: "question",
    workspacePath: "C:/fixture",
    workspaceIdentity: "remote-key",
    remoteSessionId: "remote-session",
    logEpoch: "epoch",
    revision: 3,
  },
  kind: "permission",
  title: "Your response is needed",
  body: "Which library?",
  preview: "",
  openLabel: "Open app",
  error: "",
  busy: false,
  options: [],
  answerPrompt: notificationPillAnswerPrompt(userInputPending, { showLabel: "Show answer", submitLabel: "Submit answer" }),
  appearance: { background: "", foreground: "", border: "", accent: "", fontSize: "" },
};
function questionWithOptions(count: number) {
  return {
    question: "Which library should we use?",
    header: "Library",
    options: Array.from({ length: count }, (_, index) => ({
      value: `v${index}`,
      label: `Option ${index}`,
    })),
  };
}
test("answer prompt is built for fixed-option userInput; rich preview or out-of-bounds stays Open", () => {
  assert.deepEqual(notificationPillAnswerPrompt(userInputPending, { showLabel: "Show answer", submitLabel: "Submit answer" }), {
    showLabel: "Show answer",
    submitLabel: "Submit answer",
    questions: [
      {
        question: "Which library should we use?",
        header: "Library",
        multiSelect: false,
        options: [
          { value: "a", label: "Option A" },
          { value: "b", label: "Option B" },
        ],
      },
    ],
  });
  if (userInputPending.payload.kind !== "userInput") throw Error("fixture");
  const questions = userInputPending.payload.questions!;
  for (const patch of [
    { questions: [{ ...questions[0], options: [{ value: "a", label: "A", preview: "rich" }] }] },
    {
      questions: [
        questionWithOptions(1),
      ],
    },
    { questions: [questionWithOptions(5)] },
    { questions: [questionWithOptions(0)] },
    { questions: Array.from({ length: 5 }, () => questions[0]) },
  ]) {
    assert.equal(
      notificationPillAnswerPrompt(
        { ...userInputPending, payload: { ...userInputPending.payload, ...patch } },
        { showLabel: "Show answer", submitLabel: "Submit answer" },
      ),
      undefined,
    );
  }
});
test("userInput answer validates live question/value pairs and never accepts a forged answer", () => {
  const action = {
    token: "opaque",
    action: "answer" as const,
    answers: [{ question: "Which library should we use?", values: ["a"] }],
    context: questionValue.context,
  };
  assert.equal(isCurrentNotificationPillUserInputAnswer(action, questionValue), true);
  assert.equal(
    isCurrentNotificationPillUserInputAnswer(
      { ...action, answers: [{ question: "Which library should we use?", values: ["z"] }] },
      questionValue,
    ),
    false,
    "value must be a fixed option",
  );
  assert.equal(
    isCurrentNotificationPillUserInputAnswer(
      { ...action, answers: [{ question: "Unknown?", values: ["a"] }] },
      questionValue,
    ),
    false,
    "question must be live",
  );
  assert.equal(
    isCurrentNotificationPillUserInputAnswer({ ...action, answers: undefined }, questionValue),
    false,
  );
  const multiSelectValue: NotificationPillPresentation = {
    ...questionValue,
    answerPrompt: {
      showLabel: "Show answer",
      submitLabel: "Submit answer",
      questions: [
        {
          question: "Which features?",
          header: "Features",
          multiSelect: true,
          options: [
            { value: "a", label: "A" },
            { value: "b", label: "B" },
          ],
        },
      ],
    },
  };
  assert.equal(
    isCurrentNotificationPillUserInputAnswer(
      { ...action, answers: [{ question: "Which features?", values: ["a", "b"] }] },
      multiSelectValue,
    ),
    true,
  );
  assert.equal(
    isCurrentNotificationPillUserInputAnswer(
      { ...action, answers: [{ question: "Which features?", values: ["a", "a"] }] },
      multiSelectValue,
    ),
    false,
    "duplicate values are rejected",
  );
  const singleSelect: NotificationPillPresentation = {
    ...multiSelectValue,
    answerPrompt: {
      showLabel: "Show answer",
      submitLabel: "Submit answer",
      questions: [{ ...multiSelectValue.answerPrompt!.questions[0], multiSelect: false }],
    },
  };
  assert.equal(
    isCurrentNotificationPillUserInputAnswer(
      { ...action, answers: [{ question: "Which features?", values: ["a", "b"] }] },
      singleSelect,
    ),
    false,
    "single-select rejects more than one value",
  );
  assert.equal(
    isCurrentNotificationPillUserInputAnswer(action, { ...questionValue, busy: true }),
    false,
  );
  assert.equal(
    isCurrentNotificationPillUserInputAnswer(
      { ...action, context: { ...action.context, revision: 2 } },
      questionValue,
    ),
    false,
  );
});
test("selections project to the same resolveInteraction content the dialog builds", () => {
  const single = questionValue.answerPrompt!;
  assert.deepEqual(notificationPillUserInputContent(single, [{ question: "Which library should we use?", values: ["a"] }]), {
    answers: { "Which library should we use?": "a" },
    answer_0: "a",
    answer: "a",
  });
  const multi: NotificationPillAnswerPrompt = {
    showLabel: "Show answer",
    submitLabel: "Submit answer",
    questions: [
      { ...single.questions[0], multiSelect: true },
      {
        question: "Second question?",
        header: "Second",
        multiSelect: false,
        options: [
          { value: "x", label: "X" },
          { value: "y", label: "Y" },
        ],
      },
    ],
  };
  // Multi-question: no legacy `answer`; a single-select question stores its first value under its
  // index while the answers map always joins with ", ".
  assert.deepEqual(
    notificationPillUserInputContent(multi, [
      { question: "Which library should we use?", values: ["a", "b"] },
      { question: "Second question?", values: ["x"] },
    ]),
    {
      answers: { "Which library should we use?": "a, b", "Second question?": "x" },
      answer_0: ["a", "b"],
      answer_1: "x",
    },
  );
  // An unanswered multi-question set omits that question from every projection.
  assert.deepEqual(
    notificationPillUserInputContent(multi, [{ question: "Which library should we use?", values: ["a"] }]),
    { answers: { "Which library should we use?": "a" }, answer_0: ["a"] },
  );
});
