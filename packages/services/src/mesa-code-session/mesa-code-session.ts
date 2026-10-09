import { ServiceChannels } from "@mesa-code/shared";
import type {
  TraceId,
  MesaCodeAgentMcpServer,
  MesaCodeDeliveryKind,
  MesaCodeMessageWithParts,
  ModelSelection,
  MesaCodePermissionRequestParams,
  MesaCodeUserInputRequestParams,
  MesaCodeUserInputResponse,
  MesaCodeSessionInfo,
  MesaCodeSessionImportHistory,
  MesaCodeSessionEvent,
  MesaCodeSessionMode,
  MesaCodeSessionPersistence,
  MesaCodeSessionStateSnapshot,
  MesaCodeStateUpdatedNotification,
  MesaCodeWorkspacePresentation,
} from "@mesa-code/shared";
import { createServiceDescriptor } from "#src/descriptors.js";

export interface MesaCodeSessionWorkspaceTarget {
  workspacePath: string;
  workspaceIdentity?: string;
  remoteSessionId?: string;
}

export type MesaCodeSessionReadWorkspacePresentationParams = MesaCodeSessionWorkspaceTarget;

export interface MesaCodeTaskTarget extends MesaCodeSessionWorkspaceTarget {
  sessionId: string;
}

export interface MesaCodeSessionCreateParams extends MesaCodeSessionWorkspaceTarget {
  /** 仅导入事务使用的预分配 ID；普通新会话继续由 Agent 分配。 */
  sessionId?: string;
  sessionTraceId?: TraceId;
  parentSessionId?: string;
  mode?: MesaCodeSessionMode;
  model?: ModelSelection;
  persistence?: MesaCodeSessionPersistence;
  thoughtLevel?: string;
  mcpServers?: MesaCodeAgentMcpServer[];
  importedHistory?: MesaCodeSessionImportHistory;
}

export interface MesaCodeSessionResumeParams extends MesaCodeTaskTarget {
  model?: ModelSelection;
  thoughtLevel?: string;
  mcpServers?: MesaCodeAgentMcpServer[];
  /**
   * 默认广播 resume 得到的历史快照，并让 shadow 订阅请求初始 snapshot。
   * 续聊发送前的 runtime 预恢复会关闭它，避免旧终态快照覆盖本地已开始的新输入运行态。
   */
  broadcastSnapshot?: boolean;
}

export interface MesaCodeSessionListParams extends MesaCodeSessionWorkspaceTarget {
  includeArchived?: boolean;
  limit?: number;
}

export interface MesaCodeSessionReadParams extends MesaCodeTaskTarget {
  deliveryKind?: MesaCodeDeliveryKind;
  messageLimit?: number;
  afterSeq?: number;
}

export interface MesaCodeSessionMessagesParams extends MesaCodeTaskTarget {
  afterMessageId?: string;
  limit?: number;
}

export interface MesaCodeSessionEventsParams extends MesaCodeTaskTarget {
  afterSeq?: number;
  limit?: number;
}

export interface MesaCodeSessionSetModelParams extends MesaCodeTaskTarget {
  model: ModelSelection;
  expectedRevision?: number;
  persistAsWorkspaceLastUsed?: boolean;
}

export interface MesaCodeSessionSetThoughtLevelParams extends MesaCodeTaskTarget {
  thoughtLevel?: string;
  expectedRevision?: number;
  persistAsWorkspaceLastUsed?: boolean;
}

export interface MesaCodeSessionSetModeParams extends MesaCodeTaskTarget {
  mode: MesaCodeSessionMode;
  expectedRevision?: number;
}

export interface MesaCodeSessionSubscribeParams extends MesaCodeTaskTarget {
  deliveryKind: MesaCodeDeliveryKind;
  afterSeq?: number;
  includeSnapshot?: boolean;
  eventCoalescing?: {
    mode: "background-summary";
    intervalMs?: number;
  };
}

export type MesaCodeSessionServiceEvent =
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

export interface MesaCodeSessionInitializeResult {
  available: boolean;
  workspaceKey: string;
  protocolName?: string;
  protocolVersion?: number;
  transportKind?: "stdio" | "websocket";
  reason?: string;
  reasonCode?: "provider_not_ready";
}

export interface MesaCodeSessionWorkspaceRuntimeIdentity {
  generation: number;
  identity: string;
  processId?: number;
  workspaceKey: string;
}

export interface IMesaCodeSessionService {
  initializeWorkspace(params: MesaCodeSessionWorkspaceTarget): Promise<MesaCodeSessionInitializeResult>;
  getWorkspaceRuntimeIdentity(
    params: MesaCodeSessionWorkspaceTarget,
  ): Promise<MesaCodeSessionWorkspaceRuntimeIdentity>;
  readWorkspacePresentation(
    params: MesaCodeSessionReadWorkspacePresentationParams,
  ): Promise<MesaCodeWorkspacePresentation>;
  createSession(params: MesaCodeSessionCreateParams): Promise<MesaCodeSessionStateSnapshot>;
  resumeSession(params: MesaCodeSessionResumeParams): Promise<MesaCodeSessionStateSnapshot>;
  listSessions(params: MesaCodeSessionListParams): Promise<MesaCodeSessionInfo[]>;
  readSession(params: MesaCodeSessionReadParams): Promise<MesaCodeSessionStateSnapshot>;
  readSessionMessages(params: MesaCodeSessionMessagesParams): Promise<MesaCodeMessageWithParts[]>;
  readSessionEvents(params: MesaCodeSessionEventsParams): Promise<MesaCodeSessionEvent[]>;
  promoteDeferredDraftSession(params: MesaCodeTaskTarget): Promise<void>;
  closeSession(params: MesaCodeTaskTarget): Promise<void>;
  closeDeferredDraftSession(params: MesaCodeTaskTarget): Promise<boolean>;
  setModel(params: MesaCodeSessionSetModelParams): Promise<MesaCodeSessionStateSnapshot>;
  setThoughtLevel(params: MesaCodeSessionSetThoughtLevelParams): Promise<MesaCodeSessionStateSnapshot>;
  setMode(params: MesaCodeSessionSetModeParams): Promise<MesaCodeSessionStateSnapshot>;
  // renderer 订阅面走 agentService 的 conversation/sessions-index 帧通道。
}

export const IMesaCodeSessionService = createServiceDescriptor<IMesaCodeSessionService>(
  ServiceChannels.MesaCodeSession,
);
