import type { NotificationPillActionReply, NotificationPillPresentation } from "@mesa-code/shared";
import type { PendingInteraction } from "@mesa-code/shared/mesa-code-protocol-v4";

export function notificationPillPreview(preview?: string): string {
  const text = (preview ?? "").replace(/\s+/g, " ").trim();
  const bounded = text.slice(0, 120);
  return /[\uD800-\uDBFF]$/.test(bounded) ? bounded.slice(0, -1) : bounded;
}

export function notificationPillOptions(
  interaction: PendingInteraction,
): NotificationPillPresentation["options"] {
  const payload = interaction.payload;
  // Detail and rich display require the full review UI; a bounded summary is not a substitute.
  if (
    payload.kind !== "permission" ||
    payload.display ||
    payload.freeText ||
    payload.summary.length > 512 ||
    !payload.summary.trim() ||
    (payload.detail !== null && payload.detail !== undefined && payload.detail !== "")
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
    a.taskId === b.taskId &&
    a.requestId === b.requestId &&
    (a.workspaceIdentity?.trim() || a.workspacePath) ===
      (b.workspaceIdentity?.trim() || b.workspacePath) &&
    a.workspacePath === b.workspacePath &&
    a.remoteSessionId === b.remoteSessionId &&
    a.logEpoch === b.logEpoch &&
    a.revision === b.revision &&
    presentation.options.some((option) => option.optionId === action.optionId)
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
