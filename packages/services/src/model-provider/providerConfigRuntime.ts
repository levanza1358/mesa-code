import { join } from "node:path";
import {
  NodeProviderConfigRuntime,
  PERSONAL_PROVIDER_CONFIG_FILE_NAME,
  type PersonalProviderConfigRecoveryEvent,
  type NodeProviderConfigRuntimeOptions,
} from "@mesa-code/provider-node";
import type { ModelProviderConfig } from "./legacyModelProviderSerialized.js";
import { getAppConfigDir } from "../paths.js";
import { importLegacyPersonalProviderConfig } from "./legacyPersonalProviderConfigImporter.js";

export interface ProviderConfigRuntimeOptions {
  readonly mesaCodeBuiltinFilePath: string;
  readonly mesaCodeBuiltinActiveFilePath?: string;
  readonly mesaCodeBuiltinRemote?: NodeProviderConfigRuntimeOptions["mesaCodeBuiltinRemote"];
  readonly mesaCodeBuiltinEnvironment?: NodeProviderConfigRuntimeOptions["mesaCodeBuiltinEnvironment"];
  readonly onMesaCodeBuiltinRefreshError?: (error: unknown) => void;
  readonly onPersonalConfigRecovery?: (event: PersonalProviderConfigRecoveryEvent) => void;
  readonly onPersonalConfigPollingError?: (error: unknown) => void;
  readonly personalFilePath?: string;
  readonly personalPollingIntervalMs?: number | false;
  readonly readLegacyProviders?: () => Promise<readonly ModelProviderConfig[]>;
  readonly watch?: boolean;
}

/**
 * Services 装配层：提供 App 配置目录和已发布旧配置的一次性迁移入口。
 * 配置迁移保留 MesaCode 用户的供应商数据，文件运行时由 @mesa-code/provider-node 唯一实现。
 */
export class ProviderConfigRuntime {
  readonly configService: NodeProviderConfigRuntime["configService"];
  readonly #runtime: NodeProviderConfigRuntime;

  constructor(options: ProviderConfigRuntimeOptions) {
    const runtimeOptions: NodeProviderConfigRuntimeOptions = {
      mesaCodeBuiltinFilePath: options.mesaCodeBuiltinFilePath,
      mesaCodeBuiltinActiveFilePath: options.mesaCodeBuiltinActiveFilePath,
      mesaCodeBuiltinRemote: options.mesaCodeBuiltinRemote,
      mesaCodeBuiltinEnvironment: options.mesaCodeBuiltinEnvironment,
      onMesaCodeBuiltinRefreshError: options.onMesaCodeBuiltinRefreshError,
      onPersonalConfigRecovery: options.onPersonalConfigRecovery,
      onPersonalConfigPollingError: options.onPersonalConfigPollingError,
      personalFilePath:
        options.personalFilePath ?? join(getAppConfigDir(), PERSONAL_PROVIDER_CONFIG_FILE_NAME),
      personalPollingIntervalMs: options.personalPollingIntervalMs,
      watch: options.watch,
      ...(options.readLegacyProviders
        ? {
            importLegacy: async () =>
              importLegacyPersonalProviderConfig({
                legacyProviders: await options.readLegacyProviders!(),
              }),
          }
        : {}),
    };
    this.#runtime = new NodeProviderConfigRuntime(runtimeOptions);
    this.configService = this.#runtime.configService;
  }

  start(): Promise<void> {
    return this.#runtime.start();
  }

  get personalRepository(): NodeProviderConfigRuntime["personalRepository"] {
    return this.#runtime.personalRepository;
  }

  resolveMesaCodeBuiltinActiveFilePath(): Promise<string> {
    return this.#runtime.resolveMesaCodeBuiltinActiveFilePath();
  }

  refreshMesaCodeBuiltin(options?: { readonly force?: boolean }) {
    return this.#runtime.refreshMesaCodeBuiltin(options);
  }

  onDidCheckMesaCodeBuiltin(listener: () => Promise<void>): () => void {
    return this.#runtime.onDidCheckMesaCodeBuiltin(listener);
  }

  dispose(): void {
    this.#runtime.dispose();
  }
}

export function createProviderConfigRuntime(
  options: ProviderConfigRuntimeOptions,
): ProviderConfigRuntime {
  return new ProviderConfigRuntime(options);
}
