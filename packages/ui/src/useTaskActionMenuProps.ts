import { useCallback, useMemo } from "react";
import type { MesaCodeTaskMeta } from "@mesa-code/shared";
import { useFeedbackStore } from "@/feedback/feedbackStore.js";
import { useModelTrajectoryStore } from "@/store/modelTrajectoryStore.js";
import { buildTaskFeedbackDescription } from "@/lib/taskFeedbackDraft.js";
import { useOptionalTabStore } from "@/store/TabStoreProvider.js";
import { isWorkspaceReadOnly } from "@/store/tabStore.js";
import { useV4SplitPaneEntry } from "@/v4/splitPaneEntryContext.js";
import { useTaskListItemContextActions } from "@/useTaskListItemContextActions.js";
import { toast } from "@/components/ui/toast.js";
import type { TaskActionMenuContentProps } from "@/TaskActionMenuContent.js";

interface TaskActionMenuIntl {
  formatMessage: (desc: { id: string }, values?: Record<string, string>) => string;
}

/**
 * Builds the shared task-action menu body props once, so every entry point that
 * shows the task menu — the desktop right-click `TaskListItemContextMenu` and the
 * phone-layout "…" `TaskRowMoreMenu` — renders the identical action set with the
 * identical enable/disable rules. The only difference between the two is the
 * concrete `Item`/`Separator` primitives, which the caller injects, so this
 * returns the body props without those.
 *
 * `loadTaskPaths` gates the session/log path RPC: the right-click menu is a
 * list-level singleton that mounts this only while open, and the "…" menu mounts
 * it only while expanded, so neither idle row pays for path resolution.
 */
export function useTaskActionMenuProps(options: {
  workspacePath: string;
  remoteSessionId?: string;
  task: MesaCodeTaskMeta;
  isPinned: boolean;
  intl: TaskActionMenuIntl;
  onTogglePinTask: (taskId: string, pinned: boolean) => void;
  onStartRenameTask: (taskId: string, currentTitle: string) => void;
  onArchiveTask: (taskId: string) => void;
  onMarkTaskAsUnread: (taskId: string) => void;
  disableTaskActions?: boolean;
  disabledReason?: string;
  loadTaskPaths: boolean;
}): Omit<TaskActionMenuContentProps, "Item" | "Separator"> {
  const {
    workspacePath,
    remoteSessionId,
    task,
    isPinned,
    intl,
    onTogglePinTask,
    onStartRenameTask,
    onArchiveTask,
    onMarkTaskAsUnread,
    disableTaskActions = false,
    disabledReason,
    loadTaskPaths,
  } = options;

  const workspaceActionsDisabled = useOptionalTabStore(
    (state) =>
      disableTaskActions || isWorkspaceReadOnly(state, task.workspacePath, task.workspaceIdentity),
  );
  const workspaceActionsDisabledReason = workspaceActionsDisabled
    ? (disabledReason ?? intl.formatMessage({ id: "workspaceSidebar.unavailableLocalDirectory" }))
    : undefined;
  // 「在分屏打开」仅桌面 shell（context 由 WorkspaceShellLayout 提供；
  // 手机远控/无 Provider 环境默认 false → 菜单项整体不渲染）。
  const splitPaneEntry = useV4SplitPaneEntry();
  const splitPaneEntryEnabled = splitPaneEntry.enabled;
  const splitPaneTarget = useMemo(
    () => ({
      workspacePath,
      ...(task.workspaceIdentity?.trim() ? { workspaceIdentity: task.workspaceIdentity } : {}),
      ...(remoteSessionId ? { remoteSessionId } : {}),
      sessionId: task.taskId,
    }),
    [remoteSessionId, task.taskId, task.workspaceIdentity, workspacePath],
  );
  // 当前 focused session、已有 group 与 pane 上限统一由 shell owner 裁决；row 不再直接写 layout store。
  const canOpenInSplitPane = splitPaneEntry.canOpenSession(splitPaneTarget);
  const openFeedbackSubmit = useFeedbackStore((state) => state.openSubmit);
  const {
    taskSessionFile,
    taskNativeSessionLogFile,
    fileManagerLabel,
    handleCopyText,
    handleOpenTaskPathInFileManager,
  } = useTaskListItemContextActions({
    workspacePath,
    remoteSessionId,
    workspaceIdentity: task.workspaceIdentity,
    taskId: task.taskId,
    provider: task.provider,
    intl,
    loadTaskPaths,
  });
  const taskTitle =
    task.title ||
    intl.formatMessage({
      id: task.forkedFromTaskId ? "taskList.forkedUntitled" : "taskList.untitled",
    });

  const handleOpenTaskFeedback = useCallback(async () => {
    // 任务菜单之前只能复制日志/路径，反馈时缺少任务上下文。
    // 这里复用反馈中心 draft，只预填脱敏后的任务线索，附件由用户主动选择。
    openFeedbackSubmit({
      title: intl
        .formatMessage(
          { id: "feedback.submit.template.section.taskFeedbackTitle" },
          { title: taskTitle },
        )
        .slice(0, 80),
      type: "bug",
      module: "Agent任务执行失败",
      severity: "P2-中",
      includeLogs: false,
      description: buildTaskFeedbackDescription({
        taskTitle,
        taskId: task.taskId,
        workspacePath,
        taskSessionPath: taskSessionFile.path,
        taskLogPath: taskNativeSessionLogFile.path,
        formatMessage: (id: string, values?: Record<string, string>) =>
          intl.formatMessage({ id }, values),
      }),
      screenshots: [],
    });
    toast(intl.formatMessage({ id: "taskList.feedbackOpened" }));
  }, [
    intl,
    openFeedbackSubmit,
    task.taskId,
    taskNativeSessionLogFile.path,
    taskSessionFile.path,
    taskTitle,
    workspacePath,
  ]);

  return {
    intl,
    isPinned,
    fileManagerLabel,
    taskSessionFile,
    activeSessionId: task.taskId,
    taskNativeSessionLogFile,
    disableTaskActions: workspaceActionsDisabled,
    disabledReason: workspaceActionsDisabledReason,
    onTogglePinTask: () => {
      onTogglePinTask(task.taskId, !isPinned);
    },
    onStartRenameTask: () => {
      onStartRenameTask(task.taskId, task.title);
    },
    onArchiveTask: () => {
      onArchiveTask(task.taskId);
    },
    onMarkTaskAsUnread: () => {
      onMarkTaskAsUnread(task.taskId);
    },
    ...(splitPaneEntryEnabled
      ? {
          onOpenInSplitPane: () => {
            // 旧入口直接写 paneLayout，绕过 active group 与 shell navigation，
            // draft split 后下一次普通点击会把 session 灌进 primary。统一交给 shell controller。
            splitPaneEntry.openSession(splitPaneTarget);
          },
        }
      : {}),
    openInSplitPaneDisabled: workspaceActionsDisabled || !canOpenInSplitPane,
    onOpenTaskFeedback: () => {
      void handleOpenTaskFeedback();
    },
    onOpenTaskPathInFileManager: () => {
      void handleOpenTaskPathInFileManager();
    },
    onCopyWorkspacePath: () => {
      void handleCopyText(intl.formatMessage({ id: "appHeader.copyPath" }), workspacePath);
    },
    onCopyTaskPath: () => {
      void handleCopyText(
        intl.formatMessage({ id: "appHeader.copyTaskPath" }),
        taskSessionFile.path,
      );
    },
    onCopyTaskLogPath: () => {
      void handleCopyText(
        intl.formatMessage({ id: "appHeader.copyLogPath" }),
        taskNativeSessionLogFile.path,
      );
    },
    onCopySessionId: () => {
      void handleCopyText(intl.formatMessage({ id: "appHeader.copySessionId" }), task.taskId);
    },
    onViewModelTrajectory: () => {
      // 通过单例 store 把“打开轨迹”请求交给所属 workspace 的侧边栏控制器（useAppPanels）。
      useModelTrajectoryStore.getState().requestOpen({
        taskId: task.taskId,
        workspaceKey: task.workspaceIdentity?.trim() || workspacePath,
        title: taskTitle,
      });
    },
  };
}
