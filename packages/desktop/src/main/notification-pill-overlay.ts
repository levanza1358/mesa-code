import type { BrowserWindow, IpcMain, IpcMainEvent, Rectangle, Screen } from "electron";
import {
  NotificationPillChannels,
  PlatformChannels,
  notificationPillActionSchema,
  notificationPillPublicationSchema,
  type NotificationPillPosition,
  type NotificationPillPresentation,
} from "@mesa-code/shared";

const PILL_VERTICAL_MARGIN = 8;
const PILL_HORIZONTAL_MARGIN = 12;
const DEFAULT_PILL_DURATION_MS = 8000;
const PANEL_GAP = 4;
const PANEL_MAX_HEIGHT = 360;

interface Options {
  platform: string;
  ipcMain: Pick<IpcMain, "on" | "removeListener">;
  screen: Pick<Screen, "getDisplayMatching" | "on" | "removeListener">;
  createWindow: () => BrowserWindow;
  loadWindow: (window: BrowserWindow) => Promise<void>;
  // The taller answer panel is a second host-less window owned here; created lazily on reveal.
  createPanelWindow: () => BrowserWindow;
  loadPanelWindow: (window: BrowserWindow) => Promise<void>;
  isMainRenderer: (id: number) => boolean;
  sourceWindow: (event: IpcMainEvent) => BrowserWindow | null;
  isAppFocused: () => boolean;
  warn: (message: string) => void;
  schedule?: typeof setTimeout;
  cancel?: typeof clearTimeout;
}

/**
 * Anchors the pill inside a display work area. The position is a renderer preference
 * (docs/specs/notification-settings.md rule 6); an absent position keeps the legacy top-center
 * anchor, so an older renderer that does not send one behaves exactly as before.
 */
export function notificationPillBounds(
  area: Rectangle,
  position: NotificationPillPosition = "top-center",
): Rectangle {
  const width = Math.min(520, area.width);
  const height = Math.min(180, area.height);
  const centeredX = Math.round(area.x + (area.width - width) / 2);
  const rightX = Math.round(area.x + area.width - width - PILL_HORIZONTAL_MARGIN);
  const leftX = area.x + PILL_HORIZONTAL_MARGIN;
  const bottomY = Math.max(area.y, area.y + area.height - height - PILL_VERTICAL_MARGIN);
  const topY = area.y + Math.min(PILL_VERTICAL_MARGIN, Math.max(0, area.height - height));
  const isBottom = position === "bottom-center" || position === "bottom-left";
  const x =
    position === "top-right" ? rightX : position === "bottom-left" ? leftX : centeredX;
  return { width, height, x, y: isBottom ? bottomY : topY };
}

/**
 * Places the answer panel directly under the pill, clamped into the sender display work area; when
 * it would overflow the bottom edge it flips above the pill. The panel matches the pill's width so
 * the two read as one stack.
 */
export function notificationPillPanelBounds(pill: Rectangle, area: Rectangle): Rectangle {
  const width = Math.min(pill.width, area.width);
  const maxHeight = Math.max(120, area.height - pill.height - 2 * PILL_VERTICAL_MARGIN);
  const height = Math.min(PANEL_MAX_HEIGHT, maxHeight);
  const below = pill.y + pill.height + PANEL_GAP;
  const overflowsBottom = below + height > area.y + area.height - PILL_VERTICAL_MARGIN;
  const y = overflowsBottom
    ? Math.max(area.y + PILL_VERTICAL_MARGIN, pill.y - height - PANEL_GAP)
    : below;
  const maxX = area.x + area.width - width - PILL_HORIZONTAL_MARGIN;
  const x = Math.min(Math.max(pill.x, area.x + PILL_HORIZONTAL_MARGIN), maxX);
  return { width, height, x, y };
}

export function createNotificationPillOverlay(options: Options) {
  let window: BrowserWindow | null = null;
  let panelWindow: BrowserWindow | null = null;
  const ownedWindows = new WeakSet<object>();
  let ready = false;
  let panelReady = false;
  let panelOpen = false;
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
    panelOpen = false;
    if (window && !window.isDestroyed()) window.hide();
    if (panelWindow && !panelWindow.isDestroyed()) panelWindow.hide();
  }
  function panelBounds(): Rectangle | null {
    if (!current || !window || window.isDestroyed()) return null;
    return notificationPillPanelBounds(
      window.getBounds(),
      options.screen.getDisplayMatching(current.source.getBounds()).workArea,
    );
  }
  function reposition() {
    if (!current || !window || window.isDestroyed() || current.source.isDestroyed()) return;
    window.setBounds(
      notificationPillBounds(
        options.screen.getDisplayMatching(current.source.getBounds()).workArea,
        current.presentation.position,
      ),
    );
    renderPanel();
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
  function renderPanel() {
    if (!panelOpen || !panelReady || !panelWindow || panelWindow.isDestroyed() || !current) return;
    const bounds = panelBounds();
    if (!bounds) return;
    panelWindow.setBounds(bounds);
    panelWindow.webContents.send(NotificationPillChannels.panelState, current.presentation);
    panelWindow.showInactive();
    panelWindow.setAlwaysOnTop(true, "screen-saver");
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
  function ensurePanelWindow() {
    if (panelWindow && !panelWindow.isDestroyed()) {
      renderPanel();
      return;
    }
    try {
      const target = options.createPanelWindow();
      panelWindow = target;
      ownedWindows.add(target);
      panelReady = false;
      target.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
      target.webContents.on("will-navigate", (event) => event.preventDefault());
      target.once("closed", () => {
        if (panelWindow === target) {
          panelWindow = null;
          panelReady = false;
          panelOpen = false;
        }
      });
      void options
        .loadPanelWindow(target)
        .then(() => {
          if (disposed || target !== panelWindow || target.isDestroyed() || !panelOpen) return;
          panelReady = true;
          renderPanel();
        })
        .catch(() => {
          options.warn("[notification-pill] panel renderer load failed");
          if (target === panelWindow) {
            panelWindow = null;
            panelReady = false;
            panelOpen = false;
          }
          if (!target.isDestroyed()) target.destroy();
        });
    } catch {
      panelOpen = false;
      options.warn("[notification-pill] panel window creation failed");
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
    // A new presentation collapses any open answer panel; a same-token refresh (busy/error update)
    // keeps the panel open so a failed submit shows its retry error in place.
    if (replaced) {
      panelOpen = false;
      if (panelWindow && !panelWindow.isDestroyed()) panelWindow.hide();
    }
    if (replaced) {
      if (timer) cancel(timer);
      timer = undefined;
      if (presentation.kind === "status")
        timer = schedule(clear, presentation.durationMs ?? DEFAULT_PILL_DURATION_MS);
    }
    if (replaced || !ready) ensureWindow();
    else render();
  }
  function action(event: IpcMainEvent, payload: unknown) {
    const fromPill =
      window && !window.isDestroyed() && event.sender === window.webContents;
    const fromPanel =
      panelWindow && !panelWindow.isDestroyed() && event.sender === panelWindow.webContents;
    if (
      disposed ||
      (!fromPill && !fromPanel) ||
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
    if (parsed.data.action === "reveal") {
      // Only the compact pill reveals the panel, and only when it carries an answer surface.
      if (!fromPill || !presentation.answerPrompt) return;
      panelOpen = true;
      ensurePanelWindow();
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
    if (presentation.busy || presentation.kind !== "permission") return;
    const isUserInput = Boolean(presentation.answerPrompt);
    if (isUserInput) {
      if (!parsed.data.answers || parsed.data.answers.length === 0) return;
    } else if (!presentation.options.some((option) => option.optionId === parsed.data.optionId)) {
      return;
    }
    // Any pixel being at the app-window level at least once is enough; an unresolved pill keeps its
    // cached presentation busy so a same-token refresh does not clear it.
    presentation.busy = true;
    render();
    if (presentation.kind === "permission" && panelOpen) renderPanel();
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
      if (panelWindow && !panelWindow.isDestroyed()) panelWindow.destroy();
      window = null;
      panelWindow = null;
    },
  };
}
