/**
 * Notification-sound presets: the pure, asset-free half of the sound catalog.
 *
 * Kept separate from `notificationSoundCatalog.ts` (which imports the bundled audio files) because
 * the preference record references the preset type/default, and the record must stay importable in
 * environments without an asset loader (e.g. `tsx --test`).
 */

export type NotificationSoundPreset = "pop" | "ping" | "chime" | "marimba";

export const NOTIFICATION_SOUND_PRESETS: readonly NotificationSoundPreset[] = [
  "pop",
  "ping",
  "chime",
  "marimba",
];

export const DEFAULT_NOTIFICATION_SOUND_PRESET: NotificationSoundPreset = "pop";

export function isNotificationSoundPreset(value: unknown): value is NotificationSoundPreset {
  return (
    typeof value === "string" && (NOTIFICATION_SOUND_PRESETS as readonly string[]).includes(value)
  );
}

/**
 * Resolves the audio source to play: a user-selected custom sound (a data URL) when present and
 * non-empty, otherwise the chosen preset's source. Pure: the preset→asset mapping is injected so
 * this logic stays testable without an asset loader.
 */
export function resolveNotificationSoundSource(params: {
  preset: NotificationSoundPreset;
  customDataUrl?: string | null;
  presetSource: (preset: NotificationSoundPreset) => string;
}): string {
  const custom = params.customDataUrl?.trim();
  if (custom) return custom;
  return params.presetSource(params.preset);
}
