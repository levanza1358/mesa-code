import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import {
  NotificationPillChannels,
  PlatformChannels,
  notificationPillPublicationSchema,
  notificationPillActionReplySchema,
  type NotificationPillPresentation,
} from "@mesa-code/shared";
import {
  createNotificationPillOverlay,
  notificationPillBounds,
} from "./notification-pill-overlay.js";

class FakeWindow extends EventEmitter {
  webContents = Object.assign(new EventEmitter(), {
    id: 1,
    mainFrame: {},
    send: (...args: unknown[]) => this.sent.push(args),
    setWindowOpenHandler: () => {},
  });
  sent: unknown[][] = [];
  shown = false;
  destroyed = false;
  restored = false;
  focused = false;
  bounds = { x: 0, y: 0, width: 800, height: 600 };
  isDestroyed() {
    return this.destroyed;
  }
  hide() {
    this.shown = false;
  }
  showInactive() {
    this.shown = true;
  }
  show() {
    this.shown = true;
  }
  setAlwaysOnTop() {}
  setBounds(bounds: typeof this.bounds) {
    this.bounds = bounds;
  }
  getBounds() {
    return this.bounds;
  }
  isMinimized() {
    return true;
  }
  restore() {
    this.restored = true;
  }
  focus() {
    this.focused = true;
  }
  destroy() {
    this.destroyed = true;
    this.emit("closed");
  }
}
const presentation = (
  token = "token",
  kind: "permission" | "status" = "permission",
): NotificationPillPresentation => ({
  token,
  kind,
  context: {
    taskId: "session",
    workspacePath: "C:/synthetic",
    workspaceIdentity: "remote",
    remoteSessionId: "attachment",
    requestId: "request",
    logEpoch: "epoch",
    revision: 2,
  },
  title: "Permission required",
  body: "Read synthetic file?",
  preview: "Answer preview",
  openLabel: "Open app",
  error: "",
  busy: false,
  options: [
    { optionId: "original-allow", kind: "allowOnce", label: "Allow once" },
    { optionId: "original-deny", kind: "deny", label: "Deny" },
  ],
  appearance: {
    background: "#111",
    foreground: "#fff",
    border: "#888",
    accent: "#0a0",
    fontSize: "14px",
  },
});
function harness(platform = "win32", loadFailure = false) {
  const ipc = new EventEmitter();
  const display = new EventEmitter();
  Object.assign(display, {
    getDisplayMatching: () => ({ workArea: { x: -800, y: 0, width: 800, height: 600 } }),
  });
  const source = new FakeWindow();
  const overlay = new FakeWindow();
  overlay.webContents.id = 2;
  let focused = false;
  const timers = new Set<() => void>();
  const owner = createNotificationPillOverlay({
    platform,
    ipcMain: ipc as never,
    screen: display as never,
    createWindow: () => overlay as never,
    loadWindow: async () => {
      if (loadFailure) throw new Error("synthetic load failure");
    },
    isMainRenderer: (id) => id === 1,
    sourceWindow: () => source as never,
    isAppFocused: () => focused,
    warn: () => {},
    schedule: ((callback: () => void) => {
      timers.add(callback);
      return callback;
    }) as never,
    cancel: ((callback: () => void) => timers.delete(callback)) as never,
  });
  const publish = (value = presentation(), sender = source.webContents) =>
    ipc.emit(
      NotificationPillChannels.publish,
      { sender, senderFrame: sender.mainFrame },
      { token: value.token, presentation: value },
    );
  const act = (
    token = "token",
    optionId = "original-allow",
    sender = overlay.webContents,
    action = "answer",
  ) =>
    ipc.emit(
      NotificationPillChannels.action,
      { sender, senderFrame: sender.mainFrame },
      { token, ...(optionId ? { optionId } : {}), action },
    );
  return {
    source,
    overlay,
    ipc,
    display,
    owner,
    publish,
    act,
    timers,
    focus: () => {
      focused = true;
      owner.onAppFocus();
    },
  };
}

test("sender authentication, stale clicks, original option IDs and no app restore on answer", async () => {
  const h = harness();
  h.publish(presentation(), h.overlay.webContents);
  assert.equal(h.overlay.shown, false);
  h.publish();
  await Promise.resolve();
  assert.equal(h.overlay.shown, true);
  assert.equal(h.owner.ownsWindow(h.overlay), true);
  h.act("stale");
  h.act("token", "fabricated");
  h.act("token", "original-allow", h.source.webContents);
  assert.equal(h.source.sent.length, 0);
  h.act();
  h.act();
  assert.equal(h.source.sent.length, 1);
  assert.equal(h.source.sent[0][0], NotificationPillChannels.reply);
  assert.equal(h.source.restored, false);
  const reply = h.source.sent[0][1] as { context: unknown };
  assert.deepEqual(reply.context, presentation().context);
  assert.equal(notificationPillActionReplySchema.safeParse(reply).success, true);
  assert.equal(
    notificationPillActionReplySchema.safeParse({ ...reply, injected: true }).success,
    false,
  );
  assert.equal(
    notificationPillActionReplySchema.safeParse({
      ...reply,
      context: { ...presentation().context, injected: true },
    }).success,
    false,
  );
  h.publish({ ...presentation(), busy: false, error: "Retry" });
  h.act();
  assert.equal(h.source.sent.length, 2, "failure can retry");
  h.owner.dispose();
});
test("subframe and missing-frame senders cannot publish, clear or answer", async () => {
  const h = harness();
  const value = presentation();
  for (const senderFrame of [null, undefined, {}]) {
    h.ipc.emit(
      NotificationPillChannels.publish,
      { sender: h.source.webContents, senderFrame },
      { token: value.token, presentation: value },
    );
  }
  await Promise.resolve();
  assert.equal(h.overlay.shown, false);
  h.publish();
  await Promise.resolve();
  for (const senderFrame of [null, undefined, {}]) {
    h.ipc.emit(
      NotificationPillChannels.publish,
      { sender: h.source.webContents, senderFrame },
      { token: value.token },
    );
    h.ipc.emit(
      NotificationPillChannels.action,
      { sender: h.overlay.webContents, senderFrame },
      { token: value.token, action: "answer", optionId: "original-allow" },
    );
  }
  assert.equal(h.overlay.shown, true);
  assert.equal(h.source.sent.length, 0);
  h.act();
  assert.equal(h.source.sent.length, 1);
  h.owner.dispose();
});
test("permission survives status; resolved elsewhere, disabled/unmounted clear exact token", async () => {
  const h = harness();
  h.publish();
  await Promise.resolve();
  assert.equal(h.timers.size, 0);
  h.publish(presentation("status", "status"));
  assert.equal(
    (h.overlay.sent[h.overlay.sent.length - 1][1] as NotificationPillPresentation).token,
    "token",
  );
  h.ipc.emit(
    NotificationPillChannels.publish,
    { sender: h.source.webContents, senderFrame: h.source.webContents.mainFrame },
    { token: "stale" },
  );
  assert.equal(h.overlay.shown, true);
  h.ipc.emit(
    NotificationPillChannels.publish,
    { sender: h.source.webContents, senderFrame: h.source.webContents.mainFrame },
    { token: "token" },
  );
  assert.equal(h.overlay.shown, false);
  h.act();
  assert.equal(h.source.sent.length, 0);
  h.publish(presentation("next"));
  h.source.webContents.emit("did-start-loading");
  assert.equal(h.overlay.shown, false);
  h.publish(presentation("again"));
  h.source.webContents.emit("render-process-gone");
  assert.equal(h.overlay.shown, false);
  h.owner.dispose();
});
test("focus hides; status expires; open restores exact source; dispose removes listeners", async () => {
  const h = harness();
  h.publish(presentation("status", "status"));
  await Promise.resolve();
  assert.equal(h.timers.size, 1);
  h.act("status", "", h.overlay.webContents, "open");
  assert.equal(h.source.restored, true);
  assert.equal(h.source.focused, true);
  assert.deepEqual(h.source.sent.at(-1), [PlatformChannels.TaskNotificationClick, "session"]);
  h.publish(presentation("status2", "status"));
  for (const callback of h.timers) callback();
  assert.equal(h.overlay.shown, false);
  h.publish(presentation("status2", "status"));
  assert.equal(h.overlay.shown, false, "theme refresh must not resurrect expired token");
  h.publish();
  h.focus();
  assert.equal(h.overlay.shown, false);
  h.publish(presentation("focused"));
  assert.equal(h.overlay.shown, false);
  h.owner.dispose();
  assert.equal(h.ipc.listenerCount(NotificationPillChannels.publish), 0);
  assert.equal(h.display.listenerCount("display-removed"), 0);
  assert.equal(h.source.webContents.listenerCount("did-start-loading"), 0);
});
test("load failure and source destruction fail hidden", async () => {
  const failed = harness("win32", true);
  failed.publish();
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(failed.overlay.shown, false);
  assert.equal(failed.overlay.destroyed, true);
  failed.owner.dispose();
  const closed = harness();
  closed.publish();
  await Promise.resolve();
  closed.source.destroy();
  assert.equal(closed.overlay.shown, false);
  closed.act();
  assert.equal(closed.source.sent.length, 0);
  closed.owner.dispose();
});
test("non-Windows and strict validation fail hidden; positioning clamps negative display", async () => {
  const h = harness("linux");
  h.publish();
  await Promise.resolve();
  assert.equal(h.overlay.shown, false);
  h.owner.dispose();
  assert.equal(
    notificationPillPublicationSchema.safeParse({
      token: "x",
      presentation: presentation(),
      injected: true,
    }).success,
    false,
  );
  assert.deepEqual(notificationPillBounds({ x: -200, y: -100, width: 200, height: 100 }), {
    x: -200,
    y: -100,
    width: 200,
    height: 100,
  });
});
