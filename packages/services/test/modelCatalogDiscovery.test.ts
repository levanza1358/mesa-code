import assert from "node:assert/strict";
import test from "node:test";
import type { ApiClient, ApiRequestInit } from "@mesa-code/shared";
import {
  parseModelCatalogPayload,
  resolveModelCatalogUrl,
} from "../src/model-provider/modelCatalogDiscovery.js";
import {
  createModelDiscoveryExecutor,
  type ModelDiscoveryProviderFacts,
} from "../src/model-provider/modelDiscoveryExecutor.js";

test("resolveModelCatalogUrl appends /models for OpenAI-compatible endpoints", () => {
  assert.equal(
    resolveModelCatalogUrl({ type: "openai-chat-completions", baseUrl: "https://api.example/v1" }),
    "https://api.example/v1/models",
  );
  assert.equal(
    resolveModelCatalogUrl({ type: "openai-responses", baseUrl: "https://api.example/v1/" }),
    "https://api.example/v1/models",
  );
  // Query and hash from the configured Base URL must not leak into the catalog probe.
  assert.equal(
    resolveModelCatalogUrl({
      type: "openai-chat-completions",
      baseUrl: "https://api.example/v1?token=1#frag",
    }),
    "https://api.example/v1/models",
  );
});

test("resolveModelCatalogUrl rejects non-OpenAI formats and missing base URLs", () => {
  assert.equal(
    resolveModelCatalogUrl({ type: "anthropic-messages", baseUrl: "https://api.example/v1" }),
    null,
  );
  assert.equal(resolveModelCatalogUrl({ type: "openai-chat-completions", baseUrl: "" }), null);
  assert.equal(resolveModelCatalogUrl({ baseUrl: "https://api.example/v1" }), null);
  assert.equal(resolveModelCatalogUrl(undefined), null);
  assert.equal(
    resolveModelCatalogUrl({ type: "openai-chat-completions", baseUrl: "not a url" }),
    null,
  );
});

test("parseModelCatalogPayload reads the OpenAI data shape, dedupes, and trims", () => {
  assert.deepEqual(
    parseModelCatalogPayload({
      data: [{ id: " gpt-4o " }, { id: "gpt-4o" }, { id: "o3-mini" }, { id: 42 }, null],
    }),
    ["gpt-4o", "o3-mini"],
  );
});

test("parseModelCatalogPayload accepts bare arrays and the models variant", () => {
  assert.deepEqual(parseModelCatalogPayload(["a", "b"]), ["a", "b"]);
  assert.deepEqual(parseModelCatalogPayload({ models: [{ model: "x" }, { name: "y" }] }), [
    "x",
    "y",
  ]);
  assert.deepEqual(parseModelCatalogPayload({ data: "invalid" }), []);
  assert.deepEqual(parseModelCatalogPayload(undefined), []);
});

function createApiClient(
  handler: (url: string, init: ApiRequestInit | undefined) => Response | Promise<Response>,
): ApiClient {
  return {
    request: async (input: string | URL, init?: ApiRequestInit) =>
      handler(typeof input === "string" ? input : input.toString(), init),
  };
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

const baseFacts: ModelDiscoveryProviderFacts = {
  enabled: true,
  api: {
    type: "openai-chat-completions",
    baseUrl: "https://api.example/v1",
    headers: { "X-Provider": "mesa" },
  },
  apiKey: "secret-key",
};

test("createModelDiscoveryExecutor fetches models with provider headers and auth", async () => {
  let capturedUrl = "";
  let capturedInit: ApiRequestInit | undefined;
  const executor = createModelDiscoveryExecutor({
    apiClient: createApiClient(async (url, init) => {
      capturedUrl = url;
      capturedInit = init;
      return jsonResponse({ data: [{ id: "model-a" }, { id: "model-b" }] });
    }),
    readProviderFacts: () => baseFacts,
  });

  const result = await executor({ providerId: "custom" });
  assert.deepEqual(result.models, ["model-a", "model-b"]);
  assert.equal(result.error, undefined);
  assert.equal(capturedUrl, "https://api.example/v1/models");
  assert.equal(capturedInit?.method, "GET");
  assert.equal(capturedInit?.headers?.Accept, "application/json");
  assert.equal(capturedInit?.headers?.["X-Provider"], "mesa");
  assert.equal(capturedInit?.headers?.Authorization, "Bearer secret-key");
});

test("createModelDiscoveryExecutor reports failure as a value", async () => {
  const executor = createModelDiscoveryExecutor({
    apiClient: createApiClient(async () => {
      throw new Error("boom");
    }),
    readProviderFacts: () => baseFacts,
  });

  const result = await executor({ providerId: "custom" });
  assert.deepEqual(result.models, []);
  assert.equal(result.error?.message, "Failed to fetch models: boom");
});

test("createModelDiscoveryExecutor guards unknown, disabled, and non-probable providers", async () => {
  const apiClient = createApiClient(async () => {
    throw new Error("should not be called");
  });

  const unknownProvider = createModelDiscoveryExecutor({
    apiClient,
    readProviderFacts: () => null,
  });
  assert.equal(
    (await unknownProvider({ providerId: "missing" })).error?.message,
    "This provider is not available for model discovery.",
  );

  const disabledProvider = createModelDiscoveryExecutor({
    apiClient,
    readProviderFacts: () => ({ ...baseFacts, enabled: false }),
  });
  assert.equal(
    (await disabledProvider({ providerId: "custom" })).error?.message,
    "Enable this provider before fetching its model list.",
  );

  const noCatalogUrl = createModelDiscoveryExecutor({
    apiClient,
    readProviderFacts: () => ({
      enabled: true,
      api: { type: "anthropic-messages", baseUrl: "https://api.example/v1" },
    }),
  });
  assert.match(
    (await noCatalogUrl({ providerId: "custom" })).error?.message ?? "",
    /no OpenAI-compatible Base URL/,
  );
});
