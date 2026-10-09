import assert from "node:assert/strict";
import test from "node:test";
import { shouldAutoApprovePlanExit } from "../src/mesa-code-protocol/interaction-broker.js";

test("auto-approves when a Full Access grant is standing and plan mode is active", () => {
  assert.equal(
    shouldAutoApprovePlanExit({ mode: "yolo", planEnabled: true, hasFullAccessGrant: true }),
    true,
  );
});

// Regression: switching into plan mode writes `mode` directly, so a Full Access session can
// report `mode === "plan"` while the grant is still in force. The grant — not the mode — is
// what Full Access means, so the plan dialog must not reappear here.
test("auto-approves a Full Access grant even when mode was overwritten to plan", () => {
  assert.equal(
    shouldAutoApprovePlanExit({ mode: "plan", planEnabled: true, hasFullAccessGrant: true }),
    true,
  );
});

test("auto-approves the in-turn yolo state without a persisted grant marker", () => {
  assert.equal(
    shouldAutoApprovePlanExit({ mode: "yolo", planEnabled: true, hasFullAccessGrant: false }),
    true,
  );
});

test("keeps the dialog when the plan state is unknown", () => {
  assert.equal(shouldAutoApprovePlanExit({ mode: "yolo" }), false);
});

test("keeps the dialog for non-Full-Access build sessions", () => {
  assert.equal(
    shouldAutoApprovePlanExit({ mode: "build", planEnabled: true, hasFullAccessGrant: false }),
    false,
  );
  assert.equal(
    shouldAutoApprovePlanExit({ mode: "edit", planEnabled: true, hasFullAccessGrant: false }),
    false,
  );
});

test("keeps the dialog when plan mode is not active", () => {
  assert.equal(
    shouldAutoApprovePlanExit({ mode: "yolo", planEnabled: false, hasFullAccessGrant: true }),
    false,
  );
});
