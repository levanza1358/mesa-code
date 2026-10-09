import type { MesaCodeTaskMeta } from "@mesa-code/shared";
import { buildTaskWorkspaceKey } from "@/lib/taskQueryCache.js";

function taskKey(
  task: Pick<MesaCodeTaskMeta, "workspacePath" | "workspaceIdentity" | "taskId">,
): string {
  return `${buildTaskWorkspaceKey(task.workspacePath, task.workspaceIdentity)}\u0000${task.taskId}`;
}

export { taskKey };
