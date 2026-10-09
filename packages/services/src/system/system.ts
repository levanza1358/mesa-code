import type {
  IntegratedTerminalShellOption,
  IntranetProbeRequest,
  IntranetProbeResult,
  SystemInfo,
} from "@mesa-code/shared";
import { ServiceChannels } from "@mesa-code/shared";
import { createServiceDescriptor } from "../descriptors.js";

export interface ISystemService {
  info(): Promise<SystemInfo>;
  listIntegratedTerminalShells(): Promise<IntegratedTerminalShellOption[]>;
  probeIntranet(request: IntranetProbeRequest): Promise<IntranetProbeResult>;
}

export const ISystemService = createServiceDescriptor<ISystemService>(ServiceChannels.System);
