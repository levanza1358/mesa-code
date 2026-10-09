import {
  ProviderConfigService,
  type ProviderConfigLayerSnapshot,
  type ProviderConfigLayerUpdate,
} from "@mesa-code/provider";
import { NodeMesaCodeBuiltinProviderConfigSource } from "./mesa-code-builtin-provider-config-source.js";
import {
  EndpointScopedMesaCodeBuiltinSource,
  type EndpointScopedMesaCodeBuiltinSourceOptions,
} from "./endpoint-scoped-mesa-code-builtin-source.js";
import {
  MesaCodeBuiltinRemoteSynchronizer,
  type MesaCodeBuiltinRemoteSynchronizerOptions,
  type MesaCodeBuiltinRefreshResult,
} from "./mesa-code-builtin-remote-synchronizer.js";
import {
  NodePersonalProviderConfigRepository,
  type PersonalProviderConfigRecoveryEvent,
} from "./personal-provider-config-repository.js";

export interface NodeProviderConfigRuntimeOptions {
  readonly mesaCodeBuiltinFilePath: string;
  readonly mesaCodeBuiltinActiveFilePath?: string;
  readonly mesaCodeBuiltinRemote?: Omit<MesaCodeBuiltinRemoteSynchronizerOptions, "source">;
  readonly mesaCodeBuiltinEnvironment?: Omit<
    EndpointScopedMesaCodeBuiltinSourceOptions,
    "bundledFilePath"
  >;
  readonly onMesaCodeBuiltinRefreshError?: (error: unknown) => void;
  readonly onPersonalConfigRecovery?: (event: PersonalProviderConfigRecoveryEvent) => void;
  readonly onPersonalConfigPollingError?: (error: unknown) => void;
  readonly personalFilePath: string;
  readonly personalPollingIntervalMs?: number | false;
  readonly importLegacy?: (
    mesaCodeBuiltin: ProviderConfigLayerSnapshot,
  ) => Promise<ProviderConfigLayerUpdate | null>;
  readonly watch?: boolean;
}

/** 组装一个 Node.js 进程内共享的 MesaCode Built-in/Personal Config 运行边界。 */
export class NodeProviderConfigRuntime {
  readonly configService: ProviderConfigService;
  readonly #mesaCodeBuiltinSource:
    | NodeMesaCodeBuiltinProviderConfigSource
    | EndpointScopedMesaCodeBuiltinSource;
  readonly #personalRepository: NodePersonalProviderConfigRepository;
  readonly #remoteSynchronizer?: MesaCodeBuiltinRemoteSynchronizer;
  readonly #onRemoteRefreshError?: (error: unknown) => void;
  #startPromise: Promise<void> | null = null;
  #disposed = false;
  readonly #checkListeners = new Set<() => Promise<void>>();
  #checkTimer: ReturnType<typeof setInterval> | null = null;
  #checkInFlight: Promise<void> | null = null;

  constructor(options: NodeProviderConfigRuntimeOptions) {
    this.#mesaCodeBuiltinSource = options.mesaCodeBuiltinEnvironment
      ? new EndpointScopedMesaCodeBuiltinSource({
          bundledFilePath: options.mesaCodeBuiltinFilePath,
          ...options.mesaCodeBuiltinEnvironment,
        })
      : new NodeMesaCodeBuiltinProviderConfigSource({
          bundledFilePath: options.mesaCodeBuiltinFilePath,
          activeFilePath: options.mesaCodeBuiltinActiveFilePath,
          watch: options.watch,
        });
    this.#remoteSynchronizer =
      options.mesaCodeBuiltinRemote &&
      this.#mesaCodeBuiltinSource instanceof NodeMesaCodeBuiltinProviderConfigSource
        ? new MesaCodeBuiltinRemoteSynchronizer({
            source: this.#mesaCodeBuiltinSource,
            ...options.mesaCodeBuiltinRemote,
          })
        : undefined;
    this.#onRemoteRefreshError = options.onMesaCodeBuiltinRefreshError;
    this.#personalRepository = new NodePersonalProviderConfigRepository({
      filePath: options.personalFilePath,
      onRecovery: options.onPersonalConfigRecovery,
      onPollingError: options.onPersonalConfigPollingError,
      pollingIntervalMs: options.personalPollingIntervalMs,
      ...(options.importLegacy
        ? {
            importLegacy: async () => options.importLegacy!(await this.#mesaCodeBuiltinSource.read()),
          }
        : {}),
    });
    this.configService = new ProviderConfigService({
      mesaCodeBuiltinSource: this.#mesaCodeBuiltinSource,
      personalRepository: this.#personalRepository,
    });
  }

  resolveMesaCodeBuiltinActiveFilePath(): Promise<string> {
    return this.#mesaCodeBuiltinSource instanceof NodeMesaCodeBuiltinProviderConfigSource
      ? Promise.resolve(this.#mesaCodeBuiltinSource.activeFilePath)
      : this.#mesaCodeBuiltinSource.resolveActiveFilePath();
  }

  get personalRepository(): import("@mesa-code/provider").PersonalProviderConfigRepository {
    return this.#personalRepository;
  }

  /** Environment 同一周期检查中恢复未对齐依赖，不被下载 TTL 或失败挡住。 */
  onDidCheckMesaCodeBuiltin(listener: () => Promise<void>): () => void {
    this.#checkListeners.add(listener);
    return () => this.#checkListeners.delete(listener);
  }

  start(): Promise<void> {
    if (this.#disposed) throw new Error("NodeProviderConfigRuntime 已 dispose");
    if (this.#startPromise) return this.#startPromise;
    const startPromise = this.configService.read().then(() => {
      if (this.#disposed) return;
      void this.#checkBackground();
      // Managed Worker 无下载配置也无恢复 owner，不建立周期任务。
      if (
        this.#remoteSynchronizer ||
        this.#mesaCodeBuiltinSource instanceof EndpointScopedMesaCodeBuiltinSource ||
        this.#checkListeners.size > 0
      ) {
        this.#checkTimer = setInterval(() => {
          void this.#checkBackground();
        }, 60_000);
        this.#checkTimer.unref?.();
      }
    });
    this.#startPromise = startPromise;
    void startPromise.catch(() => {
      if (this.#startPromise === startPromise) this.#startPromise = null;
    });
    return startPromise;
  }

  refreshMesaCodeBuiltin(options?: { readonly force?: boolean }): Promise<MesaCodeBuiltinRefreshResult> {
    if (this.#disposed) return Promise.resolve("disposed");
    if (this.#mesaCodeBuiltinSource instanceof EndpointScopedMesaCodeBuiltinSource) {
      return this.#mesaCodeBuiltinSource.refresh(options);
    }
    return this.#remoteSynchronizer?.refresh(options) ?? Promise.resolve("skipped");
  }

  #checkBackground(): Promise<void> {
    if (this.#disposed) return Promise.resolve();
    if (this.#checkInFlight) return this.#checkInFlight;
    const check = Promise.allSettled([
      this.refreshMesaCodeBuiltin(),
      ...[...this.#checkListeners].map((listener) => Promise.resolve().then(listener)),
    ])
      .then((results) => {
        if (this.#disposed) return;
        for (const result of results)
          if (result.status === "rejected") this.#onRemoteRefreshError?.(result.reason);
      })
      .finally(() => {
        if (this.#checkInFlight === check) this.#checkInFlight = null;
      });
    this.#checkInFlight = check;
    return check;
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    if (this.#checkTimer) clearInterval(this.#checkTimer);
    this.#checkTimer = null;
    this.#checkListeners.clear();
    this.#remoteSynchronizer?.dispose();
    this.configService.dispose();
    this.#personalRepository.dispose();
    this.#mesaCodeBuiltinSource.dispose();
  }
}

export function createNodeProviderConfigRuntime(
  options: NodeProviderConfigRuntimeOptions,
): NodeProviderConfigRuntime {
  return new NodeProviderConfigRuntime(options);
}
