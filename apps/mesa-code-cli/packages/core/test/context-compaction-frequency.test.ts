// Auto-compaction frequency: the raised threshold (128K/64K -> 110K, 86%) and
// the post-compact hysteresis hold that stops a successful compaction from
// re-triggering on the very next model step of the same turn.
import assert from "node:assert/strict";
import test from "node:test";

import {
  AUTOCOMPACT_HYSTERESIS_TOKENS,
  getAutoCompactOutputReserveTokens,
  getAutoCompactThreshold,
  getEffectiveContextWindowSize,
  shouldAutoCompact,
  shouldHoldAfterRecentAutoCompact,
  type AutoCompactPolicyConfig,
} from "../src/compact/policy.js";
import type { CompactModelMessage } from "../src/compact/manual.js";

const WINDOW = 128_000;
const OUTPUT = 64_000;
const config: AutoCompactPolicyConfig = {
  contextWindow: WINDOW,
  maxOutputTokens: OUTPUT,
};

// Two assistant-started rounds, so hasEnoughMessagesToCompact is satisfied.
const twoRounds: CompactModelMessage[] = [
  { role: "user", content: "hello" },
  { role: "assistant", content: "hi there" },
  { role: "user", content: "again" },
  { role: "assistant", content: "sure" },
];

const usage = (tokenCount: number) =>
  ({ source: "provider_usage", tokenCount }) as const;

test("a 128K/64K model raises the threshold to 110K (86% of the window)", () => {
  // Reserve dropped 21K -> 12K, buffer dropped 13K -> 6K.
  assert.equal(getAutoCompactOutputReserveTokens(config), 12_000);
  assert.equal(getEffectiveContextWindowSize(config), 116_000);
  assert.equal(getAutoCompactThreshold(config), 110_000);
});

test("the reserve still covers the largest summary attempt plus headroom", () => {
  // The reserve only has to cover a single summary request, not the full output
  // budget: 12K reserve + 6K buffer leaves 110K of live context.
  assert.ok(getAutoCompactOutputReserveTokens(config) >= 12_000);
  assert.ok(getAutoCompactThreshold(config) <= WINDOW - 18_000);
});

test("a request below the threshold does not compact; at the threshold it does", () => {
  const threshold = getAutoCompactThreshold(config);

  const below = shouldAutoCompact({
    messages: twoRounds,
    config,
    tokenOverride: usage(threshold - 1),
  });
  assert.equal(below.shouldCompact, false);
  assert.equal(below.reason, "below_threshold");

  const at = shouldAutoCompact({
    messages: twoRounds,
    config,
    tokenOverride: usage(threshold),
  });
  assert.equal(at.shouldCompact, true);
  assert.equal(at.reason, "above_threshold");
});

test("hysteresis holds until the context grows past the post-compact size by the margin", () => {
  const baseline = 100_000;

  assert.equal(
    shouldHoldAfterRecentAutoCompact({
      tokenCount: baseline + AUTOCOMPACT_HYSTERESIS_TOKENS - 1,
      lastAutoCompactPostTokens: baseline,
    }),
    true,
  );
  assert.equal(
    shouldHoldAfterRecentAutoCompact({
      tokenCount: baseline + AUTOCOMPACT_HYSTERESIS_TOKENS,
      lastAutoCompactPostTokens: baseline,
    }),
    false,
  );
});

test("hysteresis is inert before any successful auto-compaction", () => {
  assert.equal(
    shouldHoldAfterRecentAutoCompact({
      tokenCount: 1_000_000,
      lastAutoCompactPostTokens: undefined,
    }),
    false,
  );
});

test("the hysteresis margin is a constant that can be overridden for a caller", () => {
  assert.equal(
    shouldHoldAfterRecentAutoCompact({
      tokenCount: 5_000,
      lastAutoCompactPostTokens: 0,
      hysteresisTokens: 6_000,
    }),
    true,
  );
  assert.equal(
    shouldHoldAfterRecentAutoCompact({
      tokenCount: 6_000,
      lastAutoCompactPostTokens: 0,
      hysteresisTokens: 6_000,
    }),
    false,
  );
});

test("a post-compact context still above the threshold is held by hysteresis", () => {
  const threshold = getAutoCompactThreshold(config);
  // A compact can leave the live context at or above the threshold because only
  // one recent round is preserved.
  const lastAutoCompactPostTokens = threshold + 1_000;

  const decision = shouldAutoCompact({
    messages: twoRounds,
    config,
    tokenOverride: usage(threshold + 1_000 + AUTOCOMPACT_HYSTERESIS_TOKENS - 1),
  });
  // The threshold decision alone would compact again...
  assert.equal(decision.shouldCompact, true);
  // ...but the hysteresis gate holds it until the context grows further.
  assert.equal(
    shouldHoldAfterRecentAutoCompact({
      tokenCount: decision.tokenCount,
      lastAutoCompactPostTokens,
    }),
    true,
  );
});
