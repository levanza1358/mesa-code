// Covers docs/specs/notification-settings.md rule 9 (custom sound owner): the uploaded sound is a
// single localStorage-owned value with a name, and clearing it falls back to the preset path.
import assert from "node:assert/strict";
import test from "node:test";
import {
  clearCustomNotificationSound,
  isSupportedNotificationSoundFile,
  persistCustomNotificationSound,
  readCustomNotificationSound,
} from "../src/lib/notificationSoundCustom.js";

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

test("nothing stored reads as null", () => {
  assert.equal(readCustomNotificationSound(), null);
});

test("a persisted custom sound round-trips with its name", () => {
  persistCustomNotificationSound({ dataUrl: "data:audio/wav;base64,AAAA", name: "my.wav" });
  assert.deepEqual(readCustomNotificationSound(), {
    dataUrl: "data:audio/wav;base64,AAAA",
    name: "my.wav",
  });
});

test("clearing falls back to null (the preset path)", () => {
  persistCustomNotificationSound({ dataUrl: "data:audio/mpeg;base64,BBBB", name: "x.mp3" });
  clearCustomNotificationSound();
  assert.equal(readCustomNotificationSound(), null);
});

test("a stored value that is not a data URL is rejected", () => {
  localStorage.setItem("mesa-code-notification-sound-custom", "https://example.com/x.mp3");
  assert.equal(readCustomNotificationSound(), null);
});

test("file support accepts audio MIME types and known extensions", () => {
  assert.equal(isSupportedNotificationSoundFile({ type: "audio/mpeg", name: "a" }), true);
  assert.equal(isSupportedNotificationSoundFile({ type: "", name: "a.WAV" }), true);
  assert.equal(isSupportedNotificationSoundFile({ type: "", name: "a.ogg" }), true);
  assert.equal(isSupportedNotificationSoundFile({ type: "", name: "notes.txt" }), false);
  assert.equal(isSupportedNotificationSoundFile({ type: "", name: "image.png" }), false);
});
