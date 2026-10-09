# Context Compaction Frequency

Status: accepted (implemented in `apps/mesa-code-cli/packages/core`)

## Problem

Users on a 128K context window with a 64K output budget reported that the
"Compressing context" (auto context-compaction) marker appears far too often —
many times per tool-heavy turn — even though no single turn approaches the
window size. The compaction itself is successful and blocks the turn while it
runs, so the cost is latency plus a noisy timeline, not a crash.

## Root causes (evidence-backed)

The auto-compaction decision runs once at the top of **every** model step of the
single regular turn loop, so a tool-heavy turn evaluates it many times. Under the
previous policy it also fired too early:

1. Threshold was too low. For a 128K window / 64K output model the reserve was
   capped at 21K and the buffer was 13K, giving a threshold of 94K — 73% of the
   window, leaving ~24% of the window permanently unusable.
2. Token accounting over-estimates. The local estimator divides character count
   by 3, which over-counts English input by roughly a third, and that estimate is
   added to the real provider usage for the newest slice. A request sitting near
   the threshold therefore reads as over it.
3. Post-compact re-trigger. Auto/reactive selection preserves exactly **one**
   recent round. When the most recent round is large (large tool results), the
   context immediately after a successful compaction can still sit at or above
   the threshold, so the very next model step compacts again. The code already
   anticipates this — `willRetriggerNextTurn` is derived from
   `truePostCompactTokenCount >= autoCompactThreshold` — but nothing acts on it.

Circuit breakers only stop pathological loops (3 consecutive failures, or 3
rapid refills within fewer than 3 tool turns); they do not stop frequent yet
"successful" compaction, which is exactly the reported shape.

## Product rules

1. **The threshold must leave the window usable but not fire early.** The output
   reserve and the safety buffer are lowered so that for 128K/64K the threshold
   rises from 94K (73%) to 110K (86%). The reserve still covers the largest
   single compaction summary attempt (`MAX_OUTPUT_TOKENS_FOR_SUMMARY` = 20K on
   the legacy path) plus headroom, and the buffer still absorbs estimation noise.
2. **After a successful compaction, do not compact again until the context has
   actually grown.** If the true live context right after a successful
   compaction is still at or above the threshold, auto-compaction is skipped
   until the context grows by a hysteresis margin above that post-compact size.
   This removes the back-to-back compaction that produces the "constant" marker.
3. **Reactive compaction is never gated.** When the provider rejects a request
   for context overflow, recovery must always be allowed to reclaim space,
   regardless of the hysteresis gate. Hysteresis applies to Auto trigger only.
4. **No new configuration surface.** The change is internal: no Settings field,
   no protocol change, no new user-facing knob.

## State owner

A single new field on the runtime's internal state owner
(`AgentRuntimeInternal` / `AgentRuntime`), alongside the existing
`autoCompactConsecutiveFailures`:

```
lastAutoCompactPostTokens: number | undefined
```

It records the true live context size measured immediately after the last
**successful** auto-compaction, and is the sole input to the hysteresis gate.
It is set only on a successful auto-compaction, and cleared wherever
`autoCompactConsecutiveFailures` is already reset (rewind, and a successful
reactive compaction) so the two compaction-state fields never diverge — there is
exactly one write path.

## Interface

`compactActiveConversation` returns an additional field:

```
truePostCompactTokenCount: number
```

This is the locally estimated live context size after the compaction (the same
value already used for `willRetriggerNextTurn`), as opposed to `tokenCount`,
which is the provider summary's own usage. The caller stores it on success.

Hysteresis gate (in `autoCompactIfNeeded`, Auto trigger only):

```
skip auto-compaction when
  lastAutoCompactPostTokens !== undefined
  and decision.tokenCount < lastAutoCompactPostTokens + AUTOCOMPACT_HYSTERESIS_TOKENS
```

`AUTOCOMPACT_HYSTERESIS_TOKENS` is a constant in `compact/policy.ts`. It is
larger than one typical tool round so a single re-added round does not cross it,
but small enough that genuine sustained growth still triggers a fresh
compaction.

## Ordering

```
turn loop iteration
  └─ autoCompactIfNeeded                          (owner: compact.ts)
       ├─ shouldAutoCompact(...)                  (owner: compact/policy.ts)
       │     tokenCount >= threshold ?  ── no ──▶ "skipped"
       │                               ── yes ─▶ continue
       ├─ hysteresis gate (Auto only)             (owner: AgentRuntimeInternal)
       │     tokenCount < lastPost + margin ? ── yes ─▶ "skipped (hysteresis)"
       │                                       ── no ─▶ continue
       └─ compactActiveConversation(...)
             success ─▶ entries + truePostCompactTokenCount
                        lastAutoCompactPostTokens = truePostCompactTokenCount
                        autoCompactConsecutiveFailures = 0
```

## Acceptance scenarios

1. **Threshold.** For `contextWindow = 128000` and
   `maxOutputTokens = 64000`, `getAutoCompactThreshold` returns 110000.
2. **Below threshold still compacts.** A decision with `tokenCount` at or above
   the threshold and no successful prior compact still yields `shouldCompact`.
3. **Hysteresis suppresses immediate re-trigger.** After a successful
   auto-compaction that left the true live context at `T` (>= threshold), a
   subsequent auto-compaction whose `tokenCount` is below `T + margin` is
   skipped; a subsequent auto-compaction whose `tokenCount` is at or above
   `T + margin` proceeds.
4. **Reactive is not gated.** A reactive overflow recovery compacts even when
   the hysteresis gate would suppress an auto compaction.
5. **Reset points agree.** Rewind and a successful reactive compaction clear
   both `autoCompactConsecutiveFailures` and `lastAutoCompactPostTokens`.

## Out of scope / non-goals

- True background (non-blocking) compaction: the compact shares the turn's
  single message-history and turn-state writers, so running it off the critical
  path would create a second write path to the same owner. Not attempted here.
- Changing the token estimator's divisor.
- Enabling microcompaction by default.

## Related

- [context-prompt-injection-budget](context-prompt-injection-budget.md) — the
  sibling cause. This spec makes compaction fire less often; that one shrinks
  the always-present system prompt, which lowers the count this decision
  compares against. Root cause 2 here (the estimator over-counts) is the same
  estimate that spec relies on, and is likewise left unchanged by both.
