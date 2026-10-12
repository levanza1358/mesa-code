import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

/**
 * Regression coverage for the coding-plan entry plan-list probe loop.
 *
 * Symptom: the Host logged `credential.load` continuously — 8,834 calls in one
 * session, peaking around 200-270 per second. Every probe read two credentials
 * (`oauth:bigmodel:access_token` and `oauth:zai:access_token`), so the same
 * restart-every-render bug that hit model discovery was also driving this hook.
 *
 * Cause: the effect's dependency array held `refresh` and `providerSettingsView`,
 * both of which are recreated by upstream renders. A new identity re-fired the
 * effect, the effect re-rendered the tree, and the cycle repeated.
 *
 * The fix keeps `refresh` behind a ref and keys the effect on the view's
 * revision (a stable content identifier) instead of the view object identity.
 * These tests pin that shape.
 */

const hookSource = readFileSync(
  resolve(import.meta.dirname, "..", "src", "hooks", "useCodingPlanEntryPlanList.ts"),
  "utf8",
);

/** Extract the effect dependency array that ends the plan-list probe effect. */
function probeEffectDependencies(source) {
  // Anchor on the probe itself and read forward to its closing dependency array,
  // so unrelated effects in the file cannot be picked up by mistake.
  const anchor = source.indexOf("refreshRef.current({ force: true, silent: true })");
  assert.notEqual(anchor, -1, "expected the probe to call refreshRef.current");

  const depsStart = source.indexOf("}, [", anchor);
  assert.notEqual(depsStart, -1, "expected an effect dependency array after the probe");

  const depsEnd = source.indexOf("]);", depsStart);
  assert.notEqual(depsEnd, -1, "expected a closed dependency array");

  return source
    .slice(depsStart + 4, depsEnd)
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

test("probe effect does not depend on the recreated refresh callback", () => {
  const deps = probeEffectDependencies(hookSource);
  assert.equal(
    deps.includes("refresh"),
    false,
    "`refresh` changes identity per render and must be read through a ref instead",
  );
});

test("probe effect does not depend on the provider view object identity", () => {
  const deps = probeEffectDependencies(hookSource);
  assert.equal(
    deps.includes("providerSettingsView"),
    false,
    "the view object must not gate the effect; use its revision instead",
  );
});

test("probe effect keys on the provider view revision", () => {
  const deps = probeEffectDependencies(hookSource);
  assert.ok(
    deps.includes("providerSettingsViewRevision"),
    "the revision is the stable content key for the view",
  );
});

test("refresh is read through a ref inside the probe", () => {
  assert.match(
    hookSource,
    /refreshRef\.current\(\{\s*force: true,\s*silent: true\s*\}\)/,
    "the probe must call refreshRef.current so its identity cannot retrigger the effect",
  );
});

test("the probe still reads the two provider families' tokens", () => {
  // The optimisation must not drop the work itself: both families are still probed.
  assert.match(hookSource, /\(\["bigmodel", "zai"\] as const\)/);
  assert.match(hookSource, /credentialService\.load\(`oauth:\$\{family\}:access_token`\)/);
});
