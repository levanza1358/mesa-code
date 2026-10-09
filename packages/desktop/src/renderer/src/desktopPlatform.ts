import { recordArmsCustomEventForE2E } from "@mesa-code/ui";
import {
  DesktopCommandIds,
  buildLocalMediaPreviewUrl,
  type IPlatformService,
} from "@mesa-code/shared";

import { desktopBrowserPlatformBridge } from "./desktopBrowserPlatformBridge.js";

export function createDesktopPlatform(options: {
  isLocalDevelopmentRuntime: boolean;
}): IPlatformService {
  return {
    canSelectFilePath: true,
    createLocalMediaPreviewUrl: buildLocalMediaPreviewUrl,
    isLocalDevelopmentRuntime: options.isLocalDevelopmentRuntime,
    selectDirectory: () => window.mesaCode.selectDirectory(),
    selectFile: () => window.mesaCode.selectFile(),
    selectFiles: () => window.mesaCode.selectFiles?.() ?? Promise.resolve([]),
    createTempTextAttachment: (payload) => window.mesaCode.createTempTextAttachment(payload),
    onRemoteConnectionLog: (handler) => window.mesaCode.onRemoteConnectionLog(handler),
    onRemoteSessionClosed: (handler) => window.mesaCode.onRemoteSessionClosed(handler),
    activateOrSetWorkspace: (path) =>
      window.mesaCode.activateOrSetWorkspace?.(path) ?? Promise.resolve({ activated: false }),
    connectRemote: (remoteOptions, requestId, context) =>
      window.mesaCode.connectRemote(remoteOptions, requestId, context),
    cancelPendingRemoteConnection: (requestId) =>
      window.mesaCode.cancelPendingRemoteConnection?.(requestId) ?? Promise.resolve(),
    bindRemoteWorkspaceSessionContext: (context) =>
      window.mesaCode.bindRemoteWorkspaceSessionContext?.(context) ?? Promise.resolve(),
    disposeRemoteSession: (sessionId) => window.mesaCode.disposeRemoteSession(sessionId),
    isDockerAvailable: () => window.mesaCode.isDockerAvailable(),
    listWSLDistros: () => window.mesaCode.listWSLDistros(),
    listDockerContainers: () => window.mesaCode.listDockerContainers(),
    listSSHConfigAliases: () => window.mesaCode.listSSHConfigAliases(),
    loadMcpFromUserDirectory: (payload) => window.mesaCode.loadMcpFromUserDirectory(payload),
    saveMcpToUserDirectory: (payload) => window.mesaCode.saveMcpToUserDirectory(payload),
    migrateLegacyCommonMcp: (payload) => window.mesaCode.migrateLegacyCommonMcp(payload),
    openExternal: (url) => window.mesaCode.openExternal(url),
    openFeedback: () => window.mesaCode.executeDesktopCommand(DesktopCommandIds.OpenFeedback),
    openCommunity: () => window.mesaCode.executeDesktopCommand(DesktopCommandIds.OpenCommunity),
    canOpenCommunity: (locale) => window.mesaCode.canOpenCommunity(locale),
    openInFileManager: (path) => window.mesaCode.openInFileManager(path),
    openExternalFile: (path) => window.mesaCode.openExternalFile(path),
    openCuaPermissionOnboarding: window.mesaCode?.openCuaPermissionOnboarding
      ? (permissionOptions) =>
          window.mesaCode.openCuaPermissionOnboarding?.(permissionOptions) ??
          Promise.resolve({ success: false, error: "not_supported" })
      : undefined,
    prepareCuaHelperPermissionDrag: window.mesaCode?.prepareCuaHelperPermissionDrag
      ? () =>
          window.mesaCode.prepareCuaHelperPermissionDrag?.() ??
          Promise.resolve({ success: false, error: "not_supported" })
      : undefined,
    startCuaHelperPermissionDrag: window.mesaCode?.startCuaHelperPermissionDrag
      ? () => window.mesaCode.startCuaHelperPermissionDrag?.()
      : undefined,
    registerOAuthState: (payload) => window.mesaCode.registerOAuthState(payload),
    onOAuthCallback: (callback) => window.mesaCode.onOAuthCallback(callback),
    onPaymentCallback: (callback) => window.mesaCode.onPaymentCallback(callback),
    onShareImport: (callback) => window.mesaCode.onShareImport?.(callback) ?? (() => {}),
    notifyRendererReady: () => window.mesaCode.notifyRendererReady(),
    reportTelemetryEvent: (payload) => window.mesaCode.reportTelemetryEvent(payload),
    reportArmsCustomEvent: (payload) => {
      recordArmsCustomEventForE2E(payload);
      return window.mesaCode.reportArmsCustomEvent(payload);
    },
    getRendererActionTraceConfig: window.mesaCode?.getRendererActionTraceConfig
      ? () => window.mesaCode.getRendererActionTraceConfig!()
      : undefined,
    onRendererActionTraceConfigChanged: window.mesaCode?.onRendererActionTraceConfigChanged
      ? (callback) => window.mesaCode.onRendererActionTraceConfigChanged!(callback)
      : undefined,
    reportLocalTtftBatch: (batch) => window.mesaCode?.reportLocalTtftBatch?.(batch),
    reportRendererActionTraceBatch: window.mesaCode?.reportRendererActionTraceBatch
      ? (batch) => window.mesaCode?.reportRendererActionTraceBatch?.(batch)
      : undefined,
    reportRendererHeapSample: window.mesaCode?.reportRendererHeapSample
      ? (sample) => window.mesaCode?.reportRendererHeapSample?.(sample)
      : undefined,
    presentNotificationPill: (publication) => window.mesaCode.presentNotificationPill(publication),
    onNotificationPillAction: (handler) => window.mesaCode.onNotificationPillAction(handler),
    showTaskNotification: (payload) => window.mesaCode.showTaskNotification(payload),
    syncWindowTabs: (paths) => window.mesaCode.syncWindowTabs(paths),
    syncWindowUnreadCount: (count) => window.mesaCode.syncWindowUnreadCount(count),
    syncActiveTaskSession: (sessionId) => window.mesaCode.syncActiveTaskSession(sessionId),
    syncAppSettings: (patch) => window.mesaCode.syncAppSettings?.(patch),
    setShortcutRecordingActive: (active) => window.mesaCode.setShortcutRecordingActive?.(active),
    onFocusTab: (handler) => window.mesaCode.onFocusTab(handler),
    onNewTab: (handler) => window.mesaCode.onNewTab(handler),
    onCloseActiveContextRequest: (handler) =>
      window.mesaCode.onCloseActiveContextRequest?.(handler) ?? (() => {}),
    onOpenBrowserUrl: (handler) => window.mesaCode.onOpenBrowserUrl?.(handler) ?? (() => {}),
    onBrowserViewScreenshotSurfacePrepare: (handler) =>
      window.mesaCode.onBrowserViewScreenshotSurfacePrepare?.(handler) ?? (() => {}),
    onBrowserViewScreenshotSurfaceRelease: (handler) =>
      window.mesaCode.onBrowserViewScreenshotSurfaceRelease?.(handler) ?? (() => {}),
    browserViewScreenshotSurfaceReady: (payload) =>
      window.mesaCode.browserViewScreenshotSurfaceReady?.(payload),
    ...desktopBrowserPlatformBridge,
    onNewTask: (handler) => window.mesaCode.onNewTask(handler),
    onOpenWorkspace: (handler) => {
      // 开发态或升级后的旧窗口可能仍运行未暴露 onOpenWorkspace 的 preload，
      // renderer 直接调用会在启动时崩溃。这里和 activateOrSetWorkspace 一样做兼容兜底，
      // 缺少该 bridge 时只禁用原生菜单回调，不影响应用继续打开。
      return window.mesaCode.onOpenWorkspace?.(handler) ?? (() => {});
    },
    onOpenWorkspacePath: (handler) => window.mesaCode.onOpenWorkspacePath?.(handler) ?? (() => {}),
    onOpenFeedbackDialog: (handler) =>
      window.mesaCode.onOpenFeedbackDialog?.(handler) ?? (() => {}),
    onOpenTicketsPanel: (handler) => window.mesaCode.onOpenTicketsPanel?.(handler) ?? (() => {}),
    onWindowFullscreenChanged: (handler) => window.mesaCode.onWindowFullscreenChanged(handler),
    getDesktopWindowChromeState: window.mesaCode?.getDesktopWindowChromeState
      ? () => window.mesaCode.getDesktopWindowChromeState!()
      : undefined,
    onDesktopWindowChromeStateChanged: window.mesaCode.onDesktopWindowChromeStateChanged
      ? (handler) => window.mesaCode.onDesktopWindowChromeStateChanged!(handler)
      : undefined,
    getWindowControlsOverlayMetrics: () =>
      window.mesaCode.getWindowControlsOverlayMetrics?.() ?? null,
    onWindowControlsOverlayChanged: (handler) =>
      window.mesaCode.onWindowControlsOverlayChanged?.(handler) ?? (() => {}),
    getDesktopZoomLevel: () =>
      window.mesaCode.getDesktopZoomLevel?.() ?? Promise.resolve({ zoomLevel: 0 }),
    onDesktopZoomLevelChanged: (handler) =>
      window.mesaCode.onDesktopZoomLevelChanged?.(handler) ?? (() => {}),
    onTaskNotificationClick: (handler) => window.mesaCode.onTaskNotificationClick(handler),
    exportLogs: () => window.mesaCode.exportLogs(),
    captureWindowScreenshot: () =>
      window.mesaCode.captureWindowScreenshot?.() ?? Promise.resolve(null),
    onUpdateReady: (callback) => window.mesaCode.onUpdateReady(callback),
    onUpdateCheckResult: (callback) => window.mesaCode.onUpdateCheckResult(callback),
    onUpdateStateChanged: (callback) =>
      window.mesaCode.onUpdateStateChanged?.(callback) ?? (() => {}),
    getUpdateState: () =>
      window.mesaCode.getUpdateState?.() ?? Promise.resolve({ kind: "idle", enabled: true }),
    downloadUpdate: () => window.mesaCode.downloadUpdate?.() ?? Promise.resolve(),
    cancelUpdateDownload: () => window.mesaCode.cancelUpdateDownload?.() ?? Promise.resolve(),
    openUpdateStatusWindow: () => window.mesaCode.openUpdateStatusWindow?.() ?? Promise.resolve(),
    getAutoUpdatePreferences: () =>
      window.mesaCode.getAutoUpdatePreferences?.() ??
      Promise.resolve({ autoDownloadAndInstallUpdates: false }),
    setAutoDownloadAndInstallUpdates: (enabled) =>
      window.mesaCode.setAutoDownloadAndInstallUpdates?.(enabled) ?? Promise.resolve(),
    getDesktopSessionActivity: () =>
      window.mesaCode.getDesktopSessionActivity?.() ??
      Promise.resolve({ runningAgentSessionCount: 0 }),
    getMesaCodeStdioTapDevState: () =>
      window.mesaCode.getMesaCodeStdioTapDevState?.() ??
      Promise.resolve({ enabled: false, visible: false, logDir: "", statePath: "" }),
    onSettingsChanged: (callback) => window.mesaCode.onSettingsChanged?.(callback) ?? (() => {}),
    onApplicationLocaleChanged: (callback) =>
      window.mesaCode.onApplicationLocaleChanged?.(callback) ?? (() => {}),
    onPostUpdateReleaseNotes: (callback) => window.mesaCode.onPostUpdateReleaseNotes(callback),
    acknowledgePostUpdateReleaseNotes: (version) =>
      window.mesaCode.acknowledgePostUpdateReleaseNotes(version),
    skipUpdateVersion: (version) =>
      window.mesaCode.skipUpdateVersion?.(version) ?? Promise.resolve(),
    quitAndInstallUpdate: () => window.mesaCode.quitAndInstallUpdate(),
    getInstalledEditors: () => window.mesaCode.getInstalledEditors(),
    getApplicationIcon: (bundleId) =>
      window.mesaCode.getApplicationIcon?.(bundleId) ?? Promise.resolve(null),
    openInEditor: (editorId, path, editorOptions) =>
      window.mesaCode.openInEditor(editorId, path, editorOptions),
    executeDesktopCommand: (command) => window.mesaCode.executeDesktopCommand(command),
    setApplicationLocale: (locale) => window.mesaCode.setApplicationLocale(locale),
    getSystemLocale: () =>
      window.mesaCode.getSystemLocale?.() ??
      Promise.resolve(navigator.language.toLowerCase().startsWith("zh") ? "zh-CN" : "en-US"),
    setTitleBarTheme: (theme) => window.mesaCode.setTitleBarTheme(theme),
    getDeviceId: () =>
      (window as Window & { __MESA_CODE_DEVICE_ID__?: string }).__MESA_CODE_DEVICE_ID__ ?? "",
  };
}
