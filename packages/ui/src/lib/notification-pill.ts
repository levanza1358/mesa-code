import type {
  NotificationPillActionReply,
  NotificationPillAnswerPrompt,
  NotificationPillPresentation,
} from "@mesa-code/shared";
import type { PendingInteraction } from "@mesa-code/shared/mesa-code-protocol-v4";

const PILL_ANSWER_MAX_QUESTIONS = 4;
const PILL_ANSWER_MAX_OPTIONS = 4;

export function notificationPillPreview(preview?: string): string {
  const text = (preview ?? "").replace(/\s+/g, " ").trim();
  const bounded = text.slice(0, 120);
  return /[\uD800-\uDBFF]$/.test(bounded) ? bounded.slice(0, -1) : bounded;
}

export function notificationPillOptions(
  interaction: PendingInteraction,
): NotificationPillPresentation["options"] {
  const payload = interaction.payload;
  // A pill answer submits the option's own decision (allow once / deny). It never forwards edited
  // tool input and never carries free-text feedback, so a permission that has `detail` (the tool
  // input) or `freeText` (optional deny feedback) is still safe to answer from the pill: the
  // decision does not depend on the unreviewed payload, and the full review stays one Open app away.
  // Only content the pill cannot honestly present stays Open only — a rich display preview, an
  // empty summary, or a summary so long the single-line pill body would drop text below its length.
  if (
    payload.kind !== "permission" ||
    payload.display ||
    payload.summary.length > 512 ||
    !payload.summary.trim()
  )
    return [];
  const options = payload.options.filter(
    (option) => option.kind === "allowOnce" || option.kind === "deny",
  );
  if (
    options.length !== 2 ||
    new Set(options.map((option) => option.kind)).size !== 2 ||
    new Set(options.map((option) => option.optionId)).size !== 2 ||
    options.some(
      (option) =>
        !option.optionId ||
        option.optionId.length > 256 ||
        option.response?.modifiedInput !== undefined ||
        Boolean(option.response?.permissionUpdates?.length),
    )
  )
    return [];
  return options.map((option) => ({
    optionId: option.optionId,
    label: option.label.slice(0, 512),
    kind: option.kind as "allowOnce" | "deny",
  }));
}

/**
 * Builds the answer surface for a userInput (AskUserQuestion) pill. The answer panel renders fixed
 * options only — it never collects the dialog's free-text "Other" answer, and a request it cannot
 * honestly present (a rich option preview, a multi-question set beyond the panel bound, or an
 * option count outside two to four) stays Open-only, so the renderer gets `undefined`.
 */
export function notificationPillAnswerPrompt(
  interaction: PendingInteraction,
  labels: { showLabel: string; submitLabel: string },
): NotificationPillAnswerPrompt | undefined {
  const payload = interaction.payload;
  if (payload.kind !== "userInput") return undefined;
  const questions = payload.questions;
  if (!questions || questions.length === 0 || questions.length > PILL_ANSWER_MAX_QUESTIONS)
    return undefined;
  const bounded: NotificationPillAnswerPrompt["questions"] = [];
  for (const question of questions) {
    if (!question.question.trim() || question.options.length < 2) return undefined;
    if (question.options.length > PILL_ANSWER_MAX_OPTIONS) return undefined;
    // A rich preview needs the full review UI; the panel shows plain option labels only.
    if (question.options.some((option) => option.preview !== undefined)) return undefined;
    bounded.push({
      question: question.question.slice(0, 512),
      header: (question.header ?? "").slice(0, 64),
      multiSelect: question.multiSelect === true,
      options: question.options.map((option) => ({
        value: option.value.slice(0, 256),
        label: option.label.slice(0, 512),
      })),
    });
  }
  return {
    showLabel: labels.showLabel.slice(0, 64),
    submitLabel: labels.submitLabel.slice(0, 64),
    questions: bounded,
  };
}

export function isCurrentNotificationPillAnswer(
  action: NotificationPillActionReply,
  presentation: NotificationPillPresentation | null,
): boolean {
  if (
    !presentation ||
    presentation.busy ||
    presentation.kind !== "permission" ||
    action.action !== "answer" ||
    action.token !== presentation.token
  )
    return false;
  const a = action.context;
  const b = presentation.context;
  return (
    sameNotificationPillContext(a, b) &&
    presentation.options.some((option) => option.optionId === action.optionId)
  );
}

/**
 * Validates a userInput answer submitted from the pill's answer panel against the live presentation.
 * Every selection must name a live question and pick only values that are that question's fixed
 * options, so the panel can never forge a free-text answer or answer a request it does not own.
 */
export function isCurrentNotificationPillUserInputAnswer(
  action: NotificationPillActionReply,
  presentation: NotificationPillPresentation | null,
): boolean {
  if (
    !presentation ||
    presentation.busy ||
    presentation.kind !== "permission" ||
    action.action !== "answer" ||
    action.token !== presentation.token
  )
    return false;
  const prompt = presentation.answerPrompt;
  if (!prompt || !action.answers || action.answers.length === 0) return false;
  if (!sameNotificationPillContext(action.context, presentation.context)) return false;
  return action.answers.every((selection) => {
    const question = prompt.questions.find((candidate) => candidate.question === selection.question);
    if (!question || selection.values.length === 0) return false;
    if (!question.multiSelect && selection.values.length !== 1) return false;
    const allowed = new Set(question.options.map((option) => option.value));
    return (
      new Set(selection.values).size === selection.values.length &&
      selection.values.every((value) => allowed.has(value))
    );
  });
}

/**
 * Projects the validated selections into the same `resolveInteraction` content shape the in-app
 * dialog builds (ElicitationDialog `buildElicitationResponseContent`): an `answers` map plus the
 * indexed and legacy single-question keys, so an agent cannot tell which surface answered. The
 * panel collects fixed options only, so there is never a custom free-text answer to merge in.
 */
export function notificationPillUserInputContent(
  prompt: NotificationPillAnswerPrompt,
  selections: ReadonlyArray<{ question: string; values: string[] }>,
): Record<string, unknown> {
  const byQuestion = new Map(
    selections
      .filter((selection) => selection.values.length > 0)
      .map((selection) => [selection.question, selection.values] as const),
  );
  const answers: Record<string, string> = {};
  const content: Record<string, unknown> = { answers };
  prompt.questions.forEach((question, index) => {
    const values = byQuestion.get(question.question);
    if (!values || values.length === 0) return;
    answers[question.question] = values.join(", ");
    content[`answer_${index}`] = question.multiSelect ? values : values[0];
  });
  const onlyQuestion = prompt.questions.length === 1 ? prompt.questions[0] : undefined;
  if (onlyQuestion) {
    const values = byQuestion.get(onlyQuestion.question);
    if (values && values.length > 0)
      content.answer = onlyQuestion.multiSelect ? values : values[0];
  }
  return content;
}

function sameNotificationPillContext(
  a: NotificationPillActionReply["context"],
  b: NotificationPillPresentation["context"],
): boolean {
  return (
    a.taskId === b.taskId &&
    a.requestId === b.requestId &&
    (a.workspaceIdentity?.trim() || a.workspacePath) ===
      (b.workspaceIdentity?.trim() || b.workspacePath) &&
    a.workspacePath === b.workspacePath &&
    a.remoteSessionId === b.remoteSessionId &&
    a.logEpoch === b.logEpoch &&
    a.revision === b.revision
  );
}

export function readNotificationPillAppearance(): NotificationPillPresentation["appearance"] {
  const style = getComputedStyle(document.documentElement);
  const read = (name: string) => style.getPropertyValue(name).trim();
  return {
    background: read("--color-popover"),
    foreground: read("--color-foreground"),
    border: read("--color-border"),
    accent: read("--color-brand"),
    fontSize: read("--ui-font-size"),
  };
}
