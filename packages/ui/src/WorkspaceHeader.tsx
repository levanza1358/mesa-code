import type {
  MesaCodeProvider,
  MesaCodeTaskMeta,
  MesaCodeTaskChangeSummary,
  EditorInfo,
  GitRepositorySummary,
  RemoteTarget,
  UserInfo,
} from "@mesa-code/shared";
import { useState } from "react";
import { TID_WORKSPACE_HEADER } from "@mesa-code/shared";
import { ArrowLeftIcon, ArrowRightIcon, MessageCirclePlus } from "lucide-react";
import type { ConversationDropTargetController } from "@/v4/composer/conversationDropTarget.js";
import { cn } from "@/components/lib/utils.js";
import { WINDOWS_CAPTION_BAND_RIGHT_INSET_PX } from "@/windowCaptionControls.js";
import {
  WorkspaceHeaderActionSection,
  type WorkspaceHeaderState,
  WorkspaceHeaderTitleSection,
} from "@/WorkspaceHeaderSections.js";
import { MobileSidebarToggleButton } from "@/app-shell/MobileSidebarToggleButton.js";
import { DesktopTopOverlayActionButton } from "@/DesktopTopOverlayActionButton.js";
import { useMesaCodeIntl } from "@/i18n/IntlProvider.js";
import type { WorkspaceHeaderVariant } from "@/WorkspaceHeaderSections/shared.js";

export function WorkspaceHeader({
  variant = "task",

  draftDropTargetController,
  readOnlyReason,
  workspaceAbsPath,
  remoteSessionId,
  workspaceIdentity,
  remoteTarget,
  localWorkspacePath,
  projectName,
  activeTaskTitle,
  activeTaskChangeSummary,
  hasUpdateReady,
  activeTaskId,
  user,
  activeTraceId,
  activeSessionId,
  activeTaskProvider,
  resolvedActiveTaskMeta,
  sessionLogPath,
  nativeSessionLogProvider,
  nativeSessionLogPath,
  nativeSessionLogExists,
  nativeSessionLogLoading,
  workspaceHeaderState,
  gitSummary,
  gitDirtyFileCount,
  isMacDesktop,
  isMacFullscreen,
  isWindowsDesktop,
  useWindowsCaptionSpacing = false,

  isDesktop,
  simplifyForNarrowRemote = false,
  isMobileWeb = false,
  isSidebarVisible,
  isTerminalOpen,
  isSidePaneOpen,
  onToggleSidebar,
  onRefreshGit,
  onToggleTerminal,
  onToggleSidePane,
  toggleSidePaneShortcutLabel,
  onReloadSession,
  reloadSessionDisabled,
  reloadSessionPending,
  onGoBack,
  onGoForward,
  canGoBack = false,
  canGoForward = false,
  onCreateTask,
}: {
  variant?: WorkspaceHeaderVariant;
  draftDropTargetController?: ConversationDropTargetController | null;
  readOnlyReason?: string;
  workspaceAbsPath: string;
  remoteSessionId?: string;
  workspaceIdentity?: string;
  remoteTarget?: RemoteTarget;
  localWorkspacePath?: string;
  projectName: string;
  activeTaskTitle: string;
  activeTaskChangeSummary?: MesaCodeTaskChangeSummary | null;
  hasUpdateReady: boolean;
  activeTaskId: string | null;
  user?: UserInfo | null;
  activeTraceId: string | null;
  activeSessionId: string | null;
  activeTaskProvider: MesaCodeProvider | null;
  resolvedActiveTaskMeta?: MesaCodeTaskMeta | null;
  sessionLogPath: string | null;
  nativeSessionLogProvider: MesaCodeProvider | null;
  nativeSessionLogPath: string | null;
  nativeSessionLogExists: boolean;
  nativeSessionLogLoading: boolean;
  workspaceHeaderState: WorkspaceHeaderState;
  gitSummary: GitRepositorySummary;
  gitDirtyFileCount: number;
  isMacDesktop?: boolean;
  isMacFullscreen?: boolean;
  isWindowsDesktop?: boolean;
  useWindowsCaptionSpacing?: boolean;
  isDesktop?: boolean;
  simplifyForNarrowRemote?: boolean;
  /** Web phone layout: render the leading navigation-drawer button. Never set on desktop. */
  isMobileWeb?: boolean;
  isSidebarVisible: boolean;
  isTerminalOpen: boolean;
  isSidePaneOpen: boolean;
  onRefreshGit: () => void;
  onToggleTerminal: () => void;
  onToggleBrowser: () => void;
  onToggleSidePane: () => void;
  /** Web phone layout only: toggles the off-canvas navigation drawer. */
  onToggleSidebar?: () => void;
  toggleSidePaneShortcutLabel?: string;
  onReloadSession: (options?: {
    resumeTaskId?: string | null;
    provider?: MesaCodeProvider | null;
  }) => void | Promise<void>;
  reloadSessionDisabled?: boolean;
  reloadSessionPending?: boolean;
  onCreateTask: () => void;
  onOpenWorkspace: () => void;
  allowOpenWorkspace?: boolean;
  /**
   * Web phone layout only. When set, the header renders the task navigation
   * (back / forward / new task) inline so they line up with the drawer and panel
   * buttons, instead of leaving them in the floating overlay that would overlap
   * the header. All four are ignored on desktop.
   */
  onGoBack?: () => void;
  onGoForward?: () => void;
  canGoBack?: boolean;
  canGoForward?: boolean;
}) {
  const { intl } = useMesaCodeIntl();
  const [selectedEditor, setSelectedEditor] = useState<EditorInfo | null>(null);
  const shouldOffsetHeaderForWindowControls = !isSidebarVisible;
  // 内联窗控只剩 Linux：Windows 改用 OS 原生窗控，macOS 用原生红绿灯。
  const usesInlineWindowControls = Boolean(isDesktop && !isMacDesktop && !isWindowsDesktop);
  // Windows 的终端/侧栏切换固定在窗口右缘的 caption band 浮层里，与面板开合无关。
  // 头部始终为这条 band 预留等宽，编辑器组因此不再随面板滑动，也不会压到胶囊按钮下面。
  const nativeWindowsCaptionPaddingStyle = isWindowsDesktop
    ? { paddingRight: `${WINDOWS_CAPTION_BAND_RIGHT_INSET_PX}px` }
    : undefined;

  let headerWindowControlsPaddingClass: string | false = false;
  if (shouldOffsetHeaderForWindowControls) {
    if (isMacDesktop) {
      if (hasUpdateReady) {
        headerWindowControlsPaddingClass = isMacFullscreen ? "pl-48" : "pl-66";
      } else {
        headerWindowControlsPaddingClass = isMacFullscreen ? "pl-38" : "pl-58";
      }
    } else {
      // The left padding here reserves the desktop window-control area (Linux
      // inline controls). On the web phone layout there is no window chrome and
      // the drawer toggle is the leading control, so the reserve would push it
      // far from the left edge with an empty gap. Drop it on that layout.
      headerWindowControlsPaddingClass = hasUpdateReady ? "pl-44 max-md:pl-2" : "pl-38 max-md:pl-2";
    }
  }

  return (
    <header
      data-testid={TID_WORKSPACE_HEADER}
      data-workspace-header-variant={variant}
      className={cn(
        "@container/workspace-header relative flex w-full shrink-0 h-12 border-b",
        variant === "draft" ? "border-transparent" : "border-border/50",
      )}
    >
      {variant === "draft" && draftDropTargetController?.active ? (
        <div
          className="absolute inset-0 z-40 bg-accent/55 backdrop-blur-sm pointer-events-auto [app-region:no-drag]"
          data-testid="new-task-draft-drop-mask"
          onDragOver={draftDropTargetController.onDragOver}
          onDragLeave={draftDropTargetController.onDragLeave}
          onDrop={draftDropTargetController.onDrop}
        />
      ) : null}
      <div
        style={nativeWindowsCaptionPaddingStyle}
        className={cn(
          // 大会话 resize trace 显示 titlebar padding 动画层会触发 scrollbar-color 非合成动画；
          // 明确限定 transition-property 为 padding，避免 duration-300 退回默认 all。
          "flex h-12 flex-1 min-w-0 items-center justify-between gap-2 overflow-hidden p-2 [app-region:drag] transition-[padding] duration-300",
          // 旧 caption 菜单移除后不能继续清零右边距，否则终端按钮会贴住面板边框。
          headerWindowControlsPaddingClass,
        )}
      >
        {isMobileWeb ? (
          // Web phone layout: one tidy row. The drawer toggle and the task
          // navigation (back / forward / new task) live here, inline with the
          // panel buttons on the right, instead of in the floating overlay —
          // which is absolutely positioned and would overlap this header.
          <div className="flex shrink-0 items-center gap-1">
            {onToggleSidebar ? (
              <MobileSidebarToggleButton onToggleSidebar={onToggleSidebar} />
            ) : null}
            <DesktopTopOverlayActionButton
              title={intl.formatMessage({ id: "taskNav.back" })}
              ariaLabel={intl.formatMessage({ id: "taskNav.back" })}
              disabled={!canGoBack}
              onClick={() => onGoBack?.()}
            >
              <ArrowLeftIcon className="size-4" />
            </DesktopTopOverlayActionButton>
            <DesktopTopOverlayActionButton
              title={intl.formatMessage({ id: "taskNav.forward" })}
              ariaLabel={intl.formatMessage({ id: "taskNav.forward" })}
              disabled={!canGoForward}
              onClick={() => onGoForward?.()}
            >
              <ArrowRightIcon className="size-4" />
            </DesktopTopOverlayActionButton>
            <DesktopTopOverlayActionButton
              title={intl.formatMessage({ id: "sidebar.newTask" })}
              ariaLabel={intl.formatMessage({ id: "sidebar.newTask" })}
              onClick={onCreateTask}
            >
              <MessageCirclePlus className="size-4" />
            </DesktopTopOverlayActionButton>
          </div>
        ) : null}
        {variant === "task" ? (
          <WorkspaceHeaderTitleSection
            variant={variant}
            readOnlyReason={readOnlyReason}
            workspaceAbsPath={workspaceAbsPath}
            remoteSessionId={remoteSessionId}
            workspaceIdentity={workspaceIdentity}
            remoteTarget={remoteTarget}
            localWorkspacePath={localWorkspacePath}
            projectName={projectName}
            activeTaskTitle={activeTaskTitle}
            activeTaskChangeSummary={activeTaskChangeSummary}
            activeTaskId={activeTaskId}
            activeTraceId={activeTraceId}
            activeSessionId={activeSessionId}
            activeTaskProvider={activeTaskProvider}
            resolvedActiveTaskMeta={resolvedActiveTaskMeta}
            gitSummary={gitSummary}
            gitDirtyFileCount={gitDirtyFileCount}
            sessionLogPath={sessionLogPath}
            nativeSessionLogProvider={nativeSessionLogProvider}
            nativeSessionLogPath={nativeSessionLogPath}
            nativeSessionLogExists={nativeSessionLogExists}
            nativeSessionLogLoading={nativeSessionLogLoading}
            workspaceHeaderState={workspaceHeaderState}
            isMacDesktop={isMacDesktop}
            isMacFullscreen={isMacFullscreen}
            isWindowsDesktop={isWindowsDesktop}
            simplifyForNarrowRemote={simplifyForNarrowRemote}
            selectedEditor={selectedEditor}
            onReloadSession={onReloadSession}
            reloadSessionDisabled={reloadSessionDisabled}
            reloadSessionPending={reloadSessionPending}
            onRefreshGit={onRefreshGit}
          />
        ) : (
          <div className="min-w-0 flex-1" aria-hidden="true" />
        )}
        <WorkspaceHeaderActionSection
          variant={variant}
          activeTaskId={activeTaskId}
          user={user}
          readOnlyReason={readOnlyReason}
          workspaceAbsPath={workspaceAbsPath}
          workspaceIdentity={workspaceIdentity}
          remoteSessionId={remoteSessionId}
          remoteTarget={remoteTarget}
          isDesktop={isDesktop}
          isTerminalOpen={isTerminalOpen}
          isSidePaneOpen={isSidePaneOpen}
          onToggleTerminal={onToggleTerminal}
          onToggleSidePane={onToggleSidePane}
          toggleSidePaneShortcutLabel={toggleSidePaneShortcutLabel}
          simplifyForNarrowRemote={simplifyForNarrowRemote}
          showWindowControls={usesInlineWindowControls}
          // Windows：终端/侧栏切换改由窗口固定的 caption band 渲染贴住原生按钮，这里不再画第二份。
          useWindowsCaptionSpacing={useWindowsCaptionSpacing}
          captionBandOwnsCells={Boolean(isWindowsDesktop)}
          // 面板操作按钮沿用 macOS 紧凑样式，Windows/Linux 窗控跟随最右侧 Header。
          onSelectedEditorChange={setSelectedEditor}
        />
      </div>
    </header>
  );
}
