import type { WorkspacePurpose, MesaCodeTaskMeta } from "@mesa-code/shared";

export type MesaCodeTaskListKind = "pinned" | "archived" | "timeline" | "active";
export type MesaCodeTaskListSortBy = "created" | "updated";

export interface MesaCodeTaskListWorkspaceScope {
  workspacePath: string;
  workspaceIdentity?: string;
  workspacePurpose?: WorkspacePurpose;
}

export interface MesaCodeTaskListQuery {
  kind: MesaCodeTaskListKind;
  workspaceScopes: MesaCodeTaskListWorkspaceScope[];
  sortBy: MesaCodeTaskListSortBy;
  search?: string;
  limit?: number;
}

export type MesaCodeTaskListItem = MesaCodeTaskMeta & {
  searchSnippet?: string;
  searchSnippets?: string[];
};

export interface MesaCodeTaskListResult {
  items: MesaCodeTaskListItem[];
  total: number;
  hasMore: boolean;
}

export type MesaCodeTaskGroupColor =
  | "gray"
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "purple";

export interface MesaCodeTaskGroup {
  id: string;
  title: string;
  color: MesaCodeTaskGroupColor;
  createdAt: number;
  updatedAt: number;
}

export interface MesaCodeGroupedTaskRef {
  workspacePath: string;
  workspaceIdentity?: string;
  taskId: string;
}

export type MesaCodeGroupedTaskViewTopLevelNodeRef =
  | { type: "group"; groupId: string }
  | { type: "task"; task: MesaCodeGroupedTaskRef };

export type MesaCodeGroupedTaskViewNode =
  | {
      type: "group";
      group: MesaCodeTaskGroup;
      tasks: MesaCodeTaskListItem[];
      sortOrder?: number;
    }
  | {
      type: "task";
      task: MesaCodeTaskListItem;
      sortOrder?: number;
    };

export interface MesaCodeGroupedTaskView {
  nodes: MesaCodeGroupedTaskViewNode[];
}

export interface MesaCodeGroupedTaskViewQuery {
  workspaceScopes: MesaCodeTaskListWorkspaceScope[];
  includeAllWorkspaces?: boolean;
}

// ── grouped 原始结构（不 join tasks 表）──
// grouped 视图的任务数据源迁到 sessions-index 后，服务端只提供分组结构
// （task_groups / task_group_members / task_group_view_node_orders），
// 由客户端与 sessions-index 会话做 join。

/** 组成员引用（不含任务 meta；task 内容由 sessions-index 提供）。 */
export interface MesaCodeGroupedTaskViewStructureMember {
  groupId: string;
  /** 服务端口径 workspaceKey（resolveWorkspaceKey：identity ?? path），join 匹配键。 */
  workspaceKey: string;
  workspacePath: string;
  workspaceIdentity?: string;
  taskId: string;
  /** null = 尚未落 sort_order（新加入组）；客户端按 addedAt 降序补内存序。 */
  sortOrder: number | null;
  addedAt: number;
}

/** 顶层节点排序（task_group_view_node_orders，node_key 已解析为结构化引用）。 */
export type MesaCodeGroupedTaskViewStructureTopOrder =
  | { type: "group"; groupId: string; sortOrder: number }
  | { type: "task"; workspaceKey: string; taskId: string; sortOrder: number };

export interface MesaCodeGroupedTaskViewStructure {
  /** 已按 workspaceScopes 可见性过滤的 group（bootstrap workspace group 只在其 workspace 可见）。 */
  groups: MesaCodeTaskGroup[];
  /** 全量组成员（含不可见 group 的成员——顶层排除规则需要全量判断）。 */
  members: MesaCodeGroupedTaskViewStructureMember[];
  topLevelOrders: MesaCodeGroupedTaskViewStructureTopOrder[];
}

export interface MesaCodeGroupedTaskViewOrderInput {
  workspaceScopes: MesaCodeTaskListWorkspaceScope[];
  topLevelNodes: MesaCodeGroupedTaskViewTopLevelNodeRef[];
  groups: Array<{
    groupId: string;
    taskRefs: MesaCodeGroupedTaskRef[];
  }>;
}

export interface MesaCodeWorkspaceEventSubscriptionParams {
  workspacePath: string;
  workspaceIdentity?: string;
}
