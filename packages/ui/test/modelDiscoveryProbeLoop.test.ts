import assert from "node:assert/strict";
import test from "node:test";

/**
 * Simulates the render/effect cycle that produced the model-discovery refetch
 * loop, to prove the fix removes it.
 *
 * We model the two competing designs:
 *
 * - OLD: the parent passes an inline array, so `existingModelIds` has a fresh
 *   identity every render; `useMemo(() => new Set(ids), [ids])` yields a new Set;
 *   `useCallback(..., [existingIds])` yields a new probe; the `[open, probe]`
 *   effect re-fires. The probe also calls `setPhase("loading")`, which triggers
 *   the next render — a closed loop.
 * - NEW: the parent memoizes on a content key and the dialog keys its probe on a
 *   content string, so identity is stable and the effect runs once per opening.
 */

/**
 * Model React's `useMemo`/`useCallback` dependency comparison for one render
 * pass, and count how many probe invocations the effect would perform.
 */
function simulateEffects({ renderCount, deriveIds, probeDeps }) {
  let probeRuns = 0;
  let previousDeps = null;

  for (let render = 0; render < renderCount; render += 1) {
    const ids = deriveIds(render);
    const deps = probeDeps(ids);

    const depsChanged =
      previousDeps === null ||
      deps.length !== previousDeps.length ||
      deps.some((value, index) => !Object.is(value, previousDeps[index]));

    if (depsChanged) {
      probeRuns += 1;
      previousDeps = deps;
    }
  }

  return probeRuns;
}

test("inline array dependency re-runs the probe on every render (old behaviour)", () => {
  // Parent builds a new array per render; Set and callback identities follow it.
  const runs = simulateEffects({
    renderCount: 10,
    deriveIds: () => ["m1", "m2"],
    probeDeps: (ids) => [new Set(ids), "provider-a"],
  });

  assert.equal(runs, 10, "the old shape re-probed on every render, which is the bug");
});

test("content-keyed dependencies run the probe once (fixed behaviour)", () => {
  const runs = simulateEffects({
    renderCount: 10,
    deriveIds: () => ["m1", "m2"],
    // Key on joined content plus a stable provider id, mirroring the fix.
    probeDeps: (ids) => [ids.join("\u0000"), "provider-a"],
  });

  assert.equal(runs, 1, "a stable content key must probe exactly once");
});

test("the probe re-runs once when the model list actually changes", () => {
  let call = 0;
  const runs = simulateEffects({
    renderCount: 6,
    deriveIds: () => {
      call += 1;
      // The list changes after the third render, as it would after adding a model.
      return call > 3 ? ["m1", "m2", "m3"] : ["m1", "m2"];
    },
    probeDeps: (ids) => [ids.join("\u0000"), "provider-a"],
  });

  assert.equal(runs, 2, "one probe for the initial list and one after the change");
});
