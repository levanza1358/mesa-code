import type { ComponentType, ReactNode } from "react";
import type { MesaCodeTaskMeta } from "@mesa-code/shared";
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from "@/components/ui/context-menu.js";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu.js";
import { TaskGroupColorDot } from "@/workspace-grouped-tasks/colors.js";
import type { TaskGroupMenuItem } from "@/workspace-grouped-tasks/types.js";

/**
 * The menu primitives a grouped-task menu is built from. Radix's ContextMenu and
 * DropdownMenu expose the same item/sub semantics, so the same body renders
 * inside either family — desktop right-click on one, the phone "…" button on the
 * other — without duplicating the action list. Typed as `ElementType` because
 * the concrete Radix components differ per family but share this prop surface.
 */
export interface GroupedTaskMenuPrimitives {
  Item: ComponentType<GroupedTaskMenuItemProps>;
  Separator: ComponentType<{ key?: string }>;
  Sub: ComponentType<{ children?: ReactNode }>;
  SubTrigger: ComponentType<GroupedTaskMenuItemProps>;
  SubContent: ComponentType<{ className?: string; children?: ReactNode }>;
}

interface GroupedTaskMenuItemProps {
  children?: ReactNode;
  disabled?: boolean;
  title?: string;
  "data-testid"?: string;
  onSelect?: () => void;
}

/** @see GroupedTaskMenuPrimitives */
export const GROUPED_TASK_CONTEXT_MENU_PRIMITIVES: GroupedTaskMenuPrimitives = {
  Item: ContextMenuItem,
  Separator: ContextMenuSeparator,
  Sub: ContextMenuSub,
  SubTrigger: ContextMenuSubTrigger,
  SubContent: ContextMenuSubContent,
};

/** @see GroupedTaskMenuPrimitives */
export const GROUPED_TASK_DROPDOWN_MENU_PRIMITIVES: GroupedTaskMenuPrimitives = {
  Item: DropdownMenuItem,
  Separator: DropdownMenuSeparator,
  Sub: DropdownMenuSub,
  SubTrigger: DropdownMenuSubTrigger,
  SubContent: DropdownMenuSubContent,
};

interface GroupedTaskMenuBodyProps {
  task: MesaCodeTaskMeta;
  currentGroupId?: string;
  groups: TaskGroupMenuItem[];
  intl: {
    formatMessage: (desc: { id: string }) => string;
  };
  fileManagerLabel: string;
  taskSessionFile: { loading: boolean; path: string | null };
  taskNativeSessionLogFile: { loading: boolean; path: string | null };
  primitives: GroupedTaskMenuPrimitives;
  renderContent: (children: ReactNode) => ReactNode;
  onMoveTaskToGroup: (task: MesaCodeTaskMeta, groupId: string | null) => void;
  onMoveTaskToTop: (task: MesaCodeTaskMeta) => void;
  onStartRenameTask: (task: MesaCodeTaskMeta) => void;
  onArchiveTask: (task: MesaCodeTaskMeta) => void;
  onMarkTaskAsUnread: (task: MesaCodeTaskMeta) => void;
  onOpenTaskPathInFileManager: () => void;
  onCopyText: (label: string, text: string | null) => void;
  onOpenTaskFeedback: () => void;
  disabledReason?: string;
}

/**
 * The grouped-task action set — group moves plus the task actions the grouped
 * view exposes — for whichever menu family the caller injects. Rendering it the
 * same way for right-click and for the phone "…" menu keeps the two entry points
 * from drifting.
 */
export function GroupedTaskMenuBody({
  task,
  currentGroupId,
  groups,
  intl,
  fileManagerLabel,
  taskSessionFile,
  taskNativeSessionLogFile,
  primitives,
  renderContent,
  onMoveTaskToGroup,
  onMoveTaskToTop,
  onStartRenameTask,
  onArchiveTask,
  onMarkTaskAsUnread,
  onOpenTaskPathInFileManager,
  onCopyText,
  onOpenTaskFeedback,
  disabledReason,
}: GroupedTaskMenuBodyProps) {
  const { Item, Separator, Sub, SubTrigger, SubContent } = primitives;
  return renderContent(
    <>
      <Sub>
        <SubTrigger disabled={Boolean(disabledReason)} title={disabledReason}>
          {intl.formatMessage({ id: "taskGroup.moveToGroup" })}
        </SubTrigger>
        <SubContent className="w-52">
          <Item
            disabled={Boolean(disabledReason) || !currentGroupId}
            title={disabledReason}
            onSelect={() => {
              if (!disabledReason) {
                onMoveTaskToGroup(task, null);
              }
            }}
          >
            {intl.formatMessage({ id: "taskGroup.removeFromGroup" })}
          </Item>
          <Separator />
          {groups.map((group) => (
            <Item
              key={group.id}
              disabled={Boolean(disabledReason) || group.id === currentGroupId}
              title={disabledReason}
              onSelect={() => {
                if (!disabledReason) {
                  onMoveTaskToGroup(task, group.id);
                }
              }}
            >
              <TaskGroupColorDot color={group.color} />
              <span className="truncate">{group.title}</span>
            </Item>
          ))}
        </SubContent>
      </Sub>
      <Item
        disabled={Boolean(disabledReason)}
        title={disabledReason}
        onSelect={() => {
          if (!disabledReason) {
            onMoveTaskToTop(task);
          }
        }}
      >
        {intl.formatMessage({ id: "taskGroup.moveToTop" })}
      </Item>
      <Separator />
      <Item
        disabled={Boolean(disabledReason)}
        title={disabledReason}
        onSelect={() => {
          if (!disabledReason) {
            onStartRenameTask(task);
          }
        }}
      >
        {intl.formatMessage({ id: "taskList.rename" })}
      </Item>
      <Item
        disabled={Boolean(disabledReason)}
        title={disabledReason}
        onSelect={() => {
          if (!disabledReason) {
            onArchiveTask(task);
          }
        }}
      >
        {intl.formatMessage({ id: "taskList.archive" })}
      </Item>
      <Item
        disabled={Boolean(disabledReason)}
        title={disabledReason}
        onSelect={() => {
          if (!disabledReason) {
            onMarkTaskAsUnread(task);
          }
        }}
      >
        {intl.formatMessage({ id: "taskList.markAsUnread" })}
      </Item>
      <Separator />
      <Item
        disabled={Boolean(disabledReason)}
        title={disabledReason}
        onSelect={() => {
          if (!disabledReason) {
            onOpenTaskPathInFileManager();
          }
        }}
      >
        {fileManagerLabel}
      </Item>
      <Item
        onSelect={() =>
          onCopyText(intl.formatMessage({ id: "appHeader.copyPath" }), task.workspacePath)
        }
      >
        {intl.formatMessage({ id: "appHeader.copyPath" })}
      </Item>
      <Item
        disabled={taskSessionFile.loading || !taskSessionFile.path}
        onSelect={() =>
          onCopyText(intl.formatMessage({ id: "appHeader.copyTaskPath" }), taskSessionFile.path)
        }
      >
        {intl.formatMessage({ id: "appHeader.copyTaskPath" })}
      </Item>
      <Item
        disabled={taskNativeSessionLogFile.loading || !taskNativeSessionLogFile.path}
        onSelect={() =>
          onCopyText(
            intl.formatMessage({ id: "appHeader.copyLogPath" }),
            taskNativeSessionLogFile.path,
          )
        }
      >
        {intl.formatMessage({ id: "appHeader.copyLogPath" })}
      </Item>
      <Item
        onSelect={() =>
          onCopyText(intl.formatMessage({ id: "appHeader.copySessionId" }), task.taskId)
        }
      >
        {intl.formatMessage({ id: "appHeader.copySessionId" })}
      </Item>
      <Separator />
      <Item onSelect={onOpenTaskFeedback}>{intl.formatMessage({ id: "taskList.feedback" })}</Item>
    </>,
  );
}

/** The desktop right-click variant of the grouped-task menu. */
export function GroupedTaskContextMenuContent(
  props: Omit<GroupedTaskMenuBodyProps, "primitives" | "renderContent">,
) {
  return (
    <GroupedTaskMenuBody
      {...props}
      primitives={GROUPED_TASK_CONTEXT_MENU_PRIMITIVES}
      renderContent={(children) => (
        <ContextMenuContent className="w-56">{children}</ContextMenuContent>
      )}
    />
  );
}

/**
 * The phone "…" variant of the grouped-task menu. Emits only the menu **items**
 * (no content wrapper), because `TaskRowMoreMenu` already renders its own
 * `DropdownMenuContent`; nesting a second content would be an invalid menu tree.
 */
export function GroupedTaskDropdownMenuItems(
  props: Omit<GroupedTaskMenuBodyProps, "primitives" | "renderContent">,
) {
  return (
    <GroupedTaskMenuBody
      {...props}
      primitives={GROUPED_TASK_DROPDOWN_MENU_PRIMITIVES}
      renderContent={(children) => <>{children}</>}
    />
  );
}
