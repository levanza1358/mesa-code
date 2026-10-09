import { z } from "zod";
import type { CommandAgentSource } from "./command-types.js";
import type { MesaCodeProvider } from "./mesa-code-task-types-core.js";

export const MESA_CODE_AGENT_PROVIDER = "glm" satisfies MesaCodeProvider;
export const MESA_CODE_AGENT_PROVIDER_LABEL = "MesaCode Agent";
export const MESA_CODE_COMMAND_AGENT_SOURCE = "mesa-code-agent" satisfies CommandAgentSource;

export const mesaCodeAgentProviderSchema = z.literal(MESA_CODE_AGENT_PROVIDER);

export const MESA_CODE_COMMAND_AGENT_SOURCES = [
  MESA_CODE_COMMAND_AGENT_SOURCE,
] as const satisfies readonly CommandAgentSource[];

export function normalizeAgentProviderToMesaCodeAgent(
  _provider?: MesaCodeProvider | null,
): MesaCodeProvider {
  return MESA_CODE_AGENT_PROVIDER;
}

export function isMesaCodeAgentProvider(
  provider: MesaCodeProvider | null | undefined,
): provider is typeof MESA_CODE_AGENT_PROVIDER {
  return provider === MESA_CODE_AGENT_PROVIDER;
}
