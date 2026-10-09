import type { BackgroundBashOutputResult, SessionDebugSnapshot } from "@mesa-code/shared";
/* eslint-disable max-lines -- MesaCode agent service 接口集中声明 protocol/session/workspace 方法，拆分会增加 service descriptor 迁移成本。 */
import type { Event, IDisposable } from "@mesa-code/rpc";
import { ServiceChannels } from "@mesa-code/shared";
import type { AppUsageRange, AppUsageSnapshot, MesaCodeTaskTokenUsageResult } from "@mesa-code/shared";
import type { MesaCodeAutomation, MesaCodeAutomationRun } from "@mesa-code/shared";
import type {
  MesaCodeStorageStartupState,
  MesaCodeDeliveryKind,
  MesaCodeAgentMcpServer,
  MesaCodeBackgroundTurnAttribution,
  TraceId,
  MesaCodeSessionCompactResult,
  MesaCodeSessionGoalAction,
  MesaCodeSessionGoalResult,
  MesaCodeMessageWithParts,
  ModelSelection,
  MesaCodeSessionImportHistory,
  MesaCodePermissionRequestParams,
  AgentLaneResourceSample,
  MesaCodeMcpTelemetryEvent,
  MesaCodeMcpResourceSample,
  MesaCodeToolExecResource,
  MesaCodeProcessChildProcess,
  MesaCodeMcpListResult,
  MesaCodePluginsListResult,
  MesaCodePluginsOverviewResult,
  MesaCodePluginsMarketplaceMutationResult,
  MesaCodePluginsInstallResult,
  MesaCodePluginsReferenceCatalogResult,
  MesaCodeSkillsReferenceCatalogResult,
  MesaCodeWorkflowsDeleteResult,
  MesaCodeWorkflowsGetResult,
  MesaCodeWorkflowsListResult,
  MesaCodeWorkflowsMoveResult,
  MesaCodeWorkflowsRunsResult,
  MesaCodeWorkflowsUpdateMetaResult,
  MesaCodePluginsUninstallResult,
  MesaCodePluginsRestoreBuiltinResult,
  MesaCodePluginsConfigureResult,
  MesaCodePluginsDescribeResult,
  MesaCodePluginsValidateResult,
  MesaCodePluginsSetEnabledResult,
  MesaCodePluginsCancelOperationResult,
  MesaCodePluginOperationProgressNotification,
  MesaCodeProviderTestModelConnectivityParams,
  MesaCodeProviderTestModelConnectivityResult,
  MesaCodeProviderDiscoverModelsResult,
  MesaCodeUserInputRequestParams,
  MesaCodeUserInputResponse,
  MesaCodeSessionEvent,
  MesaCodeSessionInfo,
  MesaCodeSessionMode,
  MesaCodeSessionPersistence,
  MesaCodeSessionSendResult,
  MesaCodeSessionRequestRuntimePreferencesParams,
  MesaCodeSessionRuntimePreferencesResult,
  MesaCodeSessionStateSnapshot,
  MesaCodeSessionSubagentsResult,
  MesaCodeStateUpdatedNotification,
  MesaCodeTaskClientMode,
  MesaCodeBrowserAmbientContext,
  MesaCodeWorkspacePresentation,
  MesaCodeWorkspaceGenerateTextResult,
  MesaCodeWorkspaceGenerateTextParams,
  MesaCodeWorkspaceHookTrustGrantResult,
} from "@mesa-code/shared";
import type {
  ClientHello,
  CommandAck,
  CommandEnvelope,
  CommandKey,
  CommandsQueryResult,
  ConversationTopicWireCandidate,
  ConversationTelemetryFact,
  CuaPermissionObservation,
  ConversationRowTarget,
  HelloMessage,
  SessionsIndexTopicWireCandidate,
  V4AttachmentBeginResult,
  V4AttachmentChunkResult,
  V4AttachmentCommitResult,
  V4AttachmentPreviewSourceResult,
  V4AttachmentReadResult,
  V4ConversationAttachmentReadResult,
  V4ConversationAttachmentStatResult,
  V4ConnectionFlowState,
  V4ConversationFileChangesResult,
  V4ConversationFileRewindPreviewResult,
  V4ConversationPlansResult,
  V4ConversationWorkflowRunEventsResult,
  V4ConversationWorkflowRunArtifactDataResult,
  V4ConversationWorkflowRunArtifactReadResult,
  V4ConversationWorkflowRunArtifactsResult,
  V4ConversationWorkflowRunNodeResultResult,
  V4ConversationWorkflowRunWorkspaceResult,
  V4ConversationWorkflowRunsResult,
  V4ConversationRowsRangeResult,
  V4ConversationResyncResult,
  V4ConversationSubscribeResult,
  V4SessionsIndexSubscribeResult,
  V4WorkspaceConfigSubscribeResult,
  WorkspaceConfigTopicWireCandidate,
} from "@mesa-code/shared/mesa-code-protocol-v4";
import { createServiceDescriptor } from "../descriptors.js";

export * from "./mesa-code-agent-plugin-params.js";
export * from "./mesa-code-agent-workflow-params.js";
import type {
  MesaCodeAgentAddPluginMarketplaceParams,
  MesaCodeAgentAutomationIdParams,
  MesaCodeAgentCancelPluginOperationParams,
  MesaCodeAgentConfigurePluginParams,
  MesaCodeAgentResetPluginConfigParams,
  MesaCodeAgentCreateAutomationParams,
  MesaCodeAgentDeleteAutomationRunParams,
  MesaCodeAgentDescribePluginParams,
  MesaCodeAgentInstallPluginParams,
  MesaCodeAgentListMcpServerStatusesParams,
  MesaCodeAgentPluginViewParams,
  MesaCodeAgentPluginReferenceCatalogParams,
  MesaCodeAgentSkillReferenceCatalogParams,
  MesaCodeAgentResolveSuggestedPluginReferenceParams,
  MesaCodeAgentRemovePluginMarketplaceParams,
  MesaCodeAgentRestoreBuiltinPluginParams,
  MesaCodeAgentSetPluginEnabledParams,
  MesaCodeAgentSetAutomationEnabledParams,
  MesaCodeAgentUninstallPluginParams,
  MesaCodeAgentUpdatePluginMarketplaceParams,
  MesaCodeAgentUpdatePluginParams,
  MesaCodeAgentUpdateAutomationParams,
  MesaCodeAgentValidatePluginParams,
  MesaCodeAgentWorkspaceTarget,
} from "./mesa-code-agent-plugin-params.js";
import type {
  MesaCodeAgentDeleteSavedWorkflowParams,
  MesaCodeAgentGetSavedWorkflowParams,
  MesaCodeAgentListSavedWorkflowRunsParams,
  MesaCodeAgentListSavedWorkflowsParams,
  MesaCodeAgentMoveSavedWorkflowParams,
  MesaCodeAgentUpdateSavedWorkflowMetaParams,
} from "./mesa-code-agent-workflow-params.js";

export interface MesaCodeAgentSessionTarget extends MesaCodeAgentWorkspaceTarget {
  sessionId: string;
}

export interface MesaCodeAgentResumeSessionParams extends MesaCodeAgentSessionTarget {
  model?: ModelSelection;
  thoughtLevel?: string;
  mcpServers?: MesaCodeAgentMcpServer[];
  // 冷恢复会重建 runtime，工具面隔离必须和 create 保持同一安全边界（CUA 只放行 mesa-code-cua 工具、
  // 禁 Bash 等）。否则 resume 后模型可见工具面/执行权限会比创建时更宽。
  toolAllowlist?: string[];
  toolDenylist?: string[];
}

export interface MesaCodeAgentInitializeResult {
  available: boolean;
  workspaceKey: string;
  protocolName?: string;
  protocolVersion?: number;
  transportKind?: "stdio" | "websocket";
  reason?: string;
  reasonCode?: "provider_not_ready";
}

export interface MesaCodeAgentRunAutomationNowResult {
  status: "queued" | "duplicate";
}

export interface MesaCodeAgentWorkspaceRuntimeIdentity {
  generation: number;
  identity: string;
  processId?: number;
  workspaceKey: string;
}

export const MESA_CODE_AGENT_RUNTIME_UNAVAILABLE_CODE = "MESA_CODE_AGENT_RUNTIME_UNAVAILABLE";

export type MesaCodeAgentRuntimePolicy = "start-if-needed" | "existing-only";

export interface MesaCodeAgentRuntimeLifecycleEvent extends MesaCodeAgentWorkspaceTarget {
  workspaceKey: string;
  runtimeIdentity: MesaCodeAgentWorkspaceRuntimeIdentity;
  state: "available" | "unavailable";
}

export type MesaCodeAgentCuaPermissionObservation = CuaPermissionObservation &
  MesaCodeAgentWorkspaceTarget;

export interface MesaCodeAgentCreateSessionParams extends MesaCodeAgentWorkspaceTarget {
  sessionId?: string;
  sessionTraceId?: TraceId;
  parentSessionId?: string;
  mode?: MesaCodeSessionMode;
  model?: ModelSelection;
  persistence?: MesaCodeSessionPersistence;
  thoughtLevel?: string;
  /** automation 执行会话关闭模型二次命名，保持首条用户 query 作为稳定标题。 */
  titleGenerationEnabled?: boolean;
  mcpServers?: MesaCodeAgentMcpServer[];
  toolAllowlist?: string[];
  toolDenylist?: string[];
  importedHistory?: MesaCodeSessionImportHistory;
}

export interface MesaCodeAgentListSessionsParams extends MesaCodeAgentWorkspaceTarget {
  sessionIds?: string[];
  runtimePolicy?: MesaCodeAgentRuntimePolicy;
  includeArchived?: boolean;
  limit?: number;
}

export interface MesaCodeAgentListSessionSubagentsParams extends MesaCodeAgentSessionTarget {
  endedCursor?: string;
  endedLimit?: number;
  /** 远程 workspace 的宿主连接身份；只用于选择现有 Host，不进入 CLI wire query。 */
  remoteSessionId?: string;
}

export interface MesaCodeAgentAppUsageParams {
  range: AppUsageRange;
  timeZone?: string;
}

export interface MesaCodeAgentTaskTokenUsageParams extends MesaCodeAgentSessionTarget {}

export interface MesaCodeAgentReadSessionParams extends MesaCodeAgentSessionTarget {
  deliveryKind?: MesaCodeDeliveryKind;
  messageLimit?: number;
  afterSeq?: number;
  /** 被动索引/观察者只能读取现有 runtime，禁止为了读快照拉起 session。 */
  runtimePolicy?: MesaCodeAgentRuntimePolicy;
}

export interface MesaCodeAgentReadSessionMessagesParams extends MesaCodeAgentSessionTarget {
  afterMessageId?: string;
  limit?: number;
}

export interface MesaCodeAgentReadSessionEventsParams extends MesaCodeAgentSessionTarget {
  afterSeq?: number;
  limit?: number;
}

export type MesaCodeAgentReadWorkspacePresentationParams = MesaCodeAgentWorkspaceTarget;

export interface MesaCodeAgentGrantWorkspaceHookTrustParams extends MesaCodeAgentWorkspaceTarget {
  bundleDigest: string;
  hookDeclarationDigest: string;
}

export interface MesaCodeAgentSendPromptParamsBase extends MesaCodeAgentSessionTarget {
  modelSelection?: ModelSelection;
  modelExecution?: import("@mesa-code/shared/mesa-code-protocol-v4").CommandPayloadMap["sendText"]["modelExecution"];
  inputId?: string;
  queryId?: string;
  messageId?: string;
  sessionTraceId?: TraceId;
  content: string;
  attachments?: Record<string, unknown>[];
  /** provider-only 的当前 IAB 状态；UI/session persistence 仍使用 content 原文。 */
  browserAmbientContext?: MesaCodeBrowserAmbientContext;
  clientMode?: MesaCodeTaskClientMode;
  expectedRevision?: number;
  expectedProviderRevision?: string;
  runtimeProviderHeaders?: Record<string, string>;
  toolDenylist?: string[];
}

export type MesaCodeAgentSendPromptParams = MesaCodeAgentSendPromptParamsBase &
  MesaCodeBackgroundTurnAttribution;

export interface MesaCodeAgentCompactParams extends MesaCodeAgentSessionTarget {
  inputId?: string;
  instructions?: string;
  expectedRevision?: number;
}

export interface MesaCodeAgentGoalParams extends MesaCodeAgentSessionTarget {
  inputId?: string;
  action: MesaCodeSessionGoalAction;
  objective?: string;
  expectedRevision?: number;
}

export interface MesaCodeAgentSetModelParams extends MesaCodeAgentSessionTarget {
  model: ModelSelection;
  expectedRevision?: number;
  persistAsWorkspaceLastUsed?: boolean;
}

export interface MesaCodeAgentSetThoughtLevelParams extends MesaCodeAgentSessionTarget {
  thoughtLevel?: string;
  expectedRevision?: number;
  persistAsWorkspaceLastUsed?: boolean;
}

export interface MesaCodeAgentSetModeParams extends MesaCodeAgentSessionTarget {
  mode: MesaCodeSessionMode;
  expectedRevision?: number;
}

export interface MesaCodeAgentGenerateWorkspaceTextParams extends MesaCodeAgentWorkspaceTarget {
  selection: MesaCodeWorkspaceGenerateTextParams["selection"];
  prompt?: string;
  messages?: MesaCodeWorkspaceGenerateTextParams["messages"];
  tools?: MesaCodeWorkspaceGenerateTextParams["tools"];
  querySource: string;
  maxOutputTokens?: number;
  signal?: AbortSignal;
  /**
   * 协议层 RPC 超时。thinking 模型的长请求会超过协议 client 默认的
   * 3 分钟；调用方必须把自身 deadline 透传到这里，否则默认超时先触发、
   * 还会被 onRequestTimeout 误判 stale 杀进程。
   */
  requestTimeoutMs?: number;
}

export interface MesaCodeAgentTestModelConnectivityParams extends MesaCodeAgentWorkspaceTarget {
  selection: MesaCodeProviderTestModelConnectivityParams["selection"];
  signal?: AbortSignal;
}

export interface MesaCodeAgentDiscoverModelsParams extends MesaCodeAgentWorkspaceTarget {
  providerId: string;
  signal?: AbortSignal;
}

export interface MesaCodeAgentSessionRuntimePreferencesRequest extends MesaCodeSessionRequestRuntimePreferencesParams {
  requestId: string;
}

export interface MesaCodeAgentRespondSessionRuntimePreferencesParams {
  requestId: string;
  resolution:
    | { status: "resolved"; preferences: MesaCodeSessionRuntimePreferencesResult }
    | { status: "failed"; message: string };
}

export interface MesaCodeAgentSessionSubscribeParams extends MesaCodeAgentSessionTarget {
  deliveryKind: MesaCodeDeliveryKind;
  afterSeq?: number;
  includeSnapshot?: boolean;
  eventCoalescing?: {
    mode: "background-summary";
    intervalMs?: number;
  };
}

// ── v4 conversation 通道（竖切）──
// host 只做转发：subscribe/unsubscribe/command 透传给 CLI v4 gateway，
// v4/conversation/frame 通知按 workspace fan-out 给 renderer。

export interface MesaCodeAgentConversationSubscribeParams extends MesaCodeAgentSessionTarget {
  /** 水位不变量：仅当客户端真持有该时刻一致状态才允许带。 */
  base?: { logEpoch: string; seq: number };
  visibility?: "foreground" | "background";
}

export interface MesaCodeAgentConversationUnsubscribeParams extends MesaCodeAgentWorkspaceTarget {
  subscriptionId: string;
  runtimePolicy?: MesaCodeAgentRuntimePolicy;
}

export interface MesaCodeAgentConversationResyncParams extends MesaCodeAgentWorkspaceTarget {
  subscriptionId: string;
  base: { logEpoch: string; seq: number } | null;
  forceSnapshot?: boolean;
  runtimePolicy?: MesaCodeAgentRuntimePolicy;
}

/** 行分页 query（rows/range）：按游标向上取一窗历史行。 */
export interface MesaCodeAgentConversationRowsRangeParams extends MesaCodeAgentSessionTarget {
  /** 取 rowId < beforeRowId 的行；缺省 = 从当前尾部向前。 */
  beforeRowId?: number;
  /** 1..rowsRangeMaxLimit（200）。 */
  limit: number;
}

/** 当前有效分支里的终态 ExitPlanMode 目录。 */
export type MesaCodeAgentConversationPlansParams = MesaCodeAgentSessionTarget;

/** workflow run 的事件日志分页（详情页审计面）；cursor = journal sequence。 */
export interface MesaCodeAgentConversationWorkflowRunEventsParams extends MesaCodeAgentSessionTarget {
  runId: string;
  afterSequence?: number;
  limit?: number;
}

/** dwf run 的枚举（重启后的发现查询）。 */
export interface MesaCodeAgentConversationWorkflowRunsParams extends MesaCodeAgentSessionTarget {
  limit?: number;
}

// ── dwf 用户面产物──
// ⚠ 术语：artifact = 脚本经 `artifact.*` 发布给**用户**看的产出（文件 / markdown / 预置看板），
// 不是 run 的顶层返回值（引擎内部对后者的同名叫法）。

/** 产物清单；UI 冷恢复与中枢详情的 durable 读法。 */
export interface MesaCodeAgentConversationWorkflowRunArtifactsParams extends MesaCodeAgentSessionTarget {
  runId: string;
}

/** 预置看板的取数面；cursor = journal sequence（严格大于）。 */
export interface MesaCodeAgentConversationWorkflowRunArtifactDataParams extends MesaCodeAgentSessionTarget {
  runId: string;
  artifactId: string;
  afterSequence?: number;
  limit?: number;
}

/** 内容产物的字节，一次一块（≤ 512 KiB，形状逐字照 attachmentRead）。 */
export interface MesaCodeAgentConversationWorkflowRunArtifactReadParams extends MesaCodeAgentSessionTarget {
  runId: string;
  artifactId: string;
  version: number;
  offset: number;
  limit: number;
}

// ── dwf 工作区 transcript──
/** 轻行清单：一个 run 的 files.* / git.* / world.run 行，不带正文。 */
export interface MesaCodeAgentConversationWorkflowRunWorkspaceParams extends MesaCodeAgentSessionTarget {
  runId: string;
}

/** 一个工作区节点的正文，按 maxBytes 保形有界化（缺省与上限在 CLI 网关侧）。 */
export interface MesaCodeAgentConversationWorkflowRunNodeResultParams extends MesaCodeAgentSessionTarget {
  runId: string;
  siteId: string;
  ordinal: number;
  maxBytes?: number;
}

export interface MesaCodeAgentBackgroundBashOutputParams extends MesaCodeAgentSessionTarget {
  workId: string;
}

export interface MesaCodeAgentConversationFileChangesParams extends MesaCodeAgentSessionTarget {
  target: ConversationRowTarget;
  baseRevision: number;
  baseLogEpoch: string;
}

export interface MesaCodeAgentConversationFileRewindPreviewParams extends MesaCodeAgentSessionTarget {
  target: ConversationRowTarget;
  baseRevision: number;
  baseLogEpoch: string;
}

export interface MesaCodeAgentConversationCommandParams extends MesaCodeAgentWorkspaceTarget {
  envelope: CommandEnvelope;
  /** 仅 host 内部用于 Browser Use runtime 边界，不进入 v4 wire envelope。 */
  clientMode?: MesaCodeTaskClientMode;
}

export interface MesaCodeAgentCommandsQueryParams extends MesaCodeAgentWorkspaceTarget {
  clock?: true;
  commands: CommandKey[];
}

/** UI 不携带 connectionId；connection scope 以 trusted carrier 注入 wire identity。 */
export interface MesaCodeAgentAttachmentBeginParams extends MesaCodeAgentSessionTarget {
  uploadId: string;
  fileName: string;
  mime: string;
  totalBytes: number;
  totalChunks: number;
  checksum: string;
}

export interface MesaCodeAgentAttachmentChunkParams extends MesaCodeAgentSessionTarget {
  uploadId: string;
  chunkIndex: number;
  dataBase64: string;
}

export interface MesaCodeAgentAttachmentTerminalParams extends MesaCodeAgentSessionTarget {
  uploadId: string;
}

export interface MesaCodeAgentAttachmentReadParams extends MesaCodeAgentSessionTarget {
  ref: string;
  target?: ConversationRowTarget;
  attachmentIndex?: number;
  offset: number;
  limit: number;
}

export interface MesaCodeAgentConversationAttachmentReadParams extends MesaCodeAgentSessionTarget {
  ref: string;
  target: ConversationRowTarget;
  attachmentIndex: number;
  offset: number;
  limit: number;
}

export interface MesaCodeAgentConversationAttachmentStatParams extends MesaCodeAgentSessionTarget {
  ref: string;
  target: ConversationRowTarget;
  attachmentIndex: number;
}

export interface MesaCodeAgentAttachmentPreviewSourceParams extends MesaCodeAgentSessionTarget {
  ref: string;
  target?: ConversationRowTarget;
  attachmentIndex?: number;
}

/** host scope 内部 transport 控制面；connectionId 只能经 trusted carrier 注入。 */
export interface MesaCodeAgentConnectionFlowParams extends MesaCodeAgentWorkspaceTarget {
  state: V4ConnectionFlowState;
}

/** sessions-index：workspace 级列表订阅（无 sessionId 维度）。 */
export interface MesaCodeAgentSessionsIndexSubscribeParams extends MesaCodeAgentWorkspaceTarget {
  base?: { logEpoch: string; seq: number };
  visibility?: "foreground" | "background";
  /**
   * 订阅者作用域后缀：CLI 侧重订阅替换按 (connectionId, topic) 判定，
   * host 进程内多个独立消费者（renderer 侧栏 / task-index syncer）订阅同一 topic 时
   * 必须用不同 connectionId，否则互相替换对方的订阅代际。缺省共享 host 连接 id。
   */
  subscriberScope?: string;
  /**
   * task-list 等被动观察者必须使用 existing-only；runtime 不存在时返回稳定 unavailable，
   * 禁止为了建立列表订阅而启动 Agent。缺省保持显式会话入口的旧行为。
   */
  runtimePolicy?: MesaCodeAgentRuntimePolicy;
}

/** workspace-config：workspace 级配置目录订阅（config options + slash 目录）。 */
export interface MesaCodeAgentWorkspaceConfigSubscribeParams extends MesaCodeAgentWorkspaceTarget {
  base?: { logEpoch: string; seq: number };
  visibility?: "foreground" | "background";
  subscriberScope?: string;
  runtimePolicy?: MesaCodeAgentRuntimePolicy;
}

export type MesaCodeAgentServiceEvent =
  | { type: "session.event"; event: MesaCodeSessionEvent }
  | { type: "state.updated"; notification: MesaCodeStateUpdatedNotification }
  | { type: "permission.request"; request: MesaCodePermissionRequestParams }
  | { type: "userInput.request"; request: MesaCodeUserInputRequestParams }
  | {
      type: "userInput.response";
      requestId: string;
      response: MesaCodeUserInputResponse;
    }
  | { type: "snapshot"; snapshot: MesaCodeSessionStateSnapshot };

export interface MesaCodeAgentAppRuntimePreferences {
  askUserQuestionAutoResolutionEnabled: boolean;
  modelIoFullRetentionEnabled?: boolean;
}

export interface MesaCodeAgentLocalRuntimeChildProcesses {
  pid: number;
  provider: string;
  workspacePath: string;
  lane?: string;
  children: MesaCodeProcessChildProcess[];
}

export interface MesaCodeAgentStorageStartupSnapshot {
  generation: number;
  state: MesaCodeStorageStartupState | null;
}

export interface IMesaCodeAgentService {
  /** 控制面不需要账号或模型，且不发送普通协议请求。 */
  prepareStorage(params: MesaCodeAgentWorkspaceTarget): Promise<void>;
  getStorageStartupState(
    params: MesaCodeAgentWorkspaceTarget,
  ): Promise<MesaCodeAgentStorageStartupSnapshot | null>;
  onDynamicStorageStartupState(
    params: MesaCodeAgentWorkspaceTarget,
  ): Event<MesaCodeAgentStorageStartupSnapshot>;
  initialize(params: MesaCodeAgentWorkspaceTarget): Promise<MesaCodeAgentInitializeResult>;
  /**
   * 同步 App 全局运行时偏好到所有已活动 workspace；不得为此启动空闲 Agent。
   */
  syncAppRuntimePreferences(preferences: MesaCodeAgentAppRuntimePreferences): Promise<void>;
  getWorkspaceRuntimeIdentity(
    params: MesaCodeAgentWorkspaceTarget,
  ): Promise<MesaCodeAgentWorkspaceRuntimeIdentity>;
  createSession(params: MesaCodeAgentCreateSessionParams): Promise<MesaCodeSessionStateSnapshot>;
  resumeSession(params: MesaCodeAgentResumeSessionParams): Promise<MesaCodeSessionStateSnapshot>;
  listSessions(params: MesaCodeAgentListSessionsParams): Promise<MesaCodeSessionInfo[]>;
  listSessionSubagents(
    params: MesaCodeAgentListSessionSubagentsParams,
  ): Promise<MesaCodeSessionSubagentsResult>;
  getAppUsageStats(params: MesaCodeAgentAppUsageParams): Promise<AppUsageSnapshot>;
  getTaskTokenUsage(params: MesaCodeAgentTaskTokenUsageParams): Promise<MesaCodeTaskTokenUsageResult>;
  readSession(params: MesaCodeAgentReadSessionParams): Promise<MesaCodeSessionStateSnapshot>;
  readSessionMessages(
    params: MesaCodeAgentReadSessionMessagesParams,
  ): Promise<MesaCodeMessageWithParts[]>;
  readSessionDebug(params: MesaCodeAgentSessionTarget): Promise<SessionDebugSnapshot>;
  readSessionEvents(params: MesaCodeAgentReadSessionEventsParams): Promise<MesaCodeSessionEvent[]>;
  readWorkspacePresentation(
    params: MesaCodeAgentReadWorkspacePresentationParams,
  ): Promise<MesaCodeWorkspacePresentation>;
  /** 无 task/session 的 Settings 预信任；Agent 会重新发现并校验 canonical snapshot。 */
  grantWorkspaceHookTrust(
    params: MesaCodeAgentGrantWorkspaceHookTrustParams,
  ): Promise<MesaCodeWorkspaceHookTrustGrantResult>;
  listMcpServerStatuses(params: MesaCodeAgentListMcpServerStatusesParams): Promise<MesaCodeMcpListResult>;
  listPlugins(params: MesaCodeAgentPluginViewParams): Promise<MesaCodePluginsListResult>;
  /**
   * Plugin 对话引用 catalog：session-scoped 只读投影。
   * 走 workspace 级 agent client（session 记录只存在于该进程），不走独立插件管理进程。
   */
  getPluginReferenceCatalog(
    params: MesaCodeAgentPluginReferenceCatalogParams,
  ): Promise<MesaCodePluginsReferenceCatalogResult>;
  /** Composer Skill 引用 catalog；带 sessionId 时读取该 runtime 的冻结快照。 */
  getSkillReferenceCatalog(
    params: MesaCodeAgentSkillReferenceCatalogParams,
  ): Promise<MesaCodeSkillsReferenceCatalogResult>;
  // 已保存工作流的 GUI 中枢：workspace 级、无会话，每次调用现扫 `<cwd>/.mesaCode/workflows/`。
  // 全局档传 `scope: "global"`：带 workspace 就用它当载体，不带则由 services 层自选本机载体运行时。
  listSavedWorkflows(params: MesaCodeAgentListSavedWorkflowsParams): Promise<MesaCodeWorkflowsListResult>;
  getSavedWorkflow(params: MesaCodeAgentGetSavedWorkflowParams): Promise<MesaCodeWorkflowsGetResult>;
  updateSavedWorkflowMeta(
    params: MesaCodeAgentUpdateSavedWorkflowMetaParams,
  ): Promise<MesaCodeWorkflowsUpdateMetaResult>;
  deleteSavedWorkflow(
    params: MesaCodeAgentDeleteSavedWorkflowParams,
  ): Promise<MesaCodeWorkflowsDeleteResult>;
  listSavedWorkflowRuns(
    params: MesaCodeAgentListSavedWorkflowRunsParams,
  ): Promise<MesaCodeWorkflowsRunsResult>;
  // 在项目档 / 全局档之间移动同名文件：
  // `workspace` 是载体（移到项目传目标项目、移到全局传源项目），`to` 是落点档；不覆盖已存在的目标。
  moveSavedWorkflow(params: MesaCodeAgentMoveSavedWorkflowParams): Promise<MesaCodeWorkflowsMoveResult>;
  resolveSuggestedPluginReference(
    params: MesaCodeAgentResolveSuggestedPluginReferenceParams,
  ): Promise<import("@mesa-code/shared").MesaCodePluginsResolveSuggestedReferenceResult>;
  /** 推荐项 Plugin 首次本地检查缺失后的 operation-scoped 刷新进度。 */
  onDynamicPluginOperationProgress(
    operationId: string,
  ): Event<MesaCodePluginOperationProgressNotification>;
  getPluginsOverview(params: MesaCodeAgentPluginViewParams): Promise<MesaCodePluginsOverviewResult>;
  /**
   * 资源管理器：枚举本 Host 内全部本地 Agent 进程（含 plugin / mcp-status 泳道），
   * 并向每个存活 runtime 请求 `process/childProcesses`；单个 runtime 失败只让它的 children 为空。
   */
  collectLocalRuntimeChildProcesses(
    signal?: AbortSignal,
  ): Promise<MesaCodeAgentLocalRuntimeChildProcesses[]>;
  addPluginMarketplace(
    params: MesaCodeAgentAddPluginMarketplaceParams,
  ): Promise<MesaCodePluginsMarketplaceMutationResult>;
  removePluginMarketplace(
    params: MesaCodeAgentRemovePluginMarketplaceParams,
  ): Promise<MesaCodePluginsMarketplaceMutationResult>;
  updatePluginMarketplace(
    params: MesaCodeAgentUpdatePluginMarketplaceParams,
  ): Promise<MesaCodePluginsMarketplaceMutationResult>;
  installPlugin(params: MesaCodeAgentInstallPluginParams): Promise<MesaCodePluginsInstallResult>;
  cancelPluginOperation(
    params: MesaCodeAgentCancelPluginOperationParams,
  ): Promise<MesaCodePluginsCancelOperationResult>;
  uninstallPlugin(params: MesaCodeAgentUninstallPluginParams): Promise<MesaCodePluginsUninstallResult>;
  updatePlugin(params: MesaCodeAgentUpdatePluginParams): Promise<MesaCodePluginsInstallResult>;
  restoreBuiltinPlugin(
    params: MesaCodeAgentRestoreBuiltinPluginParams,
  ): Promise<MesaCodePluginsRestoreBuiltinResult>;
  configurePlugin(params: MesaCodeAgentConfigurePluginParams): Promise<MesaCodePluginsConfigureResult>;
  resetPluginConfig(
    params: MesaCodeAgentResetPluginConfigParams,
  ): Promise<MesaCodePluginsConfigureResult>;
  validatePlugin(params: MesaCodeAgentValidatePluginParams): Promise<MesaCodePluginsValidateResult>;
  describePlugin(params: MesaCodeAgentDescribePluginParams): Promise<MesaCodePluginsDescribeResult>;
  setPluginEnabled(params: MesaCodeAgentSetPluginEnabledParams): Promise<MesaCodePluginsSetEnabledResult>;
  // ---- 定时任务(automation)管理 ----
  listAutomations(params: MesaCodeAgentWorkspaceTarget): Promise<MesaCodeAutomation[]>;
  listAllAutomations(): Promise<MesaCodeAutomation[]>;
  createAutomation(params: MesaCodeAgentCreateAutomationParams): Promise<MesaCodeAutomation>;
  updateAutomation(params: MesaCodeAgentUpdateAutomationParams): Promise<MesaCodeAutomation | null>;
  deleteAutomation(params: MesaCodeAgentAutomationIdParams): Promise<void>;
  setAutomationEnabled(params: MesaCodeAgentSetAutomationEnabledParams): Promise<void>;
  restartAutomation(params: MesaCodeAgentAutomationIdParams): Promise<void>;
  runAutomationNow(params: MesaCodeAgentAutomationIdParams): Promise<MesaCodeAgentRunAutomationNowResult>;
  listAutomationRuns(params: MesaCodeAgentAutomationIdParams): Promise<MesaCodeAutomationRun[]>;
  deleteAutomationRun(params: MesaCodeAgentDeleteAutomationRunParams): Promise<void>;
  generateWorkspaceText(
    params: MesaCodeAgentGenerateWorkspaceTextParams,
  ): Promise<MesaCodeWorkspaceGenerateTextResult>;
  testModelConnectivity(
    params: MesaCodeAgentTestModelConnectivityParams,
  ): Promise<MesaCodeProviderTestModelConnectivityResult>;
  /**
   * Read-only probe of a provider's model catalog endpoint.
   * Credential resolution lives in the CLI, so the settings surface cannot call the
   * provider directly; failure is returned as a value, not thrown.
   */
  discoverModels(params: MesaCodeAgentDiscoverModelsParams): Promise<MesaCodeProviderDiscoverModelsResult>;
  /**
   * @deprecated：send 主路径已收敛 v4 sendText 命令。仅剩两个消费点——
   * adapter 带附件输入回退（待附件命令面落地后移除）与 mesaCodeSessionService
   * pass-through；新代码禁止回用。
   */
  sendPrompt(params: MesaCodeAgentSendPromptParams): Promise<MesaCodeSessionSendResult>;
  compactSession(params: MesaCodeAgentCompactParams): Promise<MesaCodeSessionCompactResult>;
  goalSession(params: MesaCodeAgentGoalParams): Promise<MesaCodeSessionGoalResult>;
  closeSession(
    params: MesaCodeAgentSessionTarget & { expectedPersistence?: "deferred" | "immediate" },
  ): Promise<boolean>;
  setModel(params: MesaCodeAgentSetModelParams): Promise<MesaCodeSessionStateSnapshot>;
  setThoughtLevel(params: MesaCodeAgentSetThoughtLevelParams): Promise<MesaCodeSessionStateSnapshot>;
  setMode(params: MesaCodeAgentSetModeParams): Promise<MesaCodeSessionStateSnapshot>;
  respondSessionRuntimePreferences(
    params: MesaCodeAgentRespondSessionRuntimePreferencesParams,
  ): Promise<void>;
  onDynamicSessionRuntimePreferencesRequest(): Event<MesaCodeAgentSessionRuntimePreferencesRequest>;
  /**
   * CLI 进程级资源样本，带 services 打的 lane 标签（CLI 自己不知道 lane）。
   * 使用 dynamic event 避免 RPC 服务在无人订阅时缓冲周期事件；
   * 该事件不属于 session/conversation continuous 或 replayable 状态。
   */
  onDynamicProcessResourceSample(): Event<AgentLaneResourceSample>;
  /** MCP 进程生命周期与低频内存事件，仅供可信 Host relay 上报 ARMS。 */
  onDynamicMcpTelemetry(): Event<MesaCodeMcpTelemetryEvent>;
  /** MCP 进程树资源事实，只供可信 Host 汇总上报。 */
  onDynamicMcpResourceSamples(): Event<MesaCodeMcpResourceSample[]>;
  /** Bash 完成事实，仅可信 Host 资源旁路订阅。 */
  onDynamicToolExecResource(): Event<MesaCodeToolExecResource>;
  /**
   * @deprecated 旧协议订阅面（session/subscribe + session/event + state.updated）。
   * task-index syncer 已迁 v4 sessions-index/workspace-config 帧；
   * 仅剩 mesa-code-task-service-adapter.onDynamicTaskEvent（replayable 读路径）消费。
   * 写路径已收敛 v4 命令面；本订阅是读路径投影源。
   */
  onDynamicSessionEvent(params: MesaCodeAgentSessionSubscribeParams): Event<MesaCodeAgentServiceEvent>;
  // ── v4 conversation 通道（竖切）──
  /** RPC attachment 建立后先读取 host 可信 hello。 */
  helloConversationV4(): Promise<HelloMessage>;
  /** hello 校验后回送 clientHello；metadata 不能覆盖 connection mode/profile。 */
  initializeConversationV4(clientHello: ClientHello): Promise<void>;
  /** 仅供 trusted host relay/facade；terminal RPC caller 必须被 connection scope 拒绝。 */
  setConnectionFlowStateV4(params: MesaCodeAgentConnectionFlowParams): Promise<void>;
  subscribeConversationV4(
    params: MesaCodeAgentConversationSubscribeParams,
  ): Promise<V4ConversationSubscribeResult>;
  resyncConversationV4(
    params: MesaCodeAgentConversationResyncParams,
  ): Promise<V4ConversationResyncResult>;
  unsubscribeConversationV4(params: MesaCodeAgentConversationUnsubscribeParams): Promise<void>;
  /** rows/range 行分页 query（loadOlder 游标向上补历史）。 */
  conversationRowsRangeV4(
    params: MesaCodeAgentConversationRowsRangeParams,
  ): Promise<V4ConversationRowsRangeResult>;
  conversationPlansV4(
    params: MesaCodeAgentConversationPlansParams,
  ): Promise<V4ConversationPlansResult>;
  /** workflow run 事件日志分页；与 plans 同族（只读、无状态、超时重发安全）。 */
  conversationWorkflowRunEventsV4(
    params: MesaCodeAgentConversationWorkflowRunEventsParams,
  ): Promise<V4ConversationWorkflowRunEventsResult>;
  /** workflow run 枚举；journal-backed 的重启后发现面。 */
  conversationWorkflowRunsV4(
    params: MesaCodeAgentConversationWorkflowRunsParams,
  ): Promise<V4ConversationWorkflowRunsResult>;
  /** workflow run 的用户面产物清单；与 plans 同族（只读、无状态、超时重发安全）。 */
  conversationWorkflowRunArtifactsV4(
    params: MesaCodeAgentConversationWorkflowRunArtifactsParams,
  ): Promise<V4ConversationWorkflowRunArtifactsResult>;
  /** 预置看板的条目分页；hook 以 itemCount 变化为信号增量拉取。 */
  conversationWorkflowRunArtifactDataV4(
    params: MesaCodeAgentConversationWorkflowRunArtifactDataParams,
  ): Promise<V4ConversationWorkflowRunArtifactDataResult>;
  /** 内容产物的字节，一次一块；授权在 CLI 侧（journal 行才是取字节的依据）。 */
  conversationWorkflowRunArtifactReadV4(
    params: MesaCodeAgentConversationWorkflowRunArtifactReadParams,
  ): Promise<V4ConversationWorkflowRunArtifactReadResult>;
  /** dwf 工作区 transcript 的清单。 */
  conversationWorkflowRunWorkspaceV4(
    params: MesaCodeAgentConversationWorkflowRunWorkspaceParams,
  ): Promise<V4ConversationWorkflowRunWorkspaceResult>;
  /** 一个工作区节点的有界正文。 */
  conversationWorkflowRunNodeResultV4(
    params: MesaCodeAgentConversationWorkflowRunNodeResultParams,
  ): Promise<V4ConversationWorkflowRunNodeResultResult>;
  backgroundBashOutputV4(
    params: MesaCodeAgentBackgroundBashOutputParams,
  ): Promise<BackgroundBashOutputResult>;
  conversationFileChangesV4(
    params: MesaCodeAgentConversationFileChangesParams,
  ): Promise<V4ConversationFileChangesResult>;
  conversationFileRewindPreviewV4(
    params: MesaCodeAgentConversationFileRewindPreviewParams,
  ): Promise<V4ConversationFileRewindPreviewResult>;
  sendConversationCommandV4(params: MesaCodeAgentConversationCommandParams): Promise<CommandAck>;
  queryConversationCommandsV4(params: MesaCodeAgentCommandsQueryParams): Promise<CommandsQueryResult>;
  attachmentBeginV4(params: MesaCodeAgentAttachmentBeginParams): Promise<V4AttachmentBeginResult>;
  attachmentChunkV4(params: MesaCodeAgentAttachmentChunkParams): Promise<V4AttachmentChunkResult>;
  attachmentCommitV4(params: MesaCodeAgentAttachmentTerminalParams): Promise<V4AttachmentCommitResult>;
  attachmentAbortV4(params: MesaCodeAgentAttachmentTerminalParams): Promise<void>;
  /** Desktop local 已发送视频 source query；远端与 Web 返回 chunked。 */
  attachmentPreviewSourceV4(
    params: MesaCodeAgentAttachmentPreviewSourceParams,
  ): Promise<V4AttachmentPreviewSourceResult>;
  /** 已发送 image/video 只读分块查询；connection scope 注入可信 workspace 连接。 */
  attachmentReadV4(params: MesaCodeAgentAttachmentReadParams): Promise<V4AttachmentReadResult>;
  /** Share 读取 userInput 附件，允许 text/plain 等非媒体类型。 */
  conversationAttachmentReadV4(
    params: MesaCodeAgentConversationAttachmentReadParams,
  ): Promise<V4ConversationAttachmentReadResult>;
  /** Share 选择阶段只读 userInput 附件元数据，不读取完整内容。 */
  conversationAttachmentStatV4(
    params: MesaCodeAgentConversationAttachmentStatParams,
  ): Promise<V4ConversationAttachmentStatResult>;
  /** workspace 级下行帧流（v4/conversation/frame），renderer 侧按 topic 自行路由。 */
  onDynamicConversationFrame(
    params: MesaCodeAgentWorkspaceTarget,
  ): Event<ConversationTopicWireCandidate>;
  /** workspace 级 live telemetry 事实；connection facade 仅向可信 desktop-continuous 下游暴露。 */
  onDynamicLocalTtftFacts(
    params: MesaCodeAgentWorkspaceTarget,
  ): Event<import("@mesa-code/shared").LocalTtftFacts>;
  onDynamicConversationTelemetryFact(
    params: MesaCodeAgentWorkspaceTarget,
  ): Event<ConversationTelemetryFact>;
  /** 当前窗口全部本地 live task 的 CUA 权限观察；历史、远程与 replayable 不在此事件面。 */
  onDynamicCuaPermissionObservation(): Event<MesaCodeAgentCuaPermissionObservation>;
  // ── sessions-index 通道（列表活性）──
  subscribeSessionsIndexV4(
    params: MesaCodeAgentSessionsIndexSubscribeParams,
  ): Promise<V4SessionsIndexSubscribeResult>;
  resyncSessionsIndexV4(
    params: MesaCodeAgentConversationResyncParams,
  ): Promise<V4ConversationResyncResult>;
  unsubscribeSessionsIndexV4(params: MesaCodeAgentConversationUnsubscribeParams): Promise<void>;
  /** workspace 级 sessions-index 下行帧流（与 conversation 同一通知，按 topic 前缀分流）。 */
  onDynamicSessionsIndexFrame(
    params: MesaCodeAgentWorkspaceTarget,
  ): Event<SessionsIndexTopicWireCandidate>;
  // ── workspace-config 通道（配置目录活性；task-index syncer 消费）──
  subscribeWorkspaceConfigV4(
    params: MesaCodeAgentWorkspaceConfigSubscribeParams,
  ): Promise<V4WorkspaceConfigSubscribeResult>;
  resyncWorkspaceConfigV4(
    params: MesaCodeAgentConversationResyncParams,
  ): Promise<V4ConversationResyncResult>;
  unsubscribeWorkspaceConfigV4(params: MesaCodeAgentConversationUnsubscribeParams): Promise<void>;
  /** workspace 级 workspace-config 下行帧流（与 conversation 同一通知，按 topic 前缀分流）。 */
  onDynamicWorkspaceConfigFrame(
    params: MesaCodeAgentWorkspaceTarget,
  ): Event<WorkspaceConfigTopicWireCandidate>;
  /**
   * （CLI 重连重订）：agent 进程换代通知（超时回收/崩溃后重新拉起）。
   * v4 订阅活在 CLI 进程内存，进程换代即失效；订阅方（task-index syncer 等）
   * 收到后必须对该 workspaceKey 重发 subscribe，否则帧流静默中断。
   */
  onAgentRuntimeRestarted(listener: (event: { workspaceKey: string }) => void): IDisposable;
  /**
   * Agent client 在 service 内完成登记后发布 available，当前 client 关闭后发布 unavailable。
   * 这是被动 observer attach/detach 的唯一生命周期信号，不表达用户使用租约。
   */
  onAgentRuntimeLifecycle?: (
    listener: (event: MesaCodeAgentRuntimeLifecycleEvent) => void,
  ) => IDisposable;
  /** 当前 desktop-local CUA turn 是否仍在执行，用于 Helper recovery 避免中途回收 Agent。 */
  hasActiveCuaOperationTurn(): boolean;
  disposeWorkspace(params: MesaCodeAgentWorkspaceTarget): Promise<void>;
  disposeAll(): void;
}

export const IMesaCodeAgentService = createServiceDescriptor<IMesaCodeAgentService>(
  ServiceChannels.MesaCodeAgent,
);
