/**
 * Sound settings section.
 *
 * Presentation for the notification-sound preference (enable, preset, volume) plus the custom
 * uploaded sound. The record fields flow through `preferences` / `onChange` (owned by the store);
 * the custom sound is owned by `lib/notificationSoundCustom.ts`, which this section reads and writes
 * directly — same-origin windows share it through `localStorage`, and a change event keeps the view
 * in sync. This component never touches the notification store.
 */
import { useEffect, useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button.js";
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
import {
  NOTIFICATION_SOUND_PRESETS,
  type NotificationSoundPreset,
} from "@/lib/notificationSoundCatalog.js";
import {
  MAX_CUSTOM_NOTIFICATION_SOUND_BYTES,
  NOTIFICATION_CUSTOM_SOUND_CHANGED_EVENT,
  clearCustomNotificationSound,
  isSupportedNotificationSoundFile,
  persistCustomNotificationSound,
  readCustomNotificationSound,
  type CustomNotificationSound,
} from "@/lib/notificationSoundCustom.js";
import {
  previewTaskNotificationSound,
  readNotificationSoundFileAsDataUrl,
} from "@/lib/taskNotificationSound.js";
import type { TaskNotificationPreferences } from "@/lib/taskNotificationPreferences.js";

export interface SoundSectionProps {
  preferences: TaskNotificationPreferences;
  onChange: (patch: Partial<TaskNotificationPreferences>) => void;
}

export function SoundSection({ preferences, onChange }: SoundSectionProps) {
  const { intl } = useMesaCodeIntl();
  const t = (id: string) => intl.formatMessage({ id });
  const [custom, setCustom] = useState<CustomNotificationSound | null>(readCustomNotificationSound);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const soundEnabled = preferences.sound;

  useEffect(() => {
    const refresh = () => setCustom(readCustomNotificationSound());
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key.startsWith("mesa-code-notification-sound-custom")) {
        refresh();
      }
    };
    window.addEventListener(NOTIFICATION_CUSTOM_SOUND_CHANGED_EVENT, refresh);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(NOTIFICATION_CUSTOM_SOUND_CHANGED_EVENT, refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const handlePickFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    if (!isSupportedNotificationSoundFile(file)) {
      setError(t("settings.sound.customUnsupported"));
      return;
    }
    if (file.size > MAX_CUSTOM_NOTIFICATION_SOUND_BYTES) {
      setError(t("settings.sound.customTooLarge"));
      return;
    }
    const dataUrl = await readNotificationSoundFileAsDataUrl(file);
    if (!dataUrl) {
      setError(t("settings.sound.customUnsupported"));
      return;
    }
    persistCustomNotificationSound({ dataUrl, name: file.name });
    setCustom(readCustomNotificationSound());
  };

  const handleUsePreset = () => {
    clearCustomNotificationSound();
    setCustom(null);
    setError(null);
  };

  return (
    <div className="flex flex-col">
      <SettingsRow
        label={t("settings.sound.enable")}
        description={t("settings.sound.enableDescription")}
        control={
          <Switch checked={soundEnabled} onCheckedChange={(sound) => onChange({ sound })} />
        }
      />
      <SettingsRow
        label={t("settings.sound.presetLabel")}
        description={t("settings.sound.presetDescription")}
        disabled={!soundEnabled}
        control={
          <div className="flex items-center gap-2">
            <Select
              value={preferences.soundPreset}
              disabled={!soundEnabled}
              onValueChange={(value) =>
                onChange({ soundPreset: value as NotificationSoundPreset })
              }
            >
              <SelectTrigger size="lg" className="w-40 min-w-0 justify-between">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NOTIFICATION_SOUND_PRESETS.map((preset) => (
                  <SelectItem key={preset} value={preset}>
                    {t(`settings.sound.preset.${preset}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!soundEnabled}
              onClick={() => void previewTaskNotificationSound()}
            >
              {t("settings.sound.preview")}
            </Button>
          </div>
        }
      />
      <SettingsRow
        label={t("settings.sound.volume")}
        description={t("settings.sound.volumeDescription")}
        disabled={!soundEnabled}
        control={
          <div className="flex w-full min-w-0 items-center gap-3">
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={Math.round(preferences.soundVolume * 100)}
              aria-label={t("settings.sound.volume")}
              disabled={!soundEnabled}
              onChange={(event) =>
                onChange({ soundVolume: Number(event.currentTarget.value) / 100 })
              }
              className="h-1.5 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-border accent-[var(--color-brand)]"
            />
            <span className="w-10 shrink-0 text-right text-ui-base tabular-nums text-foreground-subtle">
              {Math.round(preferences.soundVolume * 100)}%
            </span>
          </div>
        }
      />
      <SettingsRow
        label={t("settings.sound.custom")}
        description={
          custom
            ? intl.formatMessage(
                { id: "settings.sound.customActive" },
                { name: custom.name || t("settings.sound.custom") },
              )
            : t("settings.sound.customDescription")
        }
        disabled={!soundEnabled}
        control={
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac"
              className="hidden"
              onChange={(event) => {
                void handlePickFile(event.currentTarget.files?.[0]);
                event.currentTarget.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!soundEnabled}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mr-1 size-4" aria-hidden />
              {t("settings.sound.customChoose")}
            </Button>
            {custom ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={!soundEnabled}
                onClick={handleUsePreset}
              >
                <X className="mr-1 size-4" aria-hidden />
                {t("settings.sound.customClear")}
              </Button>
            ) : null}
          </div>
        }
      />
      {error ? (
        <div className="px-4 pb-2 text-ui-sm text-destructive">{error}</div>
      ) : null}
    </div>
  );
}
