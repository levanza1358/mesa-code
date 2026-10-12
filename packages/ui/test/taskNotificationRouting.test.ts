// Covers docs/specs/notification-settings.md rules 4-5 (the delivery matrix): master/event gating,
// focus routing (toast vs OS+pill), quiet-when-focused, and the channel switches.
import assert from "node:assert/strict";
import { test } from "node:test";
import { decideTaskNotificationDelivery } from "../src/lib/taskNotificationRouting.js";
import { DEFAULT_TASK_NOTIFICATION_PREFERENCES } from "../src/lib/taskNotificationPreferences.js";

const base = DEFAULT_TASK_NOTIFICATION_PREFERENCES;

test("master off delivers nothing on any channel", () => {
  const delivery = decideTaskNotificationDelivery({
    preferences: { ...base, enabled: false },
    event: "completed",
    focused: false,
  });
  assert.deepEqual(delivery, { toast: false, os: false, pill: false, sound: false });
});

test("a disabled event delivers nothing", () => {
  const delivery = decideTaskNotificationDelivery({
    preferences: { ...base, events: { ...base.events, failed: false } },
    event: "failed",
    focused: false,
  });
  assert.deepEqual(delivery, { toast: false, os: false, pill: false, sound: false });
});

test("focused delivers a toast, not OS or pill", () => {
  const delivery = decideTaskNotificationDelivery({ preferences: base, event: "completed", focused: true });
  assert.equal(delivery.toast, true);
  assert.equal(delivery.os, false);
  assert.equal(delivery.pill, false);
  assert.equal(delivery.sound, true);
});

test("unfocused delivers OS and pill, not a toast", () => {
  const delivery = decideTaskNotificationDelivery({ preferences: base, event: "completed", focused: false });
  assert.equal(delivery.toast, false);
  assert.equal(delivery.os, true);
  assert.equal(delivery.pill, true);
});

test("quiet when focused silences the focused window but not the unfocused path", () => {
  const preferences = { ...base, quietWhenFocused: true };
  assert.deepEqual(decideTaskNotificationDelivery({ preferences, event: "completed", focused: true }), {
    toast: false,
    os: false,
    pill: false,
    sound: false,
  });
  const unfocused = decideTaskNotificationDelivery({ preferences, event: "completed", focused: false });
  assert.equal(unfocused.os, true);
  assert.equal(unfocused.pill, true);
});

test("turning the toast channel off leaves the unfocused channels intact", () => {
  const preferences = { ...base, toast: false };
  assert.equal(decideTaskNotificationDelivery({ preferences, event: "completed", focused: true }).toast, false);
  assert.equal(decideTaskNotificationDelivery({ preferences, event: "completed", focused: false }).os, true);
});

test("turning the OS channel off leaves the pill and toasts intact", () => {
  const preferences = { ...base, os: false };
  const unfocused = decideTaskNotificationDelivery({ preferences, event: "completed", focused: false });
  assert.equal(unfocused.os, false);
  assert.equal(unfocused.pill, true);
  // Sound follows the OS channel (the pill carries no sound of its own).
  assert.equal(unfocused.sound, false);
});

test("the subagentStalled event is routed by the same rules", () => {
  assert.equal(
    decideTaskNotificationDelivery({ preferences: base, event: "subagentStalled", focused: true }).toast,
    true,
  );
  assert.equal(
    decideTaskNotificationDelivery({
      preferences: { ...base, events: { ...base.events, subagentStalled: false } },
      event: "subagentStalled",
      focused: false,
    }).os,
    false,
  );
});

test("sound is off when the master sound switch is off", () => {
  const preferences = { ...base, sound: false };
  assert.equal(decideTaskNotificationDelivery({ preferences, event: "completed", focused: true }).sound, false);
});
