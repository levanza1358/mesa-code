// Covers docs/specs/notification-settings.md rule 7: a notification-preference change in one window
// is broadcast and applied in another window, without an echo loop. The appearance fields already
// have this contract; this pins it for the new field as well.
import assert from "node:assert/strict";
import { test } from "node:test";
import type { BroadcastMessage, IBroadcastService } from "@mesa-code/services";
import {
  DEFAULT_TASK_NOTIFICATION_PREFERENCES,
  mergeTaskNotificationPreferences,
} from "../src/lib/taskNotificationPreferences.js";

// Minimal in-memory localStorage + DOM so the store's persistence and paint calls have somewhere to
// go; this test exercises the sync contract, not rendering.
function installEnvironment(): void {
  const store = new Map<string, string>();
  (globalThis as { localStorage?: Storage }).localStorage = {
    getItem: (key: string) => (store.has(key) ? (store.get(key) as string) : null),
    setItem: (key: string, value: string) => void store.set(key, String(value)),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
    key: (index: number) => [...store.keys()][index] ?? null,
    get length() {
      return store.size;
    },
  } as Storage;
  (globalThis as { document?: unknown }).document = {
    documentElement: {
      classList: { toggle: () => {}, add: () => {}, remove: () => {} },
      style: { setProperty: () => {}, removeProperty: () => {}, getPropertyValue: () => "" },
    },
  };
  (globalThis as { window?: unknown }).window = {
    matchMedia: () => ({ matches: false, addEventListener: () => {}, addListener: () => {} }),
    addEventListener: () => {},
  };
}

// A tiny broadcast hub: send() records the message; deliver() fans a message to every window's
// onMessage subscribers. The real transport is async, so we deliver explicitly.
function createHub(): {
  makeService: () => IBroadcastService;
  drain: () => BroadcastMessage[];
} {
  let listeners: Array<(message: BroadcastMessage) => void> = [];
  let recorded: BroadcastMessage[] = [];
  const makeService = (): IBroadcastService => {
    const service: IBroadcastService = {
      send: async (message) => {
        recorded.push(message);
      },
      acquireClaim: async () => ({ status: "unavailable" as const }),
      commitClaim: async () => {},
      releaseClaim: async () => {},
      tryClaim: async () => false,
      onMessage: ((listener: (message: BroadcastMessage) => void) => {
        listeners.push(listener);
        return () => {
          listeners = listeners.filter((candidate) => candidate !== listener);
        };
      }) as IBroadcastService["onMessage"],
    };
    return service;
  };
  const drain = () => {
    const messages = recorded;
    recorded = [];
    for (const message of messages) {
      for (const listener of listeners) listener(message);
    }
    return messages;
  };
  return { makeService, drain };
}

test("the notification-preferences field is in the broadcast allowlist", async () => {
  installEnvironment();
  const { isBroadcastField } = await import("../src/store/index.js");
  assert.equal(isBroadcastField("notificationPreferences"), true);
  assert.equal(isBroadcastField("notAField"), false);
});

test("changing preferences in one window reaches another window", async () => {
  installEnvironment();
  const hub = createHub();
  const { createMesaCodeStore } = await import("../src/store/index.js");
  const windowA = createMesaCodeStore(hub.makeService());
  const windowB = createMesaCodeStore(hub.makeService());

  await hub.drain();
  assert.equal(windowB.getState().notificationPreferences.position, "top-center");

  windowA.getState().setNotificationPreferences({ position: "bottom-left", durationMs: 9000 });
  // Window A's store broadcasts from its subscribe callback; drain to window B.
  await Promise.resolve();
  hub.drain();

  assert.equal(windowB.getState().notificationPreferences.position, "bottom-left");
  assert.equal(windowB.getState().notificationPreferences.durationMs, 9000);
});

test("a partial events patch keeps the other event toggles", () => {
  const merged = mergeTaskNotificationPreferences(DEFAULT_TASK_NOTIFICATION_PREFERENCES, {
    events: { failed: false } as never,
  });
  assert.equal(merged.events.failed, false);
  assert.equal(merged.events.completed, true);
  assert.equal(merged.events.permission, true);
  assert.equal(merged.events.subagentStalled, true);
});
