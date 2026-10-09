// 平台能力面收敛：设置页「插件管理」的薄服务接口。
//
// 背景：pluginManagementStore / usePluginUninstall 过去直接注入 IMesaCodeAgentService，
// UI 层因此散布 13 个 plugins/* 旧协议词的消费点。收敛为独立薄 service 后，UI 只依赖
// 本接口；plugins/* 词表的 host 侧消费点收拢到 pluginManagementService 一处（插件的
// 事实源在 mesa-code-cli 进程，服务实现仍经 agent 协议往返——plugins 词表的收口归属
// 插件能力面自身的协议演进，不在会话 v4 词表范围内）。
// 注意与既有 IPluginsService（已 retired 的 marketplace pluginStore 通道）区分：
// 那套接口按 pluginName+marketplace 寻址且方法语义过时，不复用避免签名冲突。
import type { Event } from "@mesa-code/rpc";
import type {
  MesaCodePluginOperationProgressNotification,
  MesaCodePluginsConfigureResult,
  MesaCodePluginsCancelOperationResult,
  MesaCodePluginsDescribeResult,
  MesaCodePluginsInstallResult,
  MesaCodePluginsListResult,
  MesaCodePluginsMarketplaceMutationResult,
  MesaCodePluginsOverviewResult,
  MesaCodePluginsReferenceCatalogResult,
  MesaCodePluginsRestoreBuiltinResult,
  MesaCodePluginsSetEnabledResult,
  MesaCodePluginsUninstallResult,
  MesaCodePluginsValidateResult,
} from "@mesa-code/shared";
import { ServiceChannels } from "@mesa-code/shared";
import { createServiceDescriptor } from "../descriptors.js";
import type {
  MesaCodeAgentAddPluginMarketplaceParams,
  MesaCodeAgentConfigurePluginParams,
  MesaCodeAgentCancelPluginOperationParams,
  MesaCodeAgentDescribePluginParams,
  MesaCodeAgentInstallPluginParams,
  MesaCodeAgentPluginReferenceCatalogParams,
  MesaCodeAgentResolveSuggestedPluginReferenceParams,
  MesaCodeAgentResetPluginConfigParams,
  MesaCodeAgentPluginViewParams,
  MesaCodeAgentRemovePluginMarketplaceParams,
  MesaCodeAgentRestoreBuiltinPluginParams,
  MesaCodeAgentSetPluginEnabledParams,
  MesaCodeAgentUninstallPluginParams,
  MesaCodeAgentUpdatePluginMarketplaceParams,
  MesaCodeAgentUpdatePluginParams,
  MesaCodeAgentValidatePluginParams,
} from "../mesa-code-agent/mesa-code-agent-plugin-params.js";

export interface IPluginManagementService {
  listPlugins(params: MesaCodeAgentPluginViewParams): Promise<MesaCodePluginsListResult>;
  /**
   * Plugin 对话引用 catalog：
   * 带 sessionId → session-owned 冻结 catalog；不带 → workspace 当前 catalog。
   * 实现路由到 workspace 级 agent client，不走插件管理独立进程。
   */
  getPluginReferenceCatalog(
    params: MesaCodeAgentPluginReferenceCatalogParams,
  ): Promise<MesaCodePluginsReferenceCatalogResult>;
  resolveSuggestedPluginReference(
    params: MesaCodeAgentResolveSuggestedPluginReferenceParams,
  ): Promise<import("@mesa-code/shared").MesaCodePluginsResolveSuggestedReferenceResult>;
  onDynamicPluginOperationProgress(
    operationId: string,
  ): Event<MesaCodePluginOperationProgressNotification>;
  getPluginsOverview(params: MesaCodeAgentPluginViewParams): Promise<MesaCodePluginsOverviewResult>;
  addPluginMarketplace(
    params: MesaCodeAgentAddPluginMarketplaceParams,
  ): Promise<MesaCodePluginsMarketplaceMutationResult>;
  removePluginMarketplace(
    params: MesaCodeAgentRemovePluginMarketplaceParams,
  ): Promise<MesaCodePluginsMarketplaceMutationResult>;
  updatePluginMarketplace(
    params: MesaCodeAgentUpdatePluginMarketplaceParams,
  ): Promise<MesaCodePluginsMarketplaceMutationResult>;
  installPlugin(params: MesaCodeAgentInstallPluginParams): Promise<MesaCodePluginsInstallResult>;
  cancelPluginOperation(
    params: MesaCodeAgentCancelPluginOperationParams,
  ): Promise<MesaCodePluginsCancelOperationResult>;
  uninstallPlugin(params: MesaCodeAgentUninstallPluginParams): Promise<MesaCodePluginsUninstallResult>;
  updatePlugin(params: MesaCodeAgentUpdatePluginParams): Promise<MesaCodePluginsInstallResult>;
  restoreBuiltinPlugin(
    params: MesaCodeAgentRestoreBuiltinPluginParams,
  ): Promise<MesaCodePluginsRestoreBuiltinResult>;
  configurePlugin(params: MesaCodeAgentConfigurePluginParams): Promise<MesaCodePluginsConfigureResult>;
  resetPluginConfig(
    params: MesaCodeAgentResetPluginConfigParams,
  ): Promise<MesaCodePluginsConfigureResult>;
  validatePlugin(params: MesaCodeAgentValidatePluginParams): Promise<MesaCodePluginsValidateResult>;
  describePlugin(params: MesaCodeAgentDescribePluginParams): Promise<MesaCodePluginsDescribeResult>;
  setPluginEnabled(params: MesaCodeAgentSetPluginEnabledParams): Promise<MesaCodePluginsSetEnabledResult>;
}

export const IPluginManagementService = createServiceDescriptor<IPluginManagementService>(
  ServiceChannels.PluginManagement,
);
