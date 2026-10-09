import { z } from "zod";

/** auto 保留为内部权限；plan 仅在旧格式读取边界接受。 */
export const executionPermissionModeSchema = z.enum(["build", "edit", "yolo", "auto"]);
export const executionStateSchema = z.object({
  mode: executionPermissionModeSchema,
  planEnabled: z.boolean(),
  /**
   * 会话是否被限制在 workspace 内。开启后文件工具拒绝 workspace 外路径，
   * Bash 也会被要求待在 workspace 内。默认 false，保持原有可访问外部路径的行为。
   */
  workspaceOnly: z.boolean().default(false),
});
export type ExecutionState = z.infer<typeof executionStateSchema>;

export type ExecutionStateInput = {
  mode?: string;
  planEnabled?: boolean;
  workspaceOnly?: boolean;
};

/** 在接纳边界固定旧请求语义，不能在队列消费时按当前配置重新解释。 */
export function resolveExecutionState(
  input: ExecutionStateInput,
  current: ExecutionState = { mode: "build", planEnabled: false, workspaceOnly: false },
): ExecutionState {
  const mode = executionPermissionModeSchema.safeParse(input.mode);
  return {
    mode: mode.success ? mode.data : current.mode,
    planEnabled:
      input.planEnabled ??
      (input.mode === "plan" ? true : mode.success ? false : current.planEnabled),
    workspaceOnly: input.workspaceOnly ?? current.workspaceOnly ?? false,
  };
}
