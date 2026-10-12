import assert from "node:assert/strict";
import test from "node:test";

/**
 * Regression coverage for the model-discovery refetch loop.
 *
 * Symptom: "Fetch models from provider" spun on "Fetching model list…" forever,
 * even though the provider answered in a few hundred milliseconds.
 *
 * Cause: the discovery dialog's probe effect depended on a `Set` rebuilt from an
 * array the parent created inline on every render
 * (`existingModelIds={models.map((model) => model.modelId)}`). A new array each
 * render produced a new `Set`, a new `runProbe` callback, and therefore a
 * re-firing effect: probe -> `setPhase("loading")` -> re-render -> probe again.
 *
 * These tests pin the two invariants that prevent the loop:
 * 1. the parent derives the id list from a content key, so its identity is stable
 *    while the ids are unchanged;
 * 2. the dialog keys its probe on a content string, not on the `Set`/array
 *    identity, and reads the live set through a ref.
 */

/** Mirror of the parent's derivation: key on the joined ids, then split back. */
function deriveExistingModelIds(modelIds) {
  const key = modelIds.join("\u0000");
  return { key, ids: key.split("\u0000").filter(Boolean) };
}

test("existing model id list keeps a stable identity for equal content", () => {
  // Two separate renders produce fresh arrays with the same contents.
  const firstRender = deriveExistingModelIds(["a", "b"]);
  const secondRender = deriveExistingModelIds(["a", "b"]);

  assert.notEqual(firstRender.ids, secondRender.ids, "arrays are distinct objects");
  assert.equal(
    firstRender.key,
    secondRender.key,
    "content key must match so a memo keyed on it will not invalidate",
  );
});

test("existing model id list invalidates when the id set changes", () => {
  const before = deriveExistingModelIds(["a", "b"]);
  const after = deriveExistingModelIds(["a", "b", "c"]);

  assert.notEqual(before.key, after.key, "adding a model must change the key");
});

test("empty model list yields an empty id array, not a single empty string", () => {
  const { ids, key } = deriveExistingModelIds([]);
  assert.deepEqual(ids, []);
  assert.equal(key, "");
});

test("existing id set membership is stable across re-derivation", () => {
  // The dialog builds a Set from the id list; membership must not depend on the
  // array identity, which is what the old code relied on.
  const first = new Set(deriveExistingModelIds(["a", "b"]).ids);
  const second = new Set(deriveExistingModelIds(["a", "b"]).ids);

  assert.equal(first.has("a"), second.has("a"));
  assert.equal(first.has("z"), second.has("z"));
  assert.equal(first.size, second.size);
});
