import type { TuiReadClipboardImage, TuiWriteClipboardText } from "@mesa-code/tui";
import type { UiLocale } from "@mesa-code/i18n";
import type { Logger } from "@mesa-code/contracts";
import type {
  createManagedCdpBrowserRuntime,
  ManagedCdpBrowserRuntimeOptions,
} from "@mesa-code/adapters/browser";
import type {
  createModelAdapter,
  createMesaCodeApp,
  CreateModelAdapterOptions,
  configureCodingPlanApiKey,
  ConfigureCodingPlanApiKeyOptions,
  inspectMesaCodeSkill,
  inspectWorkspaceHookTrust,
  grantWorkspaceHookTrust,
  revokeWorkspaceHookTrustCli,
  inspectMesaCodeCustomCommand,
  InspectMesaCodeCustomCommandOptions,
  InspectMesaCodeSkillOptions,
  loginMesaCodeCli,
  loginBigmodelCodingPlan,
  LoginBigmodelCodingPlanOptions,
  LoginMesaCodeCliOptions,
  listMesaCodeCustomCommands,
  ListMesaCodeCustomCommandsOptions,
  loadMesaCodeCustomCommand,
  listMesaCodeSessions,
  listMesaCodeSkills,
  ListMesaCodeSessionsOptions,
  ListMesaCodeSkillsOptions,
  logoutMesaCodeCli,
  LogoutMesaCodeCliOptions,
  resolveLatestSession,
  ResolveLatestSessionOptions,
  RunMesaCodeProtocolAgentOptions,
  prepareMesaCodeTelemetryEnv,
  startProcessProviderRegistryRuntime,
  shutdownMesaCodeTelemetry,
  MesaCodeAppOptions,
} from "@mesa-code/bootstrap";
import type { CliEnv, DotenvLoadResult, LoadCliDotenvOptions } from "./env.js";
import type { PluginsCommandOverrides } from "./plugins-command.js";
import type { CliShutdownProcess } from "./shutdown.js";
import type { resolveWorkspaceGitBranch } from "./tui-workspace-git.js";

export type BootstrapModule = typeof import("@mesa-code/bootstrap");

export interface RunDependencies extends PluginsCommandOverrides {
  protocolLifecycle?: RunMesaCodeProtocolAgentOptions["lifecycle"];
  protocolInput?: NodeJS.ReadableStream;
  createManagedCdpBrowserRuntime?: (
    options?: ManagedCdpBrowserRuntimeOptions,
  ) => ReturnType<typeof createManagedCdpBrowserRuntime>;
  createModelAdapter?: (
    options?: CreateModelAdapterOptions,
  ) => ReturnType<typeof createModelAdapter>;
  createMesaCodeApp?: (
    options?: MesaCodeAppOptions,
  ) => Awaited<ReturnType<typeof createMesaCodeApp>> | ReturnType<typeof createMesaCodeApp>;
  /**
   * Session-event shaper for --output-format stream-json. Defaults to the
   * bootstrap module's, which is also what the protocol server uses; injectable
   * so a caller that supplies its own `createMesaCodeApp` (tests, embedders) can
   * still stream, since the bootstrap module is not loaded on that path.
   */
  mapSessionEvent?: BootstrapModule["mapSessionEvent"];
  cwd?: () => string;
  env?: CliEnv;
  inspectSkill?: (options: InspectMesaCodeSkillOptions) => ReturnType<typeof inspectMesaCodeSkill>;
  inspectWorkspaceHookTrust?: typeof inspectWorkspaceHookTrust;
  grantWorkspaceHookTrust?: typeof grantWorkspaceHookTrust;
  revokeWorkspaceHookTrustCli?: typeof revokeWorkspaceHookTrustCli;
  inspectCustomCommand?: (
    options: InspectMesaCodeCustomCommandOptions,
  ) => ReturnType<typeof inspectMesaCodeCustomCommand>;
  loginMesaCodeCli?: (options?: LoginMesaCodeCliOptions) => ReturnType<typeof loginMesaCodeCli>;
  loginBigmodelCodingPlan?: (
    options?: LoginBigmodelCodingPlanOptions,
  ) => ReturnType<typeof loginBigmodelCodingPlan>;
  configureCodingPlanApiKey?: (
    options: ConfigureCodingPlanApiKeyOptions,
  ) => ReturnType<typeof configureCodingPlanApiKey>;
  loadDotenv?: (options?: LoadCliDotenvOptions) => DotenvLoadResult;
  prepareMesaCodeTelemetryEnv?: typeof prepareMesaCodeTelemetryEnv;
  projectConfigPath?: string;
  listSessions?: (options: ListMesaCodeSessionsOptions) => ReturnType<typeof listMesaCodeSessions>;
  listCustomCommands?: (
    options: ListMesaCodeCustomCommandsOptions,
  ) => ReturnType<typeof listMesaCodeCustomCommands>;
  loadCustomCommand?: (
    options: InspectMesaCodeCustomCommandOptions,
  ) => ReturnType<typeof loadMesaCodeCustomCommand>;
  // headless slash 路由要和 app facade 的保留名 gate 用同一个判据；默认取 bootstrap 的，
  // 注入点只为让单测不必拉起整个 bootstrap 模块。见 prompt-command.ts。
  isReservedSlashCommandName?: BootstrapModule["isReservedMesaCodeSlashCommandName"];
  listSkills?: (options: ListMesaCodeSkillsOptions) => ReturnType<typeof listMesaCodeSkills>;
  logger?: Logger;
  readClipboardImage?: TuiReadClipboardImage;
  writeClipboardText?: TuiWriteClipboardText;
  resolveLatestSession?: (
    options: ResolveLatestSessionOptions,
  ) => ReturnType<typeof resolveLatestSession>;
  resolveWorkspaceGitBranch?: typeof resolveWorkspaceGitBranch;
  logoutMesaCodeCli?: (options?: LogoutMesaCodeCliOptions) => ReturnType<typeof logoutMesaCodeCli>;
  runMesaCodeProtocolAgent?: (options?: RunMesaCodeProtocolAgentOptions) => Promise<void>;
  runTui?: typeof import("@mesa-code/tui").runTui;
  skipUserConfig?: boolean;
  userConfigPath?: string;
  exitProcess?: (code: number) => void;
  shutdownCleanupTimeoutMs?: number;
  shutdownProcess?: CliShutdownProcess;
  startProcessProviderRegistryRuntime?: typeof startProcessProviderRegistryRuntime;
  shutdownMesaCodeTelemetry?: typeof shutdownMesaCodeTelemetry;
}

export type CliPermissionMode = "build" | "plan" | "edit" | "yolo";
export type CliRuntimeMode = CliPermissionMode | "auto";

export interface CliModeState {
  current?: CliRuntimeMode;
  override?: CliPermissionMode;
}

export interface CliTargetRequest {
  objective: string;
  replaceExisting: boolean;
}

export type ModeCapableApp = Awaited<ReturnType<typeof createMesaCodeApp>> & {
  getMode?: () => CliRuntimeMode;
  setLocale?: (locale: UiLocale) => Promise<{ locale: "en-US" | "zh-CN" }>;
  setMode?: (mode: CliRuntimeMode) => Promise<{ mode: CliRuntimeMode }>;
};

export interface CliResumeRequest {
  continueSession: boolean;
  resumeSessionId?: string;
}
