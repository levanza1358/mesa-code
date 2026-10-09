import type { IDisposable } from "@mesa-code/rpc";
import type { IMesaCodeAgentService } from "@mesa-code/services";
import type { ProcessResourceRuntimeSurface } from "@mesa-code/shared";
import { HostResponseTypes } from "@mesa-code/shared";

interface RegisterHostMcpTelemetryOptions {
  agentService: Pick<IMesaCodeAgentService, "onDynamicMcpTelemetry">;
  postMessage(message: unknown): void;
  runtimeSurface: ProcessResourceRuntimeSurface;
}

export function registerHostMcpTelemetry(options: RegisterHostMcpTelemetryOptions): IDisposable {
  return options.agentService.onDynamicMcpTelemetry()((event) => {
    try {
      options.postMessage({
        type: HostResponseTypes.McpTelemetry,
        runtimeSurface: options.runtimeSurface,
        event,
      });
    } catch {
      // main 已退出或 IPC 不可用时只丢当前遥测，不影响 MCP 生命周期。
    }
  });
}
