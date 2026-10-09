import type { HttpClientPort } from "@mesa-code/contracts";
import type { MesaCodeProviderDiscoverModelsResult } from "@mesa-code/shared";
import {
  parseModelCatalogPayload,
  resolveModelCatalogUrl,
  type ModelCatalogApiFacts,
} from "@mesa-code/provider";
import type { ProviderRegistryModelSource } from "./provider-registry-model-runtime.js";

const DEFAULT_TIMEOUT_MS = 15_000;
const ACCEPT_HEADER = "application/json";

export interface ProviderModelDiscoveryDeps {
  readonly registry: ProviderRegistryModelSource;
  readonly httpClient: HttpClientPort;
  readonly timeoutMs?: number;
}

export interface ProviderModelDiscoveryInput {
  readonly providerId: string;
  readonly signal?: AbortSignal;
}

export type ProviderModelDiscovery = (
  input: ProviderModelDiscoveryInput,
) => Promise<MesaCodeProviderDiscoverModelsResult>;

const MISSING_CATALOG_ERROR =
  "This provider has no OpenAI-compatible Base URL to fetch models from. Enter a Base URL and API format first, or add models manually.";

/**
 * Read-only probe of a provider's own model catalog endpoint.
 *
 * Credential resolution stays in the CLI process: this reads the resolved Registry
 * Provider rather than any settings cache, and reports failure as a value so the
 * settings surface can render an inline message instead of unwinding a mutation.
 */
export function createProviderModelDiscovery(
  deps: ProviderModelDiscoveryDeps,
): ProviderModelDiscovery {
  return async ({ providerId, signal }) => {
    const provider = deps.registry.getProvider(providerId);
    if (!provider) return failure("This provider is not available for model discovery.");
    const api = provider.config.api;
    const facts: ModelCatalogApiFacts = {
      type: api?.type,
      baseUrl: api?.baseUrl,
      headers: api?.headers,
    };
    const url = resolveModelCatalogUrl(facts);
    if (!url) return failure(MISSING_CATALOG_ERROR);
    // Access is a discriminated union: only API-key access yields a credential that can
    // be sent directly as a Bearer token. Account-based access is completed by the runtime
    // header port when the request is issued, so it is not fabricated here.
    const access = provider.config.access;
    const apiKey = access.type === "api-key" ? (access.apiKey ?? null) : null;
    try {
      const response = await deps.httpClient.request(
        {
          url,
          method: "GET",
          headers: buildHeaders(facts, apiKey),
          timeoutMs: deps.timeoutMs ?? DEFAULT_TIMEOUT_MS,
        },
        signal ? { signal } : {},
      );
      return { models: [...parseModelCatalogPayload(decodeJsonBody(response.body))] };
    } catch (error) {
      return failure(
        `Failed to fetch models: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };
}

function decodeJsonBody(body: Uint8Array): unknown {
  if (body.byteLength === 0) return undefined;
  return JSON.parse(new TextDecoder().decode(body));
}

function buildHeaders(
  facts: ModelCatalogApiFacts,
  apiKey: string | null,
): Record<string, string> {
  const headers: Record<string, string> = { Accept: ACCEPT_HEADER };
  for (const [key, value] of Object.entries(facts.headers ?? {})) {
    headers[key] = value;
  }
  const trimmedKey = apiKey?.trim();
  if (trimmedKey) headers.Authorization = `Bearer ${trimmedKey}`;
  return headers;
}

function failure(message: string): MesaCodeProviderDiscoverModelsResult {
  return { models: [], error: { message } };
}
