// Bootstrap public API surface.

export * from "./app/create-app.js";
export type {
  ListMesaCodeSessionsOptions,
  PromptInput,
  ResolveLatestSessionOptions,
  ResumeOptions,
  RunMesaCodeProtocolAgentOptions,
  SendInputOptions,
  SendInputResult,
  SetLocaleResult,
  SteerTurnOptions,
  SubmitPromptOptions,
  UserPromptInput,
  MesaCodeApp,
  MesaCodeAppOptions,
  MesaCodeModelOption,
} from "./app/types.js";
export * from "./auth-login.js";
export {
  inspectMesaCodeCustomCommand,
  listMesaCodeCustomCommands,
  loadMesaCodeCustomCommand,
} from "./custom-commands.js";
export type {
  InspectMesaCodeCustomCommandOptions,
  ListMesaCodeCustomCommandsOptions,
  MesaCodeCustomCommandInspection,
} from "./custom-commands.js";
export { createModelAdapter } from "./model-factory.js";
export type { CreateModelAdapterOptions } from "./model-factory.js";
export { startProcessProviderRegistryRuntime } from "./app/process-provider-registry-runtime.js";
export type { ProcessProviderRegistryRuntimeOptions } from "./app/process-provider-registry-runtime.js";
export {
  addMesaCodePluginMarketplace,
  getMesaCodePluginsOverview,
  installMesaCodeMarketplacePlugin,
  listMesaCodePlugins,
  removeMesaCodePluginMarketplace,
  resolveMesaCodePlugins,
  setMesaCodePluginEnabled,
  uninstallMesaCodeMarketplacePlugin,
  updateMesaCodeMarketplacePlugin,
  updateMesaCodePluginMarketplace,
  validateMesaCodePluginPath,
} from "./plugins.js";
export type {
  AddMesaCodeMarketplaceOptions,
  InstallMesaCodeMarketplacePluginOptions,
  ListMesaCodePluginsOptions,
  RemoveMesaCodeMarketplaceOptions,
  ResolveMesaCodePluginsOptions,
  SetMesaCodePluginEnabledOptions,
  SetMesaCodePluginEnabledResult,
  UninstallMesaCodeMarketplacePluginOptions,
  UpdateMesaCodeMarketplaceOptions,
  UpdateMesaCodeMarketplacePluginOptions,
  ValidateMesaCodePluginPathOptions,
  MesaCodeAvailablePluginData,
  MesaCodeInstalledPluginData,
  MesaCodeMarketplaceSummaryData,
  MesaCodeMarketplaceUpdateData,
  MesaCodePluginInstallData,
  MesaCodePluginUpdateData,
  MesaCodePluginsOverviewData,
} from "./plugins.js";
export { runMesaCodeProtocolAgent } from "./mesa-code-protocol-entrypoint.js";
// Exposed for the CLI's --output-format stream-json: it needs the same event
// shape the protocol server emits, rather than inventing a second one.
export { mapSessionEvent } from "./mesa-code-protocol/session-mapper.js";
export { prepareMesaCodeTelemetryEnv, shutdownMesaCodeTelemetry } from "./telemetry-bootstrap.js";
export type { SessionTranscriptMessage, SessionTranscriptPart } from "./session-transcript.js";
export { listMesaCodeSessions, resolveLatestSession } from "./sessions.js";
export { inspectMesaCodeSkill, listMesaCodeSkills } from "./skills.js";
export type {
  InspectMesaCodeSkillOptions,
  ListMesaCodeSkillsOptions,
  MesaCodeSkillInspection,
} from "./skills.js";
// Exposed for the CLI's headless slash routing: it must decide "is this a real
// custom command?" with the *same* reserved-name gate the app facade's
// customCommandPromptResolver applies, or the two disagree and a reserved name
// reaches the model as literal prompt text. See prompt-command.ts.
export { isReservedMesaCodeSlashCommandName } from "./slash-command-surface.js";
export {
  grantWorkspaceHookTrust,
  inspectWorkspaceHookTrust,
  revokeWorkspaceHookTrustCli,
} from "./workspace-hook-trust-cli.js";
export type {
  WorkspaceHookTrustCliItem,
  WorkspaceHookTrustCliStatus,
  WorkspaceHookTrustCliTarget,
} from "./workspace-hook-trust-cli.js";
