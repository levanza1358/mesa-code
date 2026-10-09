import type { IPlatformService } from "@mesa-code/shared";

type DesktopBrowserPlatformBridge = Pick<
  IPlatformService,
  | "onBrowserViewReady"
  | "onBrowserViewOperation"
  | "onBrowserViewViewportChanged"
  | "onBrowserViewVisibility"
  | "onBrowserViewCloseTab"
  | "onBrowserViewSuspend"
  | "onBrowserViewRestore"
  | "browserViewAttachGuest"
  | "browserViewDetachGuest"
  | "browserViewCloseTab"
  | "browserViewReportResidency"
  | "browserViewSuspendReady"
  | "browserViewEnsureResident"
  | "browserViewRestoreTabs"
  | "browserViewUpdateViewport"
  | "importChromeBrowserData"
  | "clearEmbeddedBrowserData"
  | "getPathForFile"
  | "saveFile"
  | "printPageToPdf"
>;

// Rebase 集成：browser bridge 若继续内联在 renderer 入口，会让入口越过 max-lines 门禁。
// 独立对象只做 preload 委托与旧 bridge 兼容兜底，不持有 Browser 业务状态。
export const desktopBrowserPlatformBridge = {
  getPathForFile: (file) => window.mesaCode?.getPathForFile?.(file) ?? null,
  saveFile: (payload) =>
    window.mesaCode?.saveFile?.(payload) ?? Promise.resolve({ success: false, error: "not_supported" }),
  // 条件定义而非兜底返回失败：UI 靠方法是否存在做能力检测，旧 preload 下必须保持 undefined
  printPageToPdf: window.mesaCode?.printPageToPdf ? () => window.mesaCode.printPageToPdf!() : undefined,
  onBrowserViewReady: (handler) => window.mesaCode.onBrowserViewReady?.(handler) ?? (() => {}),
  onBrowserViewOperation: (handler) => window.mesaCode.onBrowserViewOperation?.(handler) ?? (() => {}),
  onBrowserViewViewportChanged: (handler) =>
    window.mesaCode.onBrowserViewViewportChanged?.(handler) ?? (() => {}),
  onBrowserViewVisibility: (handler) =>
    window.mesaCode.onBrowserViewVisibility?.(handler) ?? (() => {}),
  onBrowserViewCloseTab: (handler) => window.mesaCode.onBrowserViewCloseTab?.(handler) ?? (() => {}),
  onBrowserViewSuspend: (handler) => window.mesaCode.onBrowserViewSuspend?.(handler) ?? (() => {}),
  onBrowserViewRestore: (handler) => window.mesaCode.onBrowserViewRestore?.(handler) ?? (() => {}),
  browserViewAttachGuest: (payload) =>
    window.mesaCode.browserViewAttachGuest?.(payload) ??
    Promise.resolve({ ok: false, reason: "not-found", recoveryRequested: false }),
  browserViewDetachGuest: (payload) =>
    window.mesaCode.browserViewDetachGuest?.(payload) ?? Promise.resolve(false),
  browserViewCloseTab: (payload) =>
    window.mesaCode.browserViewCloseTab?.(payload) ?? Promise.resolve(),
  browserViewReportResidency: (payload) =>
    window.mesaCode.browserViewReportResidency?.(payload) ?? Promise.resolve(),
  browserViewSuspendReady: (payload) =>
    window.mesaCode.browserViewSuspendReady?.(payload) ?? Promise.resolve(),
  browserViewEnsureResident: (payload) =>
    window.mesaCode.browserViewEnsureResident?.(payload) ?? Promise.resolve(),
  browserViewRestoreTabs: (payload) =>
    window.mesaCode.browserViewRestoreTabs?.(payload) ?? Promise.resolve([]),
  browserViewUpdateViewport: (payload) =>
    window.mesaCode.browserViewUpdateViewport?.(payload) ?? Promise.resolve(),
  importChromeBrowserData: (options) =>
    window.mesaCode.importChromeBrowserData?.(options) ??
    Promise.resolve({
      success: false,
      cookies: { imported: 0, skipped: 0, failed: 0 },
      localStorage: {
        originsImported: 0,
        entriesImported: 0,
        originsSkipped: 0,
        originsFailed: 0,
      },
      error: "unsupported",
    }),
  clearEmbeddedBrowserData: (mode) =>
    window.mesaCode.clearEmbeddedBrowserData?.(mode) ??
    Promise.resolve({ success: false, error: "unsupported" }),
} satisfies DesktopBrowserPlatformBridge;
