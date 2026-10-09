import assert from "node:assert/strict";
import test from "node:test";
import { ModelConfig, ModelConfigRules } from "../src/config/model-config.js";

// Contract: after the built-in catalog was emptied, the desktop default source must still
// describe the search-patch tool schema, otherwise the agent receives no patch tool at all.
test("builtin model rules must carry the default requiresMfjsToolSchema", () => {
  const rules = new ModelConfigRules([
    {
      type: "provider-model",
      providerId: "mirais",
      modelId: "cbcn/deepseek-v3.2",
      config: ModelConfig.fromData({
        enabled: true,
        properties: { contextWindow: 128000 },
      } as never),
    },
  ]);

  const resolved = rules.resolve({
    providerId: "mirais",
    modelId: "cbcn/deepseek-v3.2",
    apiType: "openai-chat-completions",
    baseUrl: "http://localhost:1463/v1",
  });

  assert.ok(resolved.properties, "resolved properties must not be empty");
  assert.equal(
    resolved.properties?.requiresMfjsToolSchema,
    true,
    "default source must enable requiresMfjsToolSchema for built-in models",
  );
});
