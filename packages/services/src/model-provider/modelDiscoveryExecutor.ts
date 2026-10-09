import type { ApiClient, ApiRequestInit } from "@mesa-code/shared";
import { readApiJson } from "../providers/api/apiJson.js";
import { normalizeApiKeyForHeader } from "../providers/api/apiKeyHeaders.js";
import { createServiceLogger } from "../logger/serviceLogger.js";
import {
  parseModelCatalogPayload,
  resolveModelCatalogUrl,
  type ModelCatalogApiFacts,
  type ModelDiscoveryExecutor,
  type ModelDiscoveryResult,
} from "./modelCatalogDiscovery.js";

const log = createServiceLogger("model-discovery");

/** Minimal provider facts the probe needs; the caller owns config resolution. */
export interface ModelDiscoveryProviderFacts {
  readonly enabled: boolean;
  readonly api?: ModelCatalogApiFacts | null;
  readonly apiKey?: string | null;
}

export interface CreateModelDiscoveryExecutorOptions {
  readonly apiClient: ApiClient;
  /**
   * Read the target provider's effective facts from the Environment that owns its
   * config. Returning null means the provider is unknown to this Environment.
   */
  readonly readProviderFacts: (providerId: string) => ModelDiscoveryProviderFacts | null;
  readonly timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 15_000;

/**
 * Probe a provider's own OpenAI-compatible `/models` endpoint.
 *
 * Read-only by construction: it never writes provider or model configuration, and it
 * reports failure as a value so the settings UI can render an inline message instead
 * of unwinding the surrounding mutation transaction.
 */
export function createModelDiscoveryExecutor(
  options: CreateModelDiscoveryExecutorOptions,
): ModelDiscoveryExecutor {
  return async ({ providerId }) => {
    const facts = options.readProviderFacts(providerId);
    if (!facts) {
      return failure("This provider is not available for model discovery.");
    }
    if (!facts.enabled) {
      return failure("Enable this provider before fetching its model list.");
    }
    const url = resolveModelCatalogUrl(facts.api ?? undefined);
    if (!url) {
      return failure(
        "This provider has no OpenAI-compatible Base URL to fetch models from. Enter a Base URL and API format first, or add models manually.",
      );
    }

    try {
      const payload = await readApiJson<unknown>(options.apiClient, url, buildRequestInit(facts));
      const models = parseModelCatalogPayload(payload);
      log.debug(undefined, "provider model catalog fetched", { providerId, count: models.length });
      return { models };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log.warn(undefined, "provider model catalog fetch failed", { providerId, error });
      return {
        models: [],
        error: { message: `Failed to fetch models: ${message}` },
      };
    }
  };
}

function buildRequestInit(facts: ModelDiscoveryProviderFacts): ApiRequestInit {
  const apiKey = normalizeApiKeyForHeader(facts.apiKey ?? "");
  const headers: Record<string, string> = { Accept: "application/json" };
  for (const [key, value] of Object.entries(facts.api?.headers ?? {})) {
    headers[key] = value;
  }
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }
  return {
    method: "GET",
    headers,
    timeoutMs: DEFAULT_TIMEOUT_MS,
  };
}

function failure(message: string): ModelDiscoveryResult {
  return { models: [], error: { message } };
}
