import type { MesaCodeStreamingToolInputState } from "./streaming-tool-input-preview.js";

export interface MesaCodeToolProjectionMemory {
  completeToolInputById?: Map<string, unknown>;
  streamingToolInputById?: Map<string, MesaCodeStreamingToolInputState>;
  toolNameById?: Map<string, string>;
}

export interface MesaCodeToolProjectionMetadata {
  hasInput: boolean;
  input?: unknown;
  toolName?: string;
}

export function createMesaCodeToolProjectionMemory(): MesaCodeToolProjectionMemory {
  return {
    completeToolInputById: new Map<string, unknown>(),
    streamingToolInputById: new Map<string, MesaCodeStreamingToolInputState>(),
    toolNameById: new Map<string, string>(),
  };
}

export function ensureMesaCodeToolProjectionMemory(
  memory: MesaCodeToolProjectionMemory,
): MesaCodeToolProjectionMemory {
  memory.completeToolInputById ??= new Map<string, unknown>();
  memory.streamingToolInputById ??= new Map<string, MesaCodeStreamingToolInputState>();
  memory.toolNameById ??= new Map<string, string>();
  return memory;
}

export function resolveMesaCodeToolProjectionMetadata(
  payload: Record<string, unknown>,
  toolId: string,
  memory: MesaCodeToolProjectionMemory,
): MesaCodeToolProjectionMetadata {
  const toolName = readNonEmptyString(payload.toolName) ?? memory.toolNameById?.get(toolId);
  if (toolName) {
    memory.toolNameById?.set(toolId, toolName);
  }

  if ("input" in payload) {
    return {
      hasInput: payload.input !== undefined,
      input: payload.input,
      toolName,
    };
  }

  if (memory.completeToolInputById?.has(toolId)) {
    return {
      hasInput: true,
      input: memory.completeToolInputById.get(toolId),
      toolName,
    };
  }

  return {
    hasInput: false,
    toolName,
  };
}

export function finalizeMesaCodeToolProjectionInput(
  toolId: string,
  input: unknown,
  memory: MesaCodeToolProjectionMemory,
): void {
  memory.completeToolInputById ??= new Map<string, unknown>();
  memory.completeToolInputById.set(toolId, input);
  const streamingState = memory.streamingToolInputById?.get(toolId);
  if (streamingState) {
    streamingState.lastPreviewRawInputLength = streamingState.rawInput.length;
    streamingState.rawInput = "";
  }
}

export function forgetMesaCodeToolProjectionMetadata(
  toolId: string,
  memory: MesaCodeToolProjectionMemory,
): void {
  memory.completeToolInputById?.delete(toolId);
  memory.streamingToolInputById?.delete(toolId);
  memory.toolNameById?.delete(toolId);
}

function readNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
