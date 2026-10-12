/**
 * Notification sound catalog: maps a stored preset id to its bundled asset.
 *
 * The preset vocabulary and the pure source-resolution rule live in `notificationSoundPreset.ts`
 * (asset-free, so the preference record stays importable under the test runner). This module is the
 * only place the actual audio assets are imported, so the bundler emits them for the desktop
 * renderer and the web client.
 */
import popUrl from "@/assets/notification-sounds/task-notification-pop.mp3";
import pingUrl from "@/assets/notification-sounds/notification-ping.wav";
import chimeUrl from "@/assets/notification-sounds/notification-chime.wav";
import marimbaUrl from "@/assets/notification-sounds/notification-marimba.wav";
import {
  DEFAULT_NOTIFICATION_SOUND_PRESET,
  type NotificationSoundPreset,
} from "@/lib/notificationSoundPreset.js";

export {
  DEFAULT_NOTIFICATION_SOUND_PRESET,
  NOTIFICATION_SOUND_PRESETS,
  isNotificationSoundPreset,
  resolveNotificationSoundSource,
} from "@/lib/notificationSoundPreset.js";
export type { NotificationSoundPreset } from "@/lib/notificationSoundPreset.js";

const PRESET_SOURCES: Record<NotificationSoundPreset, string> = {
  pop: popUrl,
  ping: pingUrl,
  chime: chimeUrl,
  marimba: marimbaUrl,
};

/** The bundled asset URL for a preset (falling back to the default when given an unknown id). */
export function notificationSoundPresetSource(preset: NotificationSoundPreset): string {
  return PRESET_SOURCES[preset] ?? PRESET_SOURCES[DEFAULT_NOTIFICATION_SOUND_PRESET];
}
