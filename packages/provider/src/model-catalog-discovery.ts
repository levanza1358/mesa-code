import type { ProviderApiType } from "./config/provider-config.js";

/**
 * Pure model-catalog helpers shared by every Environment that owns provider config.
 *
 * They carry no I/O and no Environment state, so the CLI agent and the Host service
 * layer can derive the same probe URL and parse the same payload without the CLI
 * reaching into `@mesa-code/services`.
 */

/** The provider API facts a catalog probe needs. */
export interface ModelCatalogApiFacts {
  readonly type?: ProviderApiType | null;
  readonly baseUrl?: string | null;
  readonly headers?: Readonly<Record<string, string>> | null;
}

const OPENAI_MODELS_PATH = "/models";

/**
 * Resolve the model catalog URL for a provider API endpoint.
 * Anthropic Messages has no OpenAI-compatible `/models` route, so it is not probed.
 */
export function resolveModelCatalogUrl(api: ModelCatalogApiFacts | undefined): string | null {
  const baseUrl = api?.baseUrl?.trim();
  if (!baseUrl) return null;
  const apiType = resolveCatalogApiType(api?.type ?? undefined);
  if (!apiType) return null;
  try {
    const url = new URL(baseUrl);
    url.pathname = `${url.pathname.replace(/\/+$/, "")}${OPENAI_MODELS_PATH}`;
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function resolveCatalogApiType(type: ProviderApiType | undefined): ProviderApiType | null {
  if (type === "openai-chat-completions" || type === "openai-responses") return type;
  return null;
}

/**
 * Extract model IDs from an OpenAI-compatible `/models` payload.
 * Accepts the `{ data: [{ id }] }` shape and a bare `{ models: [...] }` variant,
 * and ignores entries without a usable id instead of failing the whole probe.
 */
export function parseModelCatalogPayload(payload: unknown): readonly string[] {
  const entries = readCatalogEntries(payload);
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const entry of entries) {
    const id = readCatalogEntryId(entry);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

function readCatalogEntries(payload: unknown): readonly unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  const record = payload as Record<string, unknown>;
  if (Array.isArray(record.data)) return record.data;
  if (Array.isArray(record.models)) return record.models;
  return [];
}

function readCatalogEntryId(entry: unknown): string | null {
  if (typeof entry === "string") return entry.trim() || null;
  if (!entry || typeof entry !== "object") return null;
  const record = entry as Record<string, unknown>;
  for (const key of ["id", "model", "name"] as const) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}
