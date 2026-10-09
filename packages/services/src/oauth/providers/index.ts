import type { ApiClient } from "@mesa-code/shared";
import type { OAuthRuntimeConfig } from "../runtimeConfig.js";
import type { OAuthProviderAdapter } from "./providerAdapter.js";
import { BigModelProviderAdapter } from "./bigmodelProviderAdapter.js";
import { ZaiProviderAdapter } from "./zaiProviderAdapter.js";

/** 根据运行时配置创建可用 provider adapter */
export function createOAuthProviderAdapters(
  config: OAuthRuntimeConfig,
  options: { apiClient?: ApiClient } = {},
): OAuthProviderAdapter[] {
  const adapters: OAuthProviderAdapter[] = [];
  const apiClient = options.apiClient;
  if (!apiClient) {
    throw new Error(
      "ApiClient 注入缺失：OAuth provider adapters 必须通过 Providers 传入 apiClient",
    );
  }

  for (const providerConfig of config.providers) {
    switch (providerConfig.id) {
      case "zai":
        adapters.push(new ZaiProviderAdapter(providerConfig, apiClient));
        break;
      case "bigmodel":
        adapters.push(new BigModelProviderAdapter(providerConfig, apiClient));
        break;
      default:
        break;
    }
  }
  return adapters;
}

export type { OAuthProviderAdapter, OAuthProviderContext } from "./providerAdapter.js";
