import type { TaskNotificationPayload } from "@mesa-code/shared";
import type {
  ConversationRow,
  ConversationSnapshot,
  PendingInteraction,
  SessionPhase,
  SessionSummary,
  SubagentRow,
  UserInputRequestPayload,
} from "@mesa-code/shared/mesa-code-protocol-v4";
import type { IntlInstance } from "@/i18n/index.js";

type FormatMessage = IntlInstance["formatMessage"];

function terminalStatusForPhase(
  phase: SessionPhase,
): Extract<TaskNotificationPayload["status"], "completed" | "failed"> | null {
  if (phase === "completedSuccess" || phase === "completedInterrupted") {
    return "completed";
  }
  if (phase === "error") {
    return "failed";
  }
  return null;
}

function taskTitleBody(
  title: string,
  fallbackMessageId: string,
  formatMessage: FormatMessage,
): string {
  const trimmedTitle = title.trim();
  if (trimmedTitle) {
    return formatMessage({ id: "notification.taskWithTitle" }, { title: trimmedTitle });
  }
  return formatMessage({ id: fallbackMessageId });
}

function terminalPayloadForSession(
  session: SessionSummary,
  status: Extract<TaskNotificationPayload["status"], "completed" | "failed">,
  formatMessage: FormatMessage,
): TaskNotificationPayload {
  if (status === "completed") {
    return {
      taskId: session.sessionId,
      status,
      title: formatMessage({ id: "notification.completed" }),
      body: taskTitleBody(session.title, "notification.completedBody", formatMessage),
    };
  }

  return {
    taskId: session.sessionId,
    status,
    title: formatMessage({ id: "notification.error" }),
    body: taskTitleBody(session.title, "notification.error", formatMessage),
  };
}

export function collectTerminalTaskNotificationPayloads(params: {
  previousBySessionId: ReadonlyMap<string, SessionSummary>;
  sessions: readonly SessionSummary[];
  formatMessage: FormatMessage;
}): TaskNotificationPayload[] {
  const payloads: TaskNotificationPayload[] = [];
  for (const session of params.sessions) {
    const status = terminalStatusForPhase(session.phase);
    if (!status) continue;

    const previous = params.previousBySessionId.get(session.sessionId);
    if (!previous) continue;

    const previousStatus = terminalStatusForPhase(previous.phase);
    if (previousStatus === status) continue;

    payloads.push(terminalPayloadForSession(session, status, params.formatMessage));
  }
  return payloads;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** A subagent row whose terminal state was *not* success: failed or cancelled/stopped. */
function subagentStalledRow(row: ConversationRow): SubagentRow | null {
  if (row.kind !== "subagent") return null;
  return row.status === "success" || row.status === "running" ? null : row;
}

function subagentTitle(row: SubagentRow): string {
  const summary = row.summaryText.trim();
  if (summary) return summary;
  const type = row.subagentType.trim();
  return type || "subagent";
}

/**
 * Subagent-stall notifications (docs/specs/notification-settings.md rule 8).
 *
 * A subagent row that lands in a non-success terminal state (failed, or cancelled by the user /
 * the inactivity watchdog) raises one notification. The row's identity is stable across the
 * window's snapshots, so a row that already stopped is not re-notified on the next snapshot; the
 * `requestId` carries the row id so the desktop main-process dedupe does not collapse two stalled
 * subagents of the same session into one.
 */
export function collectSubagentStalledNotificationPayloads(params: {
  snapshot: ConversationSnapshot;
  previouslySeenRowIds: ReadonlySet<number>;
  formatMessage: FormatMessage;
}): TaskNotificationPayload[] {
  const payloads: TaskNotificationPayload[] = [];
  for (const row of params.snapshot.rows.window) {
    const stalled = subagentStalledRow(row);
    if (!stalled) continue;
    if (params.previouslySeenRowIds.has(stalled.rowId)) continue;
    payloads.push({
      taskId: params.snapshot.sessionId,
      status: "subagent_stalled",
      requestId: String(stalled.rowId),
      title: params.formatMessage({ id: "notification.subagentStalled" }),
      body: params.formatMessage(
        { id: "notification.subagentStalledBody" },
        { title: subagentTitle(stalled) },
      ),
    });
  }
  return payloads;
}

function isPlanApprovalInteraction(payload: UserInputRequestPayload): boolean {
  if (payload.toolName === "ExitPlanMode") {
    return true;
  }
  if (!isPlainRecord(payload.schema)) {
    return false;
  }
  return (
    payload.schema.interaction === "plan_approval" || payload.schema.toolName === "ExitPlanMode"
  );
}

function pendingInteractionPayload(params: {
  snapshot: ConversationSnapshot;
  interaction: PendingInteraction;
  formatMessage: FormatMessage;
}): TaskNotificationPayload | null {
  const { snapshot, interaction, formatMessage } = params;
  const requestId = interaction.interactionId;
  const taskId = snapshot.sessionId;
  const taskTitle = snapshot.meta.title;

  // workspace Hook review 的唯一入口是 Settings；不得把它伪装成
  // permission/elicitation 系统通知。
  if (interaction.payload.kind === "workspaceHookReview") {
    return null;
  }

  if (interaction.payload.kind === "permission") {
    return {
      taskId,
      status: "permission_request",
      requestId,
      title: formatMessage({ id: "notification.permissionRequired" }),
      body:
        interaction.payload.summary.trim() ||
        taskTitleBody(taskTitle, "notification.permissionRequired", formatMessage),
    };
  }

  if (isPlanApprovalInteraction(interaction.payload)) {
    return {
      taskId,
      status: "elicitation_request",
      requestId,
      title: formatMessage({ id: "notification.planApprovalRequired" }),
      body: formatMessage({ id: "notification.planApprovalBody" }),
    };
  }

  return {
    taskId,
    status: "elicitation_request",
    requestId,
    title: formatMessage({ id: "notification.inputRequired" }),
    body:
      interaction.payload.prompt.trim() ||
      taskTitleBody(taskTitle, "notification.inputRequired", formatMessage),
  };
}

export function collectPendingInteractionNotificationPayloads(params: {
  snapshot: ConversationSnapshot;
  seenRequestIds: ReadonlySet<string>;
  formatMessage: FormatMessage;
}): TaskNotificationPayload[] {
  return params.snapshot.pendingInteractions
    .filter((interaction) => !params.seenRequestIds.has(interaction.interactionId))
    .flatMap((interaction) => {
      const payload = pendingInteractionPayload({
        snapshot: params.snapshot,
        interaction,
        formatMessage: params.formatMessage,
      });
      return payload ? [payload] : [];
    });
}
