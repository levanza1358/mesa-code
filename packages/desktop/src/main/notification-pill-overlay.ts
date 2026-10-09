import type { BrowserWindow, IpcMain, IpcMainEvent, Rectangle, Screen } from "electron";
import {
  NotificationPillChannels,
  PlatformChannels,
  notificationPillActionSchema,
  notificationPillPublicationSchema,
  type NotificationPillPresentation,
} from "@mesa-code/shared";

interface Options {
  platform: string;
  ipcMain: Pick<IpcMain, "on" | "removeListener">;
  screen: Pick<Screen, "getDisplayMatching" | "on" | "removeListener">;
  createWindow: () => BrowserWindow;
  loadWindow: (window: BrowserWindow) => Promise<void>;
  isMainRenderer: (id: number) => boolean;
  sourceWindow: (event: IpcMainEvent) => BrowserWindow | null;
  isAppFocused: () => boolean;
  warn: (message: string) => void;
  schedule?: typeof setTimeout;
  cancel?: typeof clearTimeout;
}

export function notificationPillBounds(area: Rectangle): Rectangle {
  const width = Math.min(520, area.width);
  const height = Math.min(180, area.height);
  return {
    width,
    height,
    x: Math.round(area.x + (area.width - width) / 2),
    y: area.y + Math.min(8, Math.max(0, area.height - height)),
  };
}

export function createNotificationPillOverlay(options: Options) {
  let window: BrowserWindow | null = null;
  const ownedWindows = new WeakSet<object>();
  let ready = false;
  let disposed = false;
  let current: { source: BrowserWindow; presentation: NotificationPillPresentation } | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const schedule = options.schedule ?? setTimeout;
  const cancel = options.cancel ?? clearTimeout;
  const watched = new Map<BrowserWindow, { invalidate: () => void; closed: () => void }>();
  // Bounded tombstones stop theme refresh from resurrecting a dismissed presentation.
  const dismissed = new Set<string>();

  function clear() {
    if (current) {
      dismissed.add(current.presentation.token);
      if (dismissed.size > 128) dismissed.delete(dismissed.values().next().value!);
    }
    if (timer) cancel(timer);
    timer = undefined;
    current = null;
    if (window && !window.isDestroyed()) window.hide();
  }
  function reposition() {
    if (!current || !window || window.isDestroyed() || current.source.isDestroyed()) return;
    window.setBounds(
      notificationPillBounds(
        options.screen.getDisplayMatching(current.source.getBounds()).workArea,
      ),
    );
  }
  function render() {
    if (!current || !window || !ready || window.isDestroyed()) return;
    if (current.source.isDestroyed() || options.isAppFocused()) {
      clear();
      return;
    }
    reposition();
    window.webContents.send(NotificationPillChannels.state, current.presentation);
    window.showInactive();
    window.setAlwaysOnTop(true, "screen-saver");
  }
  function ensureWindow() {
    if (window && !window.isDestroyed()) {
      render();
      return;
    }
    try {
      const target = options.createWindow();
      window = target;
      ownedWindows.add(target);
      ready = false;
      target.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
      target.webContents.on("will-navigate", (event) => event.preventDefault());
      target.once("closed", () => {
        if (window === target) {
          window = null;
          ready = false;
          clear();
        }
      });
      void options
        .loadWindow(target)
        .then(() => {
          if (disposed || target !== window || target.isDestroyed()) return;
          ready = true;
          render();
        })
        .catch(() => {
          options.warn("[notification-pill] renderer load failed");
          if (target === window) {
            clear();
            window = null;
            ready = false;
          }
          if (!target.isDestroyed()) target.destroy();
        });
    } catch {
      clear();
      options.warn("[notification-pill] window creation failed");
    }
  }
  function publish(event: IpcMainEvent, payload: unknown) {
    // WebContents identity also covers subframes; only the trusted main frame may publish.
    if (
      disposed ||
      options.platform !== "win32" ||
      !options.isMainRenderer(event.sender.id) ||
      !event.senderFrame ||
      event.senderFrame !== event.sender.mainFrame
    )
      return;
    const parsed = notificationPillPublicationSchema.safeParse(payload);
    if (!parsed.success) return;
    const source = options.sourceWindow(event);
    if (!source || source.isDestroyed()) return;
    const { token, presentation } = parsed.data;
    if (!presentation) {
      if (current?.source === source && current.presentation.token === token) clear();
      return;
    }
    if (dismissed.has(token)) return;
    if (options.isAppFocused()) {
      dismissed.add(token);
      if (dismissed.size > 128) dismissed.delete(dismissed.values().next().value!);
      clear();
      return;
    }
    // Unresolved permission remains visible instead of being lost to an unrelated terminal edge.
    if (
      current?.presentation.kind === "permission" &&
      presentation.kind === "status" &&
      current.presentation.token !== token
    )
      return;
    if (!watched.has(source)) {
      const invalidate = () => {
        if (current?.source === source) clear();
      };
      source.webContents.on("did-start-loading", invalidate);
      source.webContents.on("render-process-gone", invalidate);
      const closed = () => {
        invalidate();
        source.webContents.removeListener("did-start-loading", invalidate);
        source.webContents.removeListener("render-process-gone", invalidate);
        watched.delete(source);
      };
      source.once("closed", closed);
      watched.set(source, { invalidate, closed });
    }
    const replaced = current?.presentation.token !== token;
    current = { source, presentation };
    if (replaced) {
      if (timer) cancel(timer);
      timer = undefined;
      if (presentation.kind === "status") timer = schedule(clear, 8000);
    }
    if (replaced || !ready) ensureWindow();
    else render();
  }
  function action(event: IpcMainEvent, payload: unknown) {
    if (
      disposed ||
      !window ||
      window.isDestroyed() ||
      event.sender !== window.webContents ||
      !event.senderFrame ||
      event.senderFrame !== event.sender.mainFrame ||
      !current
    )
      return;
    const parsed = notificationPillActionSchema.safeParse(payload);
    if (!parsed.success || parsed.data.token !== current.presentation.token) return;
    const { source, presentation } = current;
    if (
      source.isDestroyed() ||
      !options.isMainRenderer(source.webContents.id) ||
      options.isAppFocused()
    ) {
      clear();
      return;
    }
    if (parsed.data.action === "open") {
      clear();
      if (source.isMinimized()) source.restore();
      source.show();
      source.focus();
      source.webContents.send(PlatformChannels.TaskNotificationClick, presentation.context.taskId);
      return;
    }
    if (
      presentation.busy ||
      presentation.kind !== "permission" ||
      !presentation.options.some((option) => option.optionId === parsed.data.optionId)
    )
      return;
    presentation.busy = true;
    render();
    source.webContents.send(NotificationPillChannels.reply, {
      ...parsed.data,
      context: presentation.context,
    });
  }
  options.ipcMain.on(NotificationPillChannels.publish, publish);
  options.ipcMain.on(NotificationPillChannels.action, action);
  options.screen.on("display-metrics-changed", reposition);
  options.screen.on("display-added", reposition);
  options.screen.on("display-removed", reposition);
  return {
    ownsWindow: (candidate: object) => ownedWindows.has(candidate),
    onAppFocus: clear,
    dispose() {
      disposed = true;
      clear();
      options.ipcMain.removeListener(NotificationPillChannels.publish, publish);
      options.ipcMain.removeListener(NotificationPillChannels.action, action);
      options.screen.removeListener("display-metrics-changed", reposition);
      options.screen.removeListener("display-added", reposition);
      options.screen.removeListener("display-removed", reposition);
      for (const [source, { invalidate, closed }] of watched) {
        source.webContents.removeListener("did-start-loading", invalidate);
        source.webContents.removeListener("render-process-gone", invalidate);
        source.removeListener("closed", closed);
      }
      watched.clear();
      dismissed.clear();
      if (window && !window.isDestroyed()) window.destroy();
      window = null;
    },
  };
}
