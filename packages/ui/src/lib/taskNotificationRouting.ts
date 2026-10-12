/**
 * Pure routing for task notifications: given the preference record, the event kind, and whether the
 * app is focused, decide which delivery channels fire. Kept pure (no DOM, no platform) so the matrix
 * is unit-tested directly and the hooks stay thin.
 *
 * Rules (docs/specs/notification-settings.md rules 4-5):
 * - the master switch and the per-event toggle gate everything;
 * - a focused window delivers an in-app toast (unless quiet-when-focused);
 * - an unfocused window delivers the pill and the OS notification;
 * - the sound follows whatever was actually delivered.
 */
import type { TaskNotificationPreferences } from "@/lib/taskNotificationPreferences.js";

export type TaskNotificationEventKind = "completed" | "failed" | "permission" | "subagentStalled";

export interface TaskNotificationDelivery {
  toast: boolean;
  os: boolean;
  pill: boolean;
  sound: boolean;
}

const NOTHING: TaskNotificationDelivery = { toast: false, os: false, pill: false, sound: false };

export function decideTaskNotificationDelivery(params: {
  preferences: TaskNotificationPreferences;
  event: TaskNotificationEventKind;
  focused: boolean;
}): TaskNotificationDelivery {
  const { preferences, event, focused } = params;
  if (!preferences.enabled || !preferences.events[event]) {
    return NOTHING;
  }

  if (focused) {
    if (preferences.quietWhenFocused) {
      return NOTHING;
    }
    const toast = preferences.toast;
    return {
      toast,
      os: false,
      pill: false,
      sound: preferences.sound && toast,
    };
  }

  const os = preferences.os;
  const pill = preferences.pill;
  return {
    toast: false,
    os,
    pill,
    // The pill carries no sound of its own; an OS notification already plays it on the platform
    // side, so only the OS channel counts here.
    sound: preferences.sound && os,
  };
}
