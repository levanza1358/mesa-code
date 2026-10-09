# Workspace only 权限边界

## 一句话

「Workspace only」是叠加在三种权限模式之上的**边界开关**，不是第四种权限模式。
开启后，会话只允许在当前 workspace 内作业；关闭后，只有在用户明确要求时才允许越界。

## 位置

- UI：聊天工具栏左下角的模式选择器（`V4ComposerModeSwitch`）展开菜单，位于三种权限单选之下、
  用分隔线隔开的切换行。Plan 勾选项之上是权限单选，分隔线之下是 Workspace only。
- 命令面（legacy，非 v4）：`session/setMode` 的 `workspaceOnly` 可选字段。
- v4 协议：`SessionConfigState.workspaceOnly`、`createSession.config.workspaceOnly`、
  `firstInput.workspaceOnly`、`sendText.workspaceOnly`、`sendGoalCommand.workspaceOnly`。

## 与 mode / planEnabled 的关系

三者**正交**：

| 维度 | 取值 | 语义 |
| --- | --- | --- |
| `mode` | `build` / `edit` / `yolo`（+ 内部 `auto`） | 每次工具调用的确认策略 |
| `planEnabled` | `true` / `false` | 是否处于 Plan 阶段（只调研、不落地） |
| `workspaceOnly` | `true` / `false` | 是否把会话限制在 workspace 内 |

因此：

- Workspace only 对 **build / edit / yolo 三种权限模式全部生效**，不是只对 Full Access。
- Plan 勾选与 Workspace only 互不影响。
- 「Full access」= `yolo`，它只意味着**不再逐次确认**；Workspace only 仍然约束它能碰哪些路径。

## 默认值

**默认 OFF**，保持仓库原有的「允许访问 workspace 之外路径」行为不变。
只有用户显式打开才会进入约束状态。默认值同时影响：

- `executionStateSchema.workspaceOnly`（`.default(false)`）
- `resolveExecutionState()`（`input.workspaceOnly ?? current.workspaceOnly ?? false`）
- `SessionConfigState.workspaceOnly`（`optional`，旧快照无该字段时解析为未设置）

## 强制程度：文件工具 = 硬边界，Bash = 尽力护栏

### 文件工具（硬边界，可依赖）

`resolveWorkspacePath()`（`core/src/tool/path-policy.ts`）在 `workspaceOnly === true` 时，
对**解析后的绝对路径**做 `isPathInsideWorkspace()` 判定，越界直接抛错，不进入
权限确认流程，也没有任何绕过路径。覆盖的工具：

`Read`、`Write`、`Edit`、`Glob`、`Grep`、`NotebookEdit` 等所有经过
`resolveWorkspacePath` / `resolveToolWorkingDirectory` 的路径解析。

判定规则：`candidate` 等于 workspace root，或 `relative(root, candidate)` 不以 `..` 开头
且不是绝对路径 → 允许；否则拒绝。错误消息里带 `reason: "workspace_only"`，便于日志聚类。

### Bash（尽力护栏，**不是**安全边界）

本仓库的 **OS 级 Bash sandbox 已被移除**：`ExecutionSandboxPolicy` 仍留在
`contracts/src/interfaces/execution.port.ts`，但没有任何 adapter 读取它，
`node-execution-adapter-run.ts` 里有注释说明「sandbox 撤除后」。
因此 Bash 无法像文件工具那样给出强保证。

`bash-workspace-only.ts` 做两件诚实的事：

1. **固定 cwd**：`resolveBashWorkspaceCwd()` 在开启时把命令的 cwd 钉死在 workspace root，
   相对路径不会静默解析到外面。
2. **拦截明显越界**：`resolveBashWorkspaceOnlyViolation()` 拒绝
   - 命令中出现的绝对路径（`/x`、`C:\x`、`\\server\share` 等，正则为 `ABSOLUTE_PATH_PATTERN`）；
   - `..` 作为路径段出现（`cd ..`、`cat ../x`）——即便不是绝对路径，cwd 钉在根之后
     仍可能越界。

**已知且被接受的限制**：通过间接手段（解释器一行命令、下载的可执行文件、环境变量拼接
路径等）仍可逃出。这是为什么本特性在提示词里就明确声明规则，并把 Bash 侧检查
描述为「护栏」而不是「沙箱」。若要升级为硬保证，需要把 OS sandbox 重新引入。

### 提示词（先验约束）

开启时，每一轮都会注入系统提醒 `workspace_only`（`runtime-reminders.ts`
的 `WORKSPACE_ONLY_REMINDER` / `buildWorkspaceOnlyReminderBody`），
明确告诉模型：把 workspace root 当作整个文件系统，不要尝试绝对路径、`..`、
用户 home 目录，需要外部文件时**停下来请用户关闭 Workspace only**。

这样做的目的：让约束在模型**规划阶段**就生效，而不是等它撞上被拒绝的工具调用。
用户在需求里明确要求「开启时模型不应该想到要出去做」。

## 状态流转

1. UI 在模式菜单里切换 → 只写 Composer 草稿（`V4ComposerDraft.workspaceOnly`），
   与 mode / planEnabled 同一层级，随 session scope 持久化到 localStorage。
2. 提交（`sendText` / `sendGoalCommand` / `createSession.firstInput`）时，
   `composerSubmissionConfig` 冻结成 `ComposerSubmissionConfig.workspaceOnly`，
   随 Submission 一起进 command / queue item / `conversationInputIntent`。
3. runtime 在 `applySubmissionExecutionState` 里发现 `intent.workspaceOnly !== undefined`
   就调用 `applyRuntimeExecutionState`，写 `runtime.config.workspaceOnly`、
   持久化 `SESSION_ENTRY_EXECUTION_STATE`、发布 `SessionModeChanged`
   （带 `workspaceOnly` / `previousWorkspaceOnly`）。
4. 工具执行时通过 `context.sessionModePort.isWorkspaceOnly()` 读到当前值。
5. 冷恢复：`transcript-hydration` 从持久化 intent 还原 `workspaceOnly`；
   `v4-bridge` 的 config seed 用 `runtime.getWorkspaceOnly()` 初始化投影；
   `product-projection` 的 `SessionModeChanged` reducer 把 `workspaceOnly` 写进
   `config.workspaceOnly` 并推送 `state.updated` delta。

## 测试

- `core/test/workspace-only-policy.test.ts`：文件路径硬边界（root 本身、兄弟目录、
  绝对越界路径、关闭后放行）+ `isPathInsideWorkspace` + Bash 护栏
  （`..` 拦截、关闭时惰性、纯 workspace 内命令放行）。

## 相关文件

| 关注点 | 文件 |
| --- | --- |
| 共享执行状态 | `packages/shared/src/execution-state.ts` |
| v4 会话配置 | `packages/shared/src/mesa-code-protocol-v4/session-config.ts` |
| v4 命令载荷 | `packages/shared/src/mesa-code-protocol-v4/command.ts`、`input-intent.ts` |
| 文件路径硬边界 | `core/src/tool/path-policy.ts` |
| Bash 护栏 | `core/src/tool/handlers/bash-workspace-only.ts`、`bash.ts` |
| 提示词 | `core/src/runtime/helpers/runtime-reminders.ts`、`system-reminder/source.ts` |
| 状态应用 | `core/src/runtime/execution-state.ts`、`methods/turn-model.ts` |
| 投影 | `bootstrap/src/mesa-code-protocol-v4/product-projection.ts` |
| UI | `packages/ui/src/v4/composer/V4ComposerModeControls.tsx` |
