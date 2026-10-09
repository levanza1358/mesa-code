import assert from "node:assert/strict";
import test from "node:test";
import { ModelConfig, ModelConfigRules } from "../src/config/model-config.js";

// Smoke: reproduce what the Settings save path actually does for a custom (personal) provider model
// after the built-in catalog was emptied. The persisted rule is a "manual-provider-model" rule with
// only the leaves the manual form exposes; the remaining system leaves must come from
// ModelConfigRules defaults, otherwise the resolver marks the model non-executable.
test("custom provider model saved from the manual form stays executable", () => {
  const personal = new ModelConfigRules([
    {
      type: "manual-provider-model",
      providerId: "mirais",
      modelId: "cbcn/deepseek-v3.2",
      // Exactly the leaves the editor-managed personal config writes: editable fields only.
      config: ModelConfig.fromData({
        enabled: true,
        properties: {
          contextWindow: 128000,
          inputFormat: { supportsImage: false, supportsVideo: false, supportsPdf: false },
        },
        optionSpecs: {
          reasoningLevel: { values: ["low", "medium", "high"] },
          maxOutputTokens: { max: 128000 },
        },
      } as never),
    },
  ]);

  // Built-in rules are empty now, so personal is the effective set.
  const effective = ModelConfigRules.composeEffective(ModelConfigRules.empty(), personal);
  const resolved = effective.resolve({
    providerId: "mirais",
    modelId: "cbcn/deepseek-v3.2",
    apiType: "openai-chat-completions",
    baseUrl: "http://localhost:1463/v1",
  });

  const issues = resolved.validateComplete(["providers", "mirais", "models", "cbcn/deepseek-v3.2"]);
  assert.deepEqual(issues, [], `unexpected validation issues: ${JSON.stringify(issues)}`);
  assert.equal(resolved.enabled, true);
  // The default source keeps the search-patch tool schema enabled, so a freshly discovered
  // model must not silently lose requiresMfjsToolSchema just because the user chose "recommended".
  assert.equal(resolved.properties?.requiresMfjsToolSchema, true);
  assert.equal(resolved.properties?.outputFormat?.supportsText, true);
  assert.equal(resolved.properties?.inputFormat?.supportsText, true);
  assert.equal(resolved.properties?.inputFormat?.supportsAudio, false);
  assert.ok(resolved.optionSpecs?.reasoningLevel?.map.includes("reasoning_effort"));
  assert.ok(resolved.optionSpecs?.maxOutputTokens?.map.includes("max_tokens"));
});
