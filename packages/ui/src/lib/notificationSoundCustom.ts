/**
 * Custom notification sound: the single owner of the user-uploaded sound.
 *
 * A custom sound is a data URL plus a display name, stored under two dedicated keys (never inside
 * the preference record, so a large blob never travels the cross-window broadcast). Same-origin
 * windows share `localStorage`, so every window reads the same value; a lightweight change event
 * lets the Settings section re-render in the window that changed it, and the `storage` event covers
 * the other windows.
 *
 * The player reads the value at play time, so playback never uses a stale sound.
 */

const CUSTOM_SOUND_STORAGE_KEY = "mesa-code-notification-sound-custom";
const CUSTOM_SOUND_NAME_STORAGE_KEY = "mesa-code-notification-sound-custom-name";

/** Uploaded sounds are capped so a data URL stays a sane size for localStorage. */
export const MAX_CUSTOM_NOTIFICATION_SOUND_BYTES = 1_500_000;

/** Dispatched on `window` after the custom sound changes in this window. */
export const NOTIFICATION_CUSTOM_SOUND_CHANGED_EVENT =
  "mesa-code:notification-custom-sound-changed";

export interface CustomNotificationSound {
  /** A data URL (base64) ready to assign to an `Audio` element's `src`. */
  dataUrl: string;
  /** The original file name, for display. */
  name: string;
}

const AUDIO_EXTENSIONS = [".mp3", ".wav", ".ogg", ".m4a", ".aac", ".flac", ".webm"];

/**
 * Whether a picked file may be used as a notification sound. Audio MIME types pass; otherwise the
 * extension decides, because some platforms report an empty MIME for local audio files.
 */
export function isSupportedNotificationSoundFile(file: { type: string; name: string }): boolean {
  if (file.type.startsWith("audio/")) return true;
  const lower = file.name.toLowerCase();
  return AUDIO_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function readCustomNotificationSound(): CustomNotificationSound | null {
  const dataUrl = safeGetItem(CUSTOM_SOUND_STORAGE_KEY);
  if (!dataUrl || !dataUrl.startsWith("data:")) {
    return null;
  }
  return { dataUrl, name: safeGetItem(CUSTOM_SOUND_NAME_STORAGE_KEY) ?? "" };
}

export function persistCustomNotificationSound(sound: CustomNotificationSound | null): void {
  try {
    if (sound && sound.dataUrl.startsWith("data:")) {
      localStorage.setItem(CUSTOM_SOUND_STORAGE_KEY, sound.dataUrl);
      localStorage.setItem(CUSTOM_SOUND_NAME_STORAGE_KEY, sound.name);
    } else {
      localStorage.removeItem(CUSTOM_SOUND_STORAGE_KEY);
      localStorage.removeItem(CUSTOM_SOUND_NAME_STORAGE_KEY);
    }
  } catch {
    // localStorage unavailable/full: keep the in-memory flow working.
  }
  notifyCustomNotificationSoundChanged();
}

export function clearCustomNotificationSound(): void {
  persistCustomNotificationSound(null);
}

/** Notifies listeners in this window; other windows observe the `storage` event. */
export function notifyCustomNotificationSoundChanged(): void {
  try {
    window.dispatchEvent(new Event(NOTIFICATION_CUSTOM_SOUND_CHANGED_EVENT));
  } catch {
    // Non-DOM environment (tests): nothing to notify.
  }
}
