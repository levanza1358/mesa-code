/**
 * Task-notification preferences: the single owner of the notification settings record.
 *
 * The record is stored as one JSON value under a single key. The module also knows how to migrate
 * from the two legacy boolean keys (`-enabled`, `-sound-enabled`) that predate the record, so an
 * existing installation keeps its effective state instead of silently resetting.
 *
 * Every consumer (store, sound player, notification hooks, toast defaults) reads through the
 * accessors here; nothing else reads or writes the storage key directly.
 */
import {
  DEFAULT_NOTIFICATION_SOUND_PRESET,
  isNotificationSoundPreset,
  type NotificationSoundPreset,
} from "@/lib/notificationSoundPreset.js";

const TASK_NOTIFICATION_PREFERENCES_STORAGE_KEY = "mesa-code-notification-preferences";
// Legacy keys, kept only to seed the record on upgrade. They are read, never deleted.
const LEGACY_NOTIFICATION_ENABLED_KEY = "mesa-code-notification-enabled";
const LEGACY_NOTIFICATION_SOUND_ENABLED_KEY = "mesa-code-notification-sound-enabled";

export type TaskNotificationPosition =
  | "top-center"
  | "top-right"
  | "bottom-center"
  | "bottom-left";

export interface TaskNotificationEventPreferences {
  completed: boolean;
  failed: boolean;
  permission: boolean;
  subagentStalled: boolean;
}

export interface TaskNotificationPreferences {
  /** Master switch: gates every channel and every event. */
  enabled: boolean;
  /** Play the in-app sound when a notification is actually delivered. */
  sound: boolean;
  /** Selected built-in sound preset (a custom sound, if any, overrides it at play time). */
  soundPreset: NotificationSoundPreset;
  /** Playback gain for the notification sound, 0..1. */
  soundVolume: number;
  /** Deliver an OS/native notification when the window is unfocused. */
  os: boolean;
  /** Deliver an in-app toast when the window is focused. */
  toast: boolean;
  /** Deliver the desktop pill overlay when the window is unfocused. */
  pill: boolean;
  /** Automatic do-not-disturb while a window is focused (terminal task events only). */
  quietWhenFocused: boolean;
  position: TaskNotificationPosition;
  durationMs: number;
  events: TaskNotificationEventPreferences;
}

export const DEFAULT_TASK_NOTIFICATION_PREFERENCES: TaskNotificationPreferences = {
  enabled: true,
  sound: true,
  soundPreset: DEFAULT_NOTIFICATION_SOUND_PRESET,
  soundVolume: 0.7,
  os: true,
  toast: true,
  pill: true,
  quietWhenFocused: false,
  position: "top-center",
  durationMs: 5000,
  events: {
    completed: true,
    failed: true,
    permission: true,
    subagentStalled: true,
  },
};

/** Auto-dismiss bounds; the toast and the pill clamp to this range. */
export const MIN_TASK_NOTIFICATION_DURATION_MS = 1000;
export const MAX_TASK_NOTIFICATION_DURATION_MS = 60_000;

const TASK_NOTIFICATION_POSITIONS: readonly TaskNotificationPosition[] = [
  "top-center",
  "top-right",
  "bottom-center",
  "bottom-left",
];

function normalizePosition(value: unknown): TaskNotificationPosition {
  return typeof value === "string" &&
    (TASK_NOTIFICATION_POSITIONS as readonly string[]).includes(value)
    ? (value as TaskNotificationPosition)
    : DEFAULT_TASK_NOTIFICATION_PREFERENCES.position;
}

function normalizeDurationMs(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_TASK_NOTIFICATION_PREFERENCES.durationMs;
  }
  return Math.min(
    MAX_TASK_NOTIFICATION_DURATION_MS,
    Math.max(MIN_TASK_NOTIFICATION_DURATION_MS, Math.round(value)),
  );
}

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeSoundPreset(value: unknown): NotificationSoundPreset {
  return isNotificationSoundPreset(value) ? value : DEFAULT_NOTIFICATION_SOUND_PRESET;
}

function normalizeSoundVolume(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_TASK_NOTIFICATION_PREFERENCES.soundVolume;
  }
  return Math.min(1, Math.max(0, value));
}

function normalizeEventPreferences(
  value: unknown,
): TaskNotificationEventPreferences {
  const source = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  const defaults = DEFAULT_TASK_NOTIFICATION_PREFERENCES.events;
  return {
    completed: normalizeBoolean(source.completed, defaults.completed),
    failed: normalizeBoolean(source.failed, defaults.failed),
    permission: normalizeBoolean(source.permission, defaults.permission),
    subagentStalled: normalizeBoolean(source.subagentStalled, defaults.subagentStalled),
  };
}

/** Normalizes an untrusted partial record into a complete, valid preference record. */
export function normalizeTaskNotificationPreferences(
  input: Partial<TaskNotificationPreferences> | Record<string, unknown> | null | undefined,
): TaskNotificationPreferences {
  const source = (typeof input === "object" && input !== null ? input : {}) as Record<string, unknown>;
  const defaults = DEFAULT_TASK_NOTIFICATION_PREFERENCES;
  return {
    enabled: normalizeBoolean(source.enabled, defaults.enabled),
    sound: normalizeBoolean(source.sound, defaults.sound),
    soundPreset: normalizeSoundPreset(source.soundPreset),
    soundVolume: normalizeSoundVolume(source.soundVolume),
    os: normalizeBoolean(source.os, defaults.os),
    toast: normalizeBoolean(source.toast, defaults.toast),
    pill: normalizeBoolean(source.pill, defaults.pill),
    quietWhenFocused: normalizeBoolean(source.quietWhenFocused, defaults.quietWhenFocused),
    position: normalizePosition(source.position),
    durationMs: normalizeDurationMs(source.durationMs),
    events: normalizeEventPreferences(source.events),
  };
}

/**
 * Merges a partial patch onto a current record, keeping `events` shallow-merged so a patch that
 * changes one event toggle does not drop the others. Pure: no storage, no side effects.
 */
export function mergeTaskNotificationPreferences(
  current: TaskNotificationPreferences,
  patch: Partial<TaskNotificationPreferences>,
): TaskNotificationPreferences {
  return normalizeTaskNotificationPreferences({
    ...current,
    ...patch,
    ...(patch.events ? { events: { ...current.events, ...patch.events } } : {}),
  });
}

function readStoredBoolean(key: string): boolean | undefined {
  try {
    const value = localStorage.getItem(key);
    if (value == null) {
      return undefined;
    }
    // Legacy semantics: anything other than the literal "false" read as true. Preserved so an
    // installation that wrote "true"/"false" keeps its intent after migration.
    return value !== "false";
  } catch {
    return undefined;
  }
}

/**
 * Reads the stored preference record, migrating the legacy boolean keys when the record is absent.
 *
 * Migration is idempotent: once the record exists it is authoritative and the legacy keys are
 * ignored (but left in place). It never throws; an unavailable `localStorage` yields the defaults.
 */
export function readTaskNotificationPreferences(): TaskNotificationPreferences {
  try {
    const raw = localStorage.getItem(TASK_NOTIFICATION_PREFERENCES_STORAGE_KEY);
    if (raw != null) {
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed === "object" && parsed !== null) {
        return normalizeTaskNotificationPreferences(parsed as Record<string, unknown>);
      }
    }
  } catch {
    // Corrupt JSON or unavailable storage: fall through to migration/defaults.
  }

  const legacyEnabled = readStoredBoolean(LEGACY_NOTIFICATION_ENABLED_KEY);
  const legacySound = readStoredBoolean(LEGACY_NOTIFICATION_SOUND_ENABLED_KEY);
  if (legacyEnabled === undefined && legacySound === undefined) {
    return DEFAULT_TASK_NOTIFICATION_PREFERENCES;
  }

  const migrated = normalizeTaskNotificationPreferences({
    ...DEFAULT_TASK_NOTIFICATION_PREFERENCES,
    // Legacy keys are the master switch and the raw sound sub-toggle; the record keeps the same two
    // roles, so both map straight across (the effective value still ANDs them at read time).
    ...(legacyEnabled === undefined ? {} : { enabled: legacyEnabled }),
    ...(legacySound === undefined ? {} : { sound: legacySound }),
  });
  // Persist the migrated record so the next read is authoritative (and the migration runs once).
  persistTaskNotificationPreferences(migrated);
  return migrated;
}

export function persistTaskNotificationPreferences(preferences: TaskNotificationPreferences): void {
  try {
    localStorage.setItem(
      TASK_NOTIFICATION_PREFERENCES_STORAGE_KEY,
      JSON.stringify(normalizeTaskNotificationPreferences(preferences)),
    );
  } catch {
    // localStorage unavailable: keep the in-memory flow working, matching the previous behavior.
  }
}

// --- Derived accessors kept for existing consumers (single source of truth) ---

export function isTaskNotificationEnabled(): boolean {
  return readTaskNotificationPreferences().enabled;
}

export function isTaskNotificationSoundPreferenceEnabled(): boolean {
  return readTaskNotificationPreferences().sound;
}

export function isTaskNotificationSoundEnabled(): boolean {
  // Sound is a sub-capability of the master switch: effective value must include `enabled` so the
  // runtime never plays a sound while notifications are off.
  const preferences = readTaskNotificationPreferences();
  return preferences.enabled && preferences.sound;
}

// --- Legacy writers, kept so the old store setters keep compiling during the transition ---

export function persistTaskNotificationEnabled(enabled: boolean): void {
  persistTaskNotificationPreferences({
    ...readTaskNotificationPreferences(),
    enabled,
  });
}

export function persistTaskNotificationSoundEnabled(enabled: boolean): void {
  persistTaskNotificationPreferences({
    ...readTaskNotificationPreferences(),
    sound: enabled,
  });
}
