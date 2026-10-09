/**
 * MesaCode Agent Slash Commands 便捷 hook
 *
 * 返回当前 workspace 下 Agent 广播的可用 slash commands 列表。
 */
import { useMesaCodeSessionStore, selectWorkspaceMesaCodeState } from "../store/mesa-code-session-store.js";

export function useSlashCommands(workspacePath: string, workspaceIdentity?: string) {
  return useMesaCodeSessionStore(
    (state) => selectWorkspaceMesaCodeState(state, workspacePath, workspaceIdentity).slashCommands,
  );
}
