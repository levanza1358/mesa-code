// Covers docs/specs/notification-settings.md rule 9 (sound): the preset vocabulary is closed, an
// unknown value falls back to the default, and a custom sound overrides the preset at resolution.
import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_NOTIFICATION_SOUND_PRESET,
  NOTIFICATION_SOUND_PRESETS,
  isNotificationSoundPreset,
  resolveNotificationSoundSource,
} from "../src/lib/notificationSoundPreset.js";

const presetSource = (preset: string) => `asset:${preset}`;

test("the preset vocabulary is closed", () => {
  assert.equal(isNotificationSoundPreset("pop"), true);
  assert.equal(isNotificationSoundPreset("chime"), true);
  assert.equal(isNotificationSoundPreset("airhorn"), false);
  assert.equal(isNotificationSoundPreset(undefined), false);
  assert.equal(DEFAULT_NOTIFICATION_SOUND_PRESET, "pop");
  assert.ok(NOTIFICATION_SOUND_PRESETS.includes("ping"));
});

test("without a custom sound the preset asset is used", () => {
  assert.equal(
    resolveNotificationSoundSource({ preset: "chime", presetSource }),
    "asset:chime",
  );
  assert.equal(
    resolveNotificationSoundSource({ preset: "chime", customDataUrl: null, presetSource }),
    "asset:chime",
  );
  assert.equal(
    resolveNotificationSoundSource({ preset: "chime", customDataUrl: "   ", presetSource }),
    "asset:chime",
  );
});

test("a non-empty custom sound overrides the preset", () => {
  assert.equal(
    resolveNotificationSoundSource({
      preset: "chime",
      customDataUrl: "data:audio/wav;base64,AAAA",
      presetSource,
    }),
    "data:audio/wav;base64,AAAA",
  );
});
