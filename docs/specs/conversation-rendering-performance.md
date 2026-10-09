# Conversation Rendering Performance

**Status:** source optimizations; runtime verification tracked separately  
**Owner:** UI conversation maintainers  
**Authority:** performance contract and measurement boundary  
**Scope:** conversation projection, timeline derivation, composer snapshots, and streaming UI  
**Updated:** 2026-10-09 16:31 (local time)  
**Verification:** synthetic benchmark and isolated runtime evidence are recorded in [`../verification-log.md`](../verification-log.md) when run

## Product behavior

Mesa Code keeps active conversation rendering responsive during streaming and avoids rebuilding or
rerendering unrelated UI when projection metadata changes. Two concrete guarantees:

- Scrolling stays smooth while an assistant response streams: a delta frame that appends text to a
  single row must not rebuild or rerender the other turns, and must not trigger redundant synchronous
  layout work (the repeated forced reads and writes that came from rerendering every turn each token).
  The bottom-anchor effect still reads scroll metrics once per content-changing frame, which is
  required to keep following the streaming tail.
- Opening or closing the side pane or the bottom terminal bar animates the shell without rerendering
  the conversation subtree.

## Ownership and boundaries

The per-session projection store remains the single owner of conversation state. UI consumers select
only the projection fields they render. Conversation row identity and render behavior remain owned by
`packages/ui/src/v4`.

## Invariants

- Snapshot identity is preserved when a store update changes only control metadata.
- The delta reducer preserves identity of what a delta did not touch: a `row.delta`/`row.upserted`/
  `row.appended` returns the same snapshot when it is a no-op, and reuses the existing `ConversationRow`
  object for every row it does not change. `rows.window` is only re-copied when a row is added,
  removed, or replaced.
- The conversation row render context (`rowContext`) identity is stable across frames that change only
  streaming row content, so memoized turn groups and rows bail out for unchanged turns.
- Turn render units are reused (identity preserved) for turns whose member rows are unchanged.
- Toggling side pane or terminal visibility rerenders only the shell chrome, not the conversation
  subtree, and does not force conversation layout work.
- Optimizations do not change command admission, subscription ordering, or remote identity rules, and
  do not change the value of any applied snapshot (`applyAll(s, coalesce(ds))` stays byte-equal to
  `applyAll(s, ds)`).

## Acceptance scenarios

1. Streaming updates do not rerender settings hooks for unrelated hook-store fields.
2. Opening a normal conversation does not build share-only render units.
3. A rejected older-history hydration request can retry on the next eligible render.
4. Applying a `row.delta` for one row leaves every other row in `rows.window` referentially identical,
   and applying a delta that targets a missing row returns the same snapshot object.
5. Coalescing a frame's deltas before applying produces the same snapshot as applying them one by one.
6. Toggling side pane or terminal visibility does not rerender `SessionPane` (the conversation subtree).
7. Existing typecheck and lint checks remain clean.

## Streaming derivation contract

The [Quiet Studio streaming specification](quiet-studio.md#conversation-streaming-work) defines the narrow composer input, empty-find count path, preview eligibility, cache invalidation, and verification scenarios. Turn reuse occurs before materialization, not after a full rebuild. Draft grouping remains a full ordered-row pass; filtering and final position normalization remain unchanged. Cache ownership stays local to the timeline, and published snapshots remain immutable.

```text
Sequence-checked projection -> immutable row identities -> timeline cache -> changed turn derivation
                           -> composer field projection -> existing draft and control owners
```

No delivery batching, owner/lease, storage, protocol, scroll intent, or Markdown parser changes. Synthetic timings measure derivation only; they do not prove smooth scrolling or zero lag in a running application.

## Known follow-ups

- The bottom-anchor and turn-navigator layout effects still run once per content-changing frame: they
  read scroll metrics, and while following they write `scrollTop` and re-sync the navigator viewport.
  This is required for correct stick-to-bottom behavior, so it is deliberately **not** gated behind a
  layout-signal heuristic that could drop a needed re-stick. A later change could batch the navigator
  `getBoundingClientRect` sweep into the next animation frame, but only with runtime evidence that it
  does not regress follow-to-bottom or scroll restoration.
