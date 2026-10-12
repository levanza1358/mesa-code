import { useEffect, useRef } from "react";
import type {
  IPlatformService,
  NotificationPillPresentation,
  TaskNotificationPayload,
} from "@mesa-code/shared";
import type { ConversationSnapshot } from "@mesa-code/shared/mesa-code-protocol-v4";
import { toast } from "@/components/ui/toast.js";
import type { IntlInstance } from "@/i18n/index.js";
import { logger } from "@/logger.js";
import {
  notificationPillPreview,
  readNotificationPillAppearance,
} from "@/lib/notification-pill.js";
import { collectSubagentStalledNotificationPayloads } from "@/lib/taskNotificationOrchestrator.js";
import { decideTaskNotificationDelivery } from "@/lib/taskNotificationRouting.js";
import type { TaskNotificationPreferences } from "@/lib/taskNotificationPreferences.js";
import { isWindowFocused } from "@/lib/windowFocus.js";

type FormatMessage = IntlInstance["formatMessage"];
type NotificationPlatform = Pick<
  IPlatformService,
  "showTaskNotification" | "presentNotificationPill"
>;

interface SubagentTaskNotificationsParams {
  snapshot: ConversationSnapshot | null;
  enabled: boolean;
  platform: NotificationPlatform | null | undefined;
  preferences: TaskNotificationPreferences;
  workspacePath: string;
  workspaceIdentity?: string;
  endpointKey?: string | null;
  formatMessage: FormatMessage;
}

function trimOptional(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function showTaskNotification(
  platform: NotificationPlatform,
  payload: TaskNotificationPayload,
): void {
  try {
    platform.showTaskNotification(payload);
  } catch (error) {
    logger.warn("[subagent-notification] 触发平台通知失败", {
      taskId: payload.taskId,
      requestId: payload.requestId,
      error,
    });
  }
}

/**
 * Subagent-stall notifications (docs/specs/notification-settings.md rule 8).
 *
 * The conversation snapshot is the single source of truth: a subagent row reaching a non-success
 * terminal state (failed, or cancelled by the user / the inactivity watchdog) is the edge we notify
 * on. The first snapshot of a session is a baseline — rows already stopped there are marked seen so
 * recovery replay does not fire a burst of notifications for history. Delivery reuses the same
 * routing rules as the terminal session events: focused → toast, unfocused → OS + pill.
 */
export function useSubagentTaskNotifications({
  snapshot,
  enabled,
  platform,
  preferences,
  workspacePath,
  workspaceIdentity: rawWorkspaceIdentity,
  endpointKey: rawEndpointKey,
  formatMessage,
}: SubagentTaskNotificationsParams): void {
  const workspaceIdentity = trimOptional(rawWorkspaceIdentity);
  const endpointKey = trimOptional(rawEndpointKey);
  const seenRef = useRef<{ sessionId: string; seenRowIds: Set<number> } | null>(null);

  useEffect(() => {
    if (!enabled || !snapshot) {
      seenRef.current = null;
      return;
    }

    const current = seenRef.current;
    if (!current || current.sessionId !== snapshot.sessionId) {
      const stalledRowIds = collectSubagentStalledNotificationPayloads({
        snapshot,
        previouslySeenRowIds: new Set<number>(),
        formatMessage,
      }).map((payload) => Number(payload.requestId));
      seenRef.current = { sessionId: snapshot.sessionId, seenRowIds: new Set(stalledRowIds) };
      return;
    }

    const payloads = collectSubagentStalledNotificationPayloads({
      snapshot,
      previouslySeenRowIds: current.seenRowIds,
      formatMessage,
    });
    if (payloads.length === 0) return;

    // Mark every stalled row seen *before* dispatching, so a re-render with the same snapshot does
    // not re-emit even if a platform call throws.
    for (const payload of payloads) {
      if (payload.requestId) current.seenRowIds.add(Number(payload.requestId));
    }

    const focused = isWindowFocused();
    for (const payload of payloads) {
      const delivery = decideTaskNotificationDelivery({
        preferences,
        event: "subagentStalled",
        focused,
      });
      if (!delivery.toast && !delivery.os && !delivery.pill) continue;

      if (delivery.toast) {
        toast(payload.body || payload.title, {
          position: preferences.position,
          durationMs: preferences.durationMs,
          variant: "warning",
          dedupeKey: `subagent-notification:${payload.taskId}:${payload.requestId ?? ""}`,
        });
      }
      if (delivery.os && platform) {
        showTaskNotification(platform, payload);
      }
      if (delivery.pill && platform) {
        const token = crypto.randomUUID();
        const presentation: NotificationPillPresentation = {
          token,
          kind: "status",
          context: {
            taskId: payload.taskId,
            workspacePath,
            ...(workspaceIdentity ? { workspaceIdentity } : {}),
            ...(endpointKey ? { remoteSessionId: endpointKey } : {}),
          },
          title: payload.title.slice(0, 512),
          body: payload.body.slice(0, 512),
          preview: notificationPillPreview(),
          openLabel: formatMessage({ id: "notification.pill.open" }),
          error: "",
          busy: false,
          options: [],
          position: preferences.position,
          durationMs: preferences.durationMs,
          appearance: readNotificationPillAppearance(),
        };
        platform.presentNotificationPill?.({ token, presentation });
      }
    }
  }, [
    enabled,
    endpointKey,
    formatMessage,
    platform,
    preferences,
    snapshot,
    workspaceIdentity,
    workspacePath,
  ]);
}
