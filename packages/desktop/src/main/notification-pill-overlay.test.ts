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
  notificationPillPanelBounds,
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
  const panel = new FakeWindow();
  panel.webContents.id = 3;
  let focused = false;
  const timers = new Set<() => void>();
  const scheduledDelays: number[] = [];
  const owner = createNotificationPillOverlay({
    platform,
    ipcMain: ipc as never,
    screen: display as never,
    createWindow: () => overlay as never,
    loadWindow: async () => {
      if (loadFailure) throw new Error("synthetic load failure");
    },
    createPanelWindow: () => panel as never,
    loadPanelWindow: async () => {
      if (loadFailure) throw new Error("synthetic load failure");
    },
    isMainRenderer: (id) => id === 1,
    sourceWindow: () => source as never,
    isAppFocused: () => focused,
    warn: () => {},
    schedule: ((callback: () => void, delayMs: number) => {
      timers.add(callback);
      scheduledDelays.push(delayMs);
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
  const reveal = (token = "token") =>
    ipc.emit(
      NotificationPillChannels.action,
      { sender: overlay.webContents, senderFrame: overlay.webContents.mainFrame },
      { token, action: "reveal" },
    );
  const answerFromPanel = (
    token = "token",
    answers: Array<{ question: string; values: string[] }> | undefined = [
      { question: "Which library should we use?", values: ["a"] },
    ],
    sender = panel.webContents,
  ) =>
    ipc.emit(
      NotificationPillChannels.action,
      { sender, senderFrame: sender.mainFrame },
      { token, action: "answer", ...(answers ? { answers } : {}) },
    );
  return {
    source,
    overlay,
    panel,
    ipc,
    display,
    owner,
    publish,
    act,
    reveal,
    answerFromPanel,
    timers,
    scheduledDelays,
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

// docs/specs/notification-settings.md rule 6: the pill anchors at the configured position, and an
// absent position keeps the legacy top-center placement.
test("notificationPillBounds honors the configured anchor", () => {
  const area = { x: 0, y: 0, width: 1920, height: 1080 };
  // Legacy default: centered horizontally, 8px from the top.
  assert.deepEqual(notificationPillBounds(area), {
    x: 700,
    y: 8,
    width: 520,
    height: 180,
  });
  assert.deepEqual(notificationPillBounds(area, "top-center"), notificationPillBounds(area));
  // top-right: right-aligned with a 12px margin.
  assert.deepEqual(notificationPillBounds(area, "top-right"), {
    x: 1388,
    y: 8,
    width: 520,
    height: 180,
  });
  // bottom-center: centered, 8px from the bottom.
  assert.deepEqual(notificationPillBounds(area, "bottom-center"), {
    x: 700,
    y: 892,
    width: 520,
    height: 180,
  });
  // bottom-left: left-aligned with a 12px margin, bottom-anchored.
  assert.deepEqual(notificationPillBounds(area, "bottom-left"), {
    x: 12,
    y: 892,
    width: 520,
    height: 180,
  });
});

// docs/specs/notification-settings.md rule 6: a status pill auto-dismisses after its configured
// duration; without one it keeps the legacy 8000 ms.
test("status pill auto-dismiss uses the configured duration when present", async () => {
  const withDuration = harness();
  withDuration.publish({ ...presentation("status", "status"), durationMs: 12000 });
  await Promise.resolve();
  assert.deepEqual(withDuration.scheduledDelays, [12000]);
  withDuration.owner.dispose();

  const withoutDuration = harness();
  withoutDuration.publish(presentation("status", "status"));
  await Promise.resolve();
  assert.deepEqual(withoutDuration.scheduledDelays, [8000]);
  withoutDuration.owner.dispose();
});

function userInputPresentation(
  token = "question",
): NotificationPillPresentation {
  return {
    ...presentation(token, "permission"),
    answerPrompt: {
      showLabel: "Show answer",
      submitLabel: "Submit answer",
      questions: [
        {
          question: "Which library should we use?",
          header: "Library",
          multiSelect: false,
          options: [
            { value: "a", label: "Option A" },
            { value: "b", label: "Option B" },
          ],
        },
      ],
    },
  };
}

test("reveal opens the answer panel under the pill; a selection relays from the panel", async () => {
  const h = harness();
  h.publish(userInputPresentation());
  await Promise.resolve();
  assert.equal(h.panel.shown, false, "panel stays closed until revealed");
  h.reveal("stale");
  h.reveal("question");
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(h.panel.shown, true, "reveal opens the panel");
  assert.equal(h.owner.ownsWindow(h.panel), true);
  // The panel is only reachable from the compact pill when the presentation has an answer surface.
  const noPrompt = harness();
  noPrompt.publish(presentation("token", "permission"));
  await Promise.resolve();
  noPrompt.reveal();
  await Promise.resolve();
  assert.equal(noPrompt.panel.shown, false);
  noPrompt.owner.dispose();
  // Answering from the panel relays the selections to the owning renderer.
  h.answerFromPanel("question", [{ question: "Which library should we use?", values: ["a"] }]);
  await Promise.resolve();
  assert.equal(h.source.sent.length, 1);
  assert.equal(h.source.sent[0][0], NotificationPillChannels.reply);
  const reply = h.source.sent[0][1] as { answers: unknown; action: string };
  assert.equal(reply.action, "answer");
  assert.deepEqual(reply.answers, [{ question: "Which library should we use?", values: ["a"] }]);
  assert.equal(h.source.restored, false, "answering must not restore the source");
  // Not an overlay sender: rejected.
  h.answerFromPanel("question", undefined, h.source.webContents);
  assert.equal(h.source.sent.length, 1);
  h.owner.dispose();
});

test("resolving, focusing, or replacing clears the panel with the pill", async () => {
  const focused = harness();
  focused.publish(userInputPresentation());
  await Promise.resolve();
  focused.reveal("question");
  await Promise.resolve();
  assert.equal(focused.panel.shown, true);
  focused.focus();
  assert.equal(focused.panel.shown, false, "app focus hides the panel");
  assert.equal(focused.overlay.shown, false);
  focused.owner.dispose();
  // A replacement presentation collapses an open panel again.
  const replaced = harness();
  replaced.publish(userInputPresentation());
  await Promise.resolve();
  replaced.reveal("question");
  await Promise.resolve();
  assert.equal(replaced.panel.shown, true);
  replaced.publish(userInputPresentation("next"));
  await Promise.resolve();
  assert.equal(replaced.panel.shown, false, "a replacement presentation collapses the panel");
  replaced.owner.dispose();
});

test("panel bounds sit under the pill and flip above on bottom overflow", () => {
  const area = { x: 0, y: 0, width: 1000, height: 700 };
  const topPill = { x: 240, y: 8, width: 520, height: 180 };
  assert.deepEqual(notificationPillPanelBounds(topPill, area), {
    x: 240,
    y: 192,
    width: 520,
    height: 360,
  });
  // Bottom-anchored pill overflows; the panel flips above it.
  const bottomPill = { x: 240, y: 512, width: 520, height: 180 };
  assert.deepEqual(notificationPillPanelBounds(bottomPill, area), {
    x: 240,
    y: 148,
    width: 520,
    height: 360,
  });
});
