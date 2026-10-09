import type {
  MesaCodeAgentMcpServer,
  MesaCodeAutomationScheduleRule,
  MesaCodeMcpListMode,
  ModelSelection,
} from "@mesa-code/shared";

export interface MesaCodeAgentWorkspaceTarget {
  workspacePath: string;
  workspaceIdentity?: string;
  /** 远程 workspace 的运行时会话身份；只用于隔离/路由，不能替代 workspacePath。 */
  remoteSessionId?: string;
}

export interface MesaCodeAgentPluginViewParams extends MesaCodeAgentWorkspaceTarget {
  configScope?: "user" | "workspace";
}

export interface MesaCodeAgentListMcpServerStatusesParams extends MesaCodeAgentWorkspaceTarget {
  mcpServers?: MesaCodeAgentMcpServer[];
  mode?: MesaCodeMcpListMode;
}

export interface MesaCodeAgentAddPluginMarketplaceParams extends MesaCodeAgentWorkspaceTarget {
  dryRun?: boolean;
  operationId?: string;
  source: string;
}

export interface MesaCodeAgentRemovePluginMarketplaceParams extends MesaCodeAgentWorkspaceTarget {
  marketplace: string;
}

export interface MesaCodeAgentUpdatePluginMarketplaceParams extends MesaCodeAgentWorkspaceTarget {
  marketplace?: string;
  operationId?: string;
}

export interface MesaCodeAgentInstallPluginParams extends MesaCodeAgentWorkspaceTarget {
  dryRun?: boolean;
  marketplace: string;
  operationId?: string;
  pluginName: string;
  scope?: "user" | "workspace";
}

export interface MesaCodeAgentCancelPluginOperationParams {
  operationId: string;
}

export interface MesaCodeAgentUninstallPluginParams extends MesaCodeAgentWorkspaceTarget {
  marketplace?: string;
  pluginId?: string;
  pluginName?: string;
  removeCache?: boolean;
}

export interface MesaCodeAgentUpdatePluginParams extends MesaCodeAgentWorkspaceTarget {
  pluginId?: string;
  marketplace?: string;
}

export interface MesaCodeAgentRestoreBuiltinPluginParams extends MesaCodeAgentWorkspaceTarget {
  pluginId: string;
}

export interface MesaCodeAgentConfigurePluginParams extends MesaCodeAgentWorkspaceTarget {
  clearOptionKeys?: string[];
  dryRun?: boolean;
  options: Record<string, unknown>;
  pluginId: string;
  scope?: "user" | "workspace";
}

export interface MesaCodeAgentResetPluginConfigParams extends MesaCodeAgentWorkspaceTarget {
  pluginId: string;
  scope?: "user" | "workspace";
}

export interface MesaCodeAgentValidatePluginParams extends MesaCodeAgentWorkspaceTarget {
  marketplace?: string;
  pluginName?: string;
  source?: string;
}

export interface MesaCodeAgentDescribePluginParams extends MesaCodeAgentWorkspaceTarget {
  marketplace: string;
  pluginName: string;
}

export interface MesaCodeAgentSetPluginEnabledParams extends MesaCodeAgentWorkspaceTarget {
  enabled: boolean;
  operationId?: string;
  pluginId: string;
  scope?: "user" | "workspace";
}

// Plugin 对话引用 catalog：
// 带 sessionId → session-owned 冻结 catalog（必须路由到持有该 session 的 workspace client）；
// 不带 → workspace 当前 catalog（新建草稿 Picker）。
export interface MesaCodeAgentPluginReferenceCatalogParams extends MesaCodeAgentWorkspaceTarget {
  sessionId?: string;
}

// Composer Skill catalog：与 Plugin 引用相同，以 sessionId 区分 workspace 当前目录和
// resident Session runtime 快照；不参与 Settings 管理目录。
export interface MesaCodeAgentSkillReferenceCatalogParams extends MesaCodeAgentWorkspaceTarget {
  sessionId?: string;
}
export interface MesaCodeAgentResolveSuggestedPluginReferenceParams extends MesaCodeAgentWorkspaceTarget {
  stableId: string;
  operationId: string;
  clientMode: "desktop-continuous" | "web-remote-replayable";
  deliveryKind: "desktop-continuous" | "web-remote-replayable";
}

// ---- 定时任务(automation)管理参数 ----

export interface MesaCodeAgentCreateAutomationParams extends MesaCodeAgentWorkspaceTarget {
  title: string;
  cronExpr: string;
  relativeDelayMinutes?: number;
  prompt: string;
  modelSelection?: ModelSelection;
  mode?: string;
  recurring?: boolean;
  maxRuns?: number;
  endAt?: number;
  scheduleRule?: MesaCodeAutomationScheduleRule;
}

export interface MesaCodeAgentUpdateAutomationParams extends MesaCodeAgentWorkspaceTarget {
  automationId: string;
  title?: string;
  cronExpr?: string;
  prompt?: string;
  modelSelection?: ModelSelection | null;
  mode?: string | null;
  recurring?: boolean;
  maxRuns?: number | null;
  endAt?: number | null;
  scheduleRule?: MesaCodeAutomationScheduleRule | null;
  scheduleEditedByUser?: boolean;
}

export interface MesaCodeAgentAutomationIdParams extends MesaCodeAgentWorkspaceTarget {
  automationId: string;
}

export interface MesaCodeAgentSetAutomationEnabledParams extends MesaCodeAgentWorkspaceTarget {
  automationId: string;
  enabled: boolean;
}

export interface MesaCodeAgentDeleteAutomationRunParams extends MesaCodeAgentWorkspaceTarget {
  runId: string;
}
