/**
 * Notifications settings section.
 *
 * Presentation only: the section renders the notification-preference record and calls back with
 * patches. `SettingsPage` owns the store wiring and telemetry; this component never touches the
 * store or `localStorage` directly, mirroring the other section components.
 */
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.js";
import { Switch } from "@/components/ui/switch.js";
import { SettingsRow } from "@/settings/SettingsPageParts.js";
import { useMesaCodeIntl } from "@/i18n/IntlProvider.js";
import type {
  TaskNotificationPosition,
  TaskNotificationPreferences,
} from "@/lib/taskNotificationPreferences.js";

const POSITION_OPTIONS: readonly TaskNotificationPosition[] = [
  "top-center",
  "top-right",
  "bottom-center",
  "bottom-left",
];

const DURATION_OPTIONS_MS = [3000, 5000, 8000, 12000] as const;

export interface NotificationsSectionProps {
  preferences: TaskNotificationPreferences;
  onChange: (patch: Partial<TaskNotificationPreferences>) => void;
}

export function NotificationsSection({ preferences, onChange }: NotificationsSectionProps) {
  const { intl } = useMesaCodeIntl();
  const t = (id: string) => intl.formatMessage({ id });
  const master = preferences.enabled;
  const channelDisabled = !master;

  return (
    <div className="flex flex-col">
      <SettingsRow
        label={t("settings.notifications.master")}
        description={t("settings.notifications.masterDescription")}
        control={
          <Switch
            checked={preferences.enabled}
            onCheckedChange={(enabled) => onChange({ enabled })}
          />
        }
      />
      <SettingsRow
        label={t("settings.notifications.channel.toast")}
        description={t("settings.notifications.channel.toastDescription")}
        disabled={channelDisabled}
        control={
          <Switch
            checked={preferences.toast}
            disabled={channelDisabled}
            onCheckedChange={(toast) => onChange({ toast })}
          />
        }
      />
      <SettingsRow
        label={t("settings.notifications.channel.os")}
        description={t("settings.notifications.channel.osDescription")}
        disabled={channelDisabled}
        control={
          <Switch
            checked={preferences.os}
            disabled={channelDisabled}
            onCheckedChange={(os) => onChange({ os })}
          />
        }
      />
      <SettingsRow
        label={t("settings.notifications.channel.pill")}
        description={t("settings.notifications.channel.pillDescription")}
        disabled={channelDisabled}
        control={
          <Switch
            checked={preferences.pill}
            disabled={channelDisabled}
            onCheckedChange={(pill) => onChange({ pill })}
          />
        }
      />
      <SettingsRow
        label={t("settings.notifications.quietWhenFocused")}
        description={t("settings.notifications.quietWhenFocusedDescription")}
        disabled={channelDisabled}
        control={
          <Switch
            checked={preferences.quietWhenFocused}
            disabled={channelDisabled}
            onCheckedChange={(quietWhenFocused) => onChange({ quietWhenFocused })}
          />
        }
      />
      <SettingsRow
        label={t("settings.notifications.position")}
        description={t("settings.notifications.positionDescription")}
        disabled={channelDisabled}
        control={
          <Select
            value={preferences.position}
            disabled={channelDisabled}
            onValueChange={(value) => onChange({ position: value as TaskNotificationPosition })}
          >
            <SelectTrigger size="lg" className="w-65 min-w-0 justify-between">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {POSITION_OPTIONS.map((position) => (
                <SelectItem key={position} value={position}>
                  {t(`settings.notifications.position.${position}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />
      <SettingsRow
        label={t("settings.notifications.duration")}
        description={t("settings.notifications.durationDescription")}
        disabled={channelDisabled}
        control={
          <Select
            value={String(preferences.durationMs)}
            disabled={channelDisabled}
            onValueChange={(value) => onChange({ durationMs: Number(value) })}
          >
            <SelectTrigger size="lg" className="w-65 min-w-0 justify-between">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DURATION_OPTIONS_MS.map((durationMs) => (
                <SelectItem key={durationMs} value={String(durationMs)}>
                  {intl.formatMessage(
                    { id: "settings.notifications.durationSeconds" },
                    { seconds: Math.round(durationMs / 1000) },
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />
      <SettingsRow
        label={t("settings.notifications.event.completed")}
        description={t("settings.notifications.event.completedDescription")}
        disabled={channelDisabled}
        control={
          <Switch
            checked={preferences.events.completed}
            disabled={channelDisabled}
            onCheckedChange={(completed) => onChange({ events: { ...preferences.events, completed } })}
          />
        }
      />
      <SettingsRow
        label={t("settings.notifications.event.failed")}
        description={t("settings.notifications.event.failedDescription")}
        disabled={channelDisabled}
        control={
          <Switch
            checked={preferences.events.failed}
            disabled={channelDisabled}
            onCheckedChange={(failed) => onChange({ events: { ...preferences.events, failed } })}
          />
        }
      />
      <SettingsRow
        label={t("settings.notifications.event.permission")}
        description={t("settings.notifications.event.permissionDescription")}
        disabled={channelDisabled}
        control={
          <Switch
            checked={preferences.events.permission}
            disabled={channelDisabled}
            onCheckedChange={(permission) =>
              onChange({ events: { ...preferences.events, permission } })
            }
          />
        }
      />
      <SettingsRow
        label={t("settings.notifications.event.subagentStalled")}
        description={t("settings.notifications.event.subagentStalledDescription")}
        disabled={channelDisabled}
        control={
          <Switch
            checked={preferences.events.subagentStalled}
            disabled={channelDisabled}
            onCheckedChange={(subagentStalled) =>
              onChange({ events: { ...preferences.events, subagentStalled } })
            }
          />
        }
      />
    </div>
  );
}
