import { readCustomNotificationSound } from "@/lib/notificationSoundCustom.js";
import {
  notificationSoundPresetSource,
  resolveNotificationSoundSource,
} from "@/lib/notificationSoundCatalog.js";
import {
  isTaskNotificationSoundEnabled,
  readTaskNotificationPreferences,
} from "@/lib/taskNotificationPreferences.js";

let taskNotificationAudio: HTMLAudioElement | null = null;
let loadedSource: string | null = null;

/**
 * The audio element for a given source. A custom sound and a preset have different sources, so the
 * element is re-created (and re-preloaded) whenever the resolved source changes.
 */
function getAudioForSource(source: string): HTMLAudioElement | null {
  if (typeof Audio === "undefined") {
    return null;
  }
  if (!taskNotificationAudio || loadedSource !== source) {
    taskNotificationAudio = new Audio(source);
    taskNotificationAudio.preload = "auto";
    loadedSource = source;
  }
  return taskNotificationAudio;
}

function readSourceAndVolume(): { source: string; volume: number } {
  const preferences = readTaskNotificationPreferences();
  const custom = readCustomNotificationSound();
  return {
    source: resolveNotificationSoundSource({
      preset: preferences.soundPreset,
      customDataUrl: custom?.dataUrl,
      presetSource: notificationSoundPresetSource,
    }),
    volume: preferences.soundVolume,
  };
}

async function playResolvedSound(): Promise<void> {
  const { source, volume } = readSourceAndVolume();
  const audio = getAudioForSource(source);
  if (!audio) {
    return;
  }
  audio.volume = volume;
  try {
    // The same Audio instance is reused across notifications; rewinding first avoids a silent
    // replay when the previous run left it at its end state.
    audio.pause();
    audio.currentTime = 0;
    await audio.play();
  } catch {
    // Sound is an enhancement; a playback failure must not disrupt the notification path.
  }
}

export async function playTaskNotificationSound(): Promise<void> {
  // The final check lives at the player entry so every caller honors the sound sub-switch
  // consistently: desktop and web both trigger playback after a notification is shown.
  if (!isTaskNotificationSoundEnabled()) {
    return;
  }
  await playResolvedSound();
}

/**
 * Plays the configured sound regardless of the enable switch, for the Settings preview: an explicit
 * user action must make a sound even while notifications are switched off.
 */
export async function previewTaskNotificationSound(): Promise<void> {
  await playResolvedSound();
}

/** Converts a picked audio file into a bounded data URL, or null when it is too large. */
export function readNotificationSoundFileAsDataUrl(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => resolve(null);
    reader.onload = () => {
      resolve(typeof reader.result === "string" ? reader.result : null);
    };
    reader.readAsDataURL(file);
  });
}
