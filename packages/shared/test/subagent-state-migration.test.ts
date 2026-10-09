// Subagent state-file migration: the built-in override map is keyed by the shared
// roster, so a stored override for any built-in name (old or new) must survive, and
// the legacy dual-map shape must migrate to the current structured shape.
import assert from "node:assert/strict";
import test from "node:test";

import { BUILT_IN_SUBAGENT_NAMES } from "../src/built-in-subagents.js";
// importSubagentStateSelections is an internal storage-migration entry point, not a
// public export; the test targets that module directly.
import { importSubagentStateSelections } from "../src/subagent-state-migration.js";

test("a current structured override for every roster built-in is preserved", () => {
  const builtInModelSelectionOverrides = Object.fromEntries(
    BUILT_IN_SUBAGENT_NAMES.map((name) => [
      name,
      { providerId: "anthropic", modelId: `${name}-model` },
    ]),
  );
  const result = importSubagentStateSelections({ builtInModelSelectionOverrides });
  assert.deepEqual(
    Object.keys(result.builtInModelSelectionOverrides).sort(),
    [...BUILT_IN_SUBAGENT_NAMES].sort(),
  );
  // The legacy pair is not special-cased: a new built-in round-trips like the rest.
  assert.deepEqual(result.builtInModelSelectionOverrides.Verify, {
    providerId: "anthropic",
    modelId: "Verify-model",
  });
});

test("the legacy dual-map shape migrates an override for every roster built-in", () => {
  const builtInModelOverrides = Object.fromEntries(
    BUILT_IN_SUBAGENT_NAMES.map((name) => [name, "anthropic/claude-opus-4"]),
  );
  const builtInThoughtLevelOverrides = Object.fromEntries(
    BUILT_IN_SUBAGENT_NAMES.map((name) => [name, "high"]),
  );
  const result = importSubagentStateSelections({
    builtInModelOverrides,
    builtInThoughtLevelOverrides,
  });
  assert.deepEqual(
    Object.keys(result.builtInModelSelectionOverrides).sort(),
    [...BUILT_IN_SUBAGENT_NAMES].sort(),
  );
  assert.deepEqual(result.builtInModelSelectionOverrides.Tester, {
    providerId: "anthropic",
    modelId: "claude-opus-4",
    options: { reasoningLevel: "high" },
  });
  // The two original built-ins keep working through the same path.
  assert.deepEqual(result.builtInModelSelectionOverrides["general-purpose"], {
    providerId: "anthropic",
    modelId: "claude-opus-4",
    options: { reasoningLevel: "high" },
  });
  assert.deepEqual(result.builtInModelSelectionOverrides.Explore, {
    providerId: "anthropic",
    modelId: "claude-opus-4",
    options: { reasoningLevel: "high" },
  });
});

test("a legacy builtin provider id is upgraded without dropping the entry", () => {
  const result = importSubagentStateSelections({
    builtInModelOverrides: { Plan: "builtin:zai/glm-4.6" },
  });
  const plan = result.builtInModelSelectionOverrides.Plan;
  assert.ok(plan, "expected the Plan override to be migrated, not dropped");
  assert.equal(plan.providerId, "zai-api");
  assert.ok(plan.modelId.length > 0);
});

test("a name outside the roster is ignored rather than trusted", () => {
  const result = importSubagentStateSelections({
    builtInModelSelectionOverrides: { "not-a-builtin": { providerId: "x", modelId: "y" } },
  });
  assert.deepEqual(result.builtInModelSelectionOverrides, {});
});
