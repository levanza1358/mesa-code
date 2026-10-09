import type { MesaCodeSessionStateSnapshot } from "@mesa-code/shared";
import { createServiceLogger } from "#src/logger/serviceLogger.js";
import { repairImportedClaudeSessionSnapshot } from "#src/session/claude-native/importedClaudeHistoryRepair.js";
import type { IMesaCodeAgentService } from "#src/mesa-code-agent/mesa-code-agent.js";
import type {
  MesaCodeSessionReadParams,
  MesaCodeSessionResumeParams,
} from "#src/mesa-code-session/mesa-code-session.js";

const logger = createServiceLogger("mesa-code-session-service");

export async function repairEmptyImportedClaudeSessionSnapshot(params: {
  agentService: IMesaCodeAgentService;
  snapshot: MesaCodeSessionStateSnapshot;
  target: MesaCodeSessionResumeParams | MesaCodeSessionReadParams;
}): Promise<MesaCodeSessionStateSnapshot> {
  const repaired = await repairImportedClaudeSessionSnapshot({
    snapshot: params.snapshot,
    target: {
      workspacePath: params.target.workspacePath,
      workspaceIdentity: params.target.workspaceIdentity,
      taskId: params.target.sessionId,
      ...("mcpServers" in params.target && params.target.mcpServers
        ? { mcpServers: params.target.mcpServers }
        : {}),
    },
    createSession: (input) => params.agentService.createSession(input),
    onRepair: (history) => {
      logger.warn(
        undefined,
        `[mesa-code-session-service] Claude 导入 session 历史异常，按 ${history.source} 回填 taskId=${params.target.sessionId}`,
      );
    },
  });
  return repaired ?? params.snapshot;
}
