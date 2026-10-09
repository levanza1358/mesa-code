import assert from "node:assert/strict";
import test from "node:test";
import { ModelConfig, ModelConfigRules } from "../src/config/model-config.js";

// Regression: after the built-in catalog was emptied, custom models lost inherited metadata and
// `completeModelConfigDataSchema` rejected them on system leaves such as `requiresMfjsToolSchema`.
// `ModelConfigRules.resolve` must always return a schema-complete config so a custom provider model
// stays executable without the user filling hidden system fields by hand.
test("resolve returns a schema-complete config when no rule matches", () => {
  const config = ModelConfigRules.empty().resolve({
    providerId: "mirais",
    modelId: "cbcn/deepseek-v3.2",
    apiType: "openai-chat-completions",
    baseUrl: "http://localhost:1463/v1",
  });

  const path = ["providers", "mirais", "models", "cbcn/deepseek-v3.2"];
  // `enabled` stays a per-model decision; every other required leaf comes from the defaults.
  assert.deepEqual(
    config.validateComplete(path).map((issue) => issue.path.at(-1)),
    ["enabled"],
  );
  // The default source keeps the search-patch tool schema on, matching the pre-emptied catalog.
  assert.equal(config.properties?.requiresMfjsToolSchema, true);
  assert.equal(config.properties?.inputFormat?.supportsText, true);
  assert.equal(config.properties?.outputFormat?.supportsText, true);
  assert.ok(config.properties?.contextWindow);
  assert.ok(config.optionSpecs?.reasoningLevel);
  assert.ok(config.optionSpecs?.maxOutputTokens);
});

test("an explicit partial rule still overrides the default leaves", () => {
  const rules = new ModelConfigRules([
    {
      type: "provider-model",
      providerId: "mirais",
      modelId: "cbcn/deepseek-v3.2",
      config: new ModelConfig({
        enabled: true,
        properties: { contextWindow: 64000, requiresMfjsToolSchema: true },
      }),
    },
  ]);

  const config = rules.resolve({ providerId: "mirais", modelId: "cbcn/deepseek-v3.2" });

  assert.equal(config.enabled, true);
  assert.equal(config.properties?.contextWindow, 64000);
  assert.equal(config.properties?.requiresMfjsToolSchema, true);
  assert.equal(config.properties?.inputFormat?.supportsText, true);
  assert.deepEqual(config.validateComplete(), []);
});

test("an explicit rule can turn the search-patch tool schema off", () => {
  const rules = new ModelConfigRules([
    {
      type: "provider-model",
      providerId: "mirais",
      modelId: "cbcn/deepseek-v3.2",
      config: new ModelConfig({
        enabled: true,
        properties: { requiresMfjsToolSchema: false },
      }),
    },
  ]);

  const config = rules.resolve({ providerId: "mirais", modelId: "cbcn/deepseek-v3.2" });

  assert.equal(config.properties?.requiresMfjsToolSchema, false);
  assert.equal(config.properties?.contextWindow, 128000);
  assert.deepEqual(config.validateComplete(), []);
});

test("the default config exposes every required leaf except the per-model enabled flag", () => {
  const issues = ModelConfig.customProviderDefaults().validateComplete();
  // `enabled` is a per-model decision, never a default. Everything else must already be complete,
  // otherwise a custom model would surface system leaves the manual form cannot edit.
  assert.deepEqual(
    issues.map((issue) => issue.path.join(".")),
    ["enabled"],
  );
});
