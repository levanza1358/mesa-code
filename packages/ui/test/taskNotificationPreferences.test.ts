// Unit coverage for docs/specs/notification-settings.md rule 1-3: the preference module is the
// single owner of the record, normalizes untrusted input, and migrates the two legacy boolean keys
// without losing a user's prior effective state.
import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_TASK_NOTIFICATION_PREFERENCES,
  MAX_TASK_NOTIFICATION_DURATION_MS,
  MIN_TASK_NOTIFICATION_DURATION_MS,
  isTaskNotificationEnabled,
  isTaskNotificationSoundEnabled,
  normalizeTaskNotificationPreferences,
  persistTaskNotificationPreferences,
  readTaskNotificationPreferences,
} from "../src/lib/taskNotificationPreferences.js";

// Minimal in-memory localStorage so the module's storage access is deterministic in the test runner.
function installLocalStorage(): void {
  const store = new Map<string, string>();
  (globalThis as { localStorage?: Storage }).localStorage = {
    getItem: (key: string) => (store.has(key) ? (store.get(key) as string) : null),
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
    key: (index: number) => [...store.keys()][index] ?? null,
    get length() {
      return store.size;
    },
  } as Storage;
}

test.beforeEach(() => installLocalStorage());

test("defaults apply when nothing is stored", () => {
  const preferences = readTaskNotificationPreferences();
  assert.deepEqual(preferences, DEFAULT_TASK_NOTIFICATION_PREFERENCES);
  assert.equal(preferences.enabled, true);
  assert.equal(preferences.position, "top-center");
});

test("a stored record is normalized: bad position/value/duration fall back safely", () => {
  persistTaskNotificationPreferences({
    ...DEFAULT_TASK_NOTIFICATION_PREFERENCES,
    position: "middle-somewhere" as never,
    durationMs: 999_999,
    events: { ...DEFAULT_TASK_NOTIFICATION_PREFERENCES.events, completed: "yes" as never },
  });
  const preferences = readTaskNotificationPreferences();
  assert.equal(preferences.position, "top-center");
  assert.equal(preferences.durationMs, MAX_TASK_NOTIFICATION_DURATION_MS);
  assert.equal(preferences.events.completed, true);
});

test("duration is clamped to the supported range", () => {
  assert.equal(normalizeTaskNotificationPreferences({ durationMs: 10 }).durationMs, MIN_TASK_NOTIFICATION_DURATION_MS);
  assert.equal(normalizeTaskNotificationPreferences({ durationMs: 0 }).durationMs, MIN_TASK_NOTIFICATION_DURATION_MS);
  assert.equal(
    normalizeTaskNotificationPreferences({ durationMs: Number.NaN }).durationMs,
    DEFAULT_TASK_NOTIFICATION_PREFERENCES.durationMs,
  );
});

test("legacy keys seed the record on upgrade, preserving a disabled state", () => {
  localStorage.setItem("mesa-code-notification-enabled", "false");
  localStorage.setItem("mesa-code-notification-sound-enabled", "true");
  const preferences = readTaskNotificationPreferences();
  assert.equal(preferences.enabled, false);
  // Legacy sound was a raw sub-toggle; the record stores that, and the effective value stays off
  // because the master switch is off.
  assert.equal(preferences.sound, true);
  assert.equal(isTaskNotificationEnabled(), false);
  assert.equal(isTaskNotificationSoundEnabled(), false);
  // The migration persisted the record so it is authoritative afterwards.
  assert.ok(localStorage.getItem("mesa-code-notification-preferences"));
});

test("legacy import is idempotent: the record wins once written", () => {
  localStorage.setItem("mesa-code-notification-enabled", "false");
  assert.equal(readTaskNotificationPreferences().enabled, false);
  // A user then re-enables via the record; the stale legacy key must not resurrect the old value.
  persistTaskNotificationPreferences({
    ...DEFAULT_TASK_NOTIFICATION_PREFERENCES,
    enabled: true,
  });
  assert.equal(readTaskNotificationPreferences().enabled, true);
});

test("effective sound is gated by the master switch", () => {
  persistTaskNotificationPreferences({
    ...DEFAULT_TASK_NOTIFICATION_PREFERENCES,
    enabled: true,
    sound: false,
  });
  assert.equal(isTaskNotificationSoundEnabled(), false);
  persistTaskNotificationPreferences({
    ...DEFAULT_TASK_NOTIFICATION_PREFERENCES,
    enabled: false,
    sound: true,
  });
  assert.equal(isTaskNotificationSoundEnabled(), false);
});

test("an unknown sound preset falls back to the default", () => {
  assert.equal(
    normalizeTaskNotificationPreferences({ soundPreset: "airhorn" as never }).soundPreset,
    DEFAULT_TASK_NOTIFICATION_PREFERENCES.soundPreset,
  );
  assert.equal(normalizeTaskNotificationPreferences({ soundPreset: "chime" }).soundPreset, "chime");
});

test("sound volume is clamped to 0..1", () => {
  assert.equal(normalizeTaskNotificationPreferences({ soundVolume: 2 }).soundVolume, 1);
  assert.equal(normalizeTaskNotificationPreferences({ soundVolume: -1 }).soundVolume, 0);
  assert.equal(
    normalizeTaskNotificationPreferences({ soundVolume: Number.NaN }).soundVolume,
    DEFAULT_TASK_NOTIFICATION_PREFERENCES.soundVolume,
  );
  assert.equal(normalizeTaskNotificationPreferences({ soundVolume: 0.35 }).soundVolume, 0.35);
});
