/**
 * Service-layer discovery contract.
 *
 * The pure URL/payload helpers live in `@mesa-code/provider` because the CLI agent also
 * probes a provider's catalog. They are re-exported here so existing service and UI
 * entry points keep a single import surface.
 */
export {
  parseModelCatalogPayload,
  resolveModelCatalogUrl,
  type ModelCatalogApiFacts,
} from "@mesa-code/provider";

/**
 * Normalized outcome of probing a provider's own model catalog endpoint.
 * A discovery failure is a value, not a thrown exception, so the settings UI can
 * render an inline message without unwinding the surrounding save transaction.
 */
export interface ModelDiscoveryResult {
  readonly models: readonly string[];
  readonly error?: { readonly message: string };
}

export interface ModelDiscoveryRequest {
  readonly providerId: string;
}

export type ModelDiscoveryExecutor = (
  request: ModelDiscoveryRequest,
) => Promise<ModelDiscoveryResult>;
