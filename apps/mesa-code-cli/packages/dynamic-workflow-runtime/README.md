# @mesa-code/dynamic-workflow-runtime

A sandbox harness for the dynamic workflow execution engine. It runs a workflow script in a controlled child process and bridges the child process `__host.*` calls to the pure `@mesa-code/dynamic-workflow` engine core over NDJSON.

## Dependency Boundary

This package depends **only** on the workspace package `@mesa-code/dynamic-workflow` and Node.js built-ins. It must never import `@mesa-code/core`, `@mesa-code/contracts`, `@mesa-code/bootstrap`, or `@mesa-code/adapters`. This proves that the complete sandbox-to-engine pipeline can run without the app layer.

## 用法

```ts
import { runWorkflowScript } from "@mesa-code/dynamic-workflow-runtime";

const settlement = await runWorkflowScript({
  scriptText,                 // 或 lowered: <async 函数体>
  caps: { maxConcurrency: 16 },
  askSpecs,                   // site id ∈ 合成 schemas 记录即 typed
  validate,                   // @mesa-code/dynamic-workflow 的 validate（适配到 ValidateFn）
  makeDriver: (sink) => driver, // driver 自带 journal + emit；sink 是引擎的向上回报面
  signal,                     // 可选：AbortSignal
  timeoutMs,                  // 可选：墙钟超时
});
// settlement: { status: "completed", artifact } | { status: "failed", error } | { status: "cancelled" }
```

## 架构

```
┌─ parent (harness) ──────────────┐  NDJSON  ┌─ child (vm.createContext) ──────┐
│ runWorkflowScript               │  stdio   │ 只含 ES intrinsics + __host       │
│  - lower(scriptText)            │◀────────▶│  createActor 同步返回 local 句柄  │
│  - WorkflowEngine(driver,...)   │          │  ask/worldRead → 请求父进程       │
│  - 桥接 __host.* ↔ engine       │          │  args 冻结全局（spawn 时过界一次）  │
│  - spawn/kill/timeout/abort     │          │  Date.now/Math.random 运行期禁令  │
└─────────────────────────────────┘          └──────────────────────────────────┘
```

## NDJSON 线协议

见 `src/protocol.ts`（唯一真源）。child→parent：`create-actor`（即发即忘）/ `request`（ask、
world-read）/ `event`（log）/ `complete`；parent→child：`response`。

## 构建顺序

测试与 typecheck 通过 `@mesa-code/dynamic-workflow` 的**已构建 dist** 解析依赖，故 `pretest` /
`pretypecheck` 会先 `pnpm --filter @mesa-code/dynamic-workflow build`。全新检出直接 `pnpm test` 即可，
不会踩到 stale-dist。

## 失败裁决与取舍

- run 的裁决归引擎所有。终结失败（脚本抛错 / 子进程崩溃 / 超时 / 协议损坏）都调
  `engine.fail(error)`——结算 `failed`、driver 侧取消在飞 ask、journal 记 `dwf_run.status =
  "failed"` + `failure_json`，journal 与调用方看到的结果一致。abort 信号是唯一的"真取消"，
  调 `engine.cancel()`（结算 `cancelled`，可 resume）。harness 侧的 first-wins finalize 只管
  子进程清理（清 timer、关 stdin、kill child），不自造结算。
