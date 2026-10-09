# AskUserQuestion answer history

## Product rules

A completed AskUserQuestion card displays the user's submitted answers for each question. Partial submissions leave only genuinely unanswered questions marked as unanswered. An explicit empty answer map retains the existing automatic-continue presentation. Declined or cancelled requests must not manufacture answers.

## Owner and interface

The runtime permission broker owns accepted answers and emits the existing `PermissionResolvedPayload.modifiedInput`. ProductProjection derives the tool row from that event; the renderer reads the row through the existing adapter and `readAskUserQuestionAnswers`. Do not parse model-facing prose to recover answers, add a renderer answer cache, or introduce another persistence write.

For AskUserQuestion only, a non-denied permission resolution with a defined modified input replaces the projected row's input. Other tools retain their existing projection behavior. No protocol schema, storage identifier, or migration changes are required.

```text
Dialog drafts => resolveInteraction command => existing registry/broker
  => PermissionResolved event with modifiedInput => ProductProjection tool row
  => toolCallRowToLegacyNode => AskUserQuestion renderer

Desktop continuous: ordered live deltas from the same runtime owner
Mobile replayable: snapshot and gap repair from the same event projection
Cold history: persisted events => same ProductProjection transition
```

Existing command admission, first-wins interaction resolution, owner/lease checks and workspace/session identity remain unchanged. Replaying a permission event derives the same input; later tool result events retain the accepted input. Old snapshots without accepted answers are not assigned fabricated preferences.

Known limitation (current source, not fixed here): `PermissionResolved` is a memory-only event, and the durable tool part records only the pre-answer input, so a full CLI restart rebuilds the row from the transcript without the accepted answers. Persisting the resolved input is a separate runtime/persistence decision and is not part of this change; the live projection is.

## Acceptance scenarios

1. Submit three answers: all three appear in the completed tool card rather than `No answer provided`.
2. Submit a partial answer map: submitted answers remain visible and unanswered questions retain the existing fallback.
3. Submit an empty map: retain the existing empty-answer continuation label.
4. Deny a request, including malformed events carrying modified input: do not display answers from that denied resolution.
5. Replay the same events after restart: answers match live projection. Verify both continuous and replayable projections.
6. A non-AskUserQuestion permission modification does not change its existing card input behavior.
7. Later success output containing model-facing prose does not overwrite accepted structured answers.

## Verification

Projection regression (CLI): `node_modules/.bin/tsx --test apps/mesa-code-cli/packages/bootstrap/test/ask-user-question-answer-history.test.ts` drives real `TurnStarted` / `ToolCallScheduled` / `PermissionRequested` / `PermissionResolved` events through `ProductProjection` and asserts the tool row carries the merged answers, keeps partial and empty maps, drops answers on deny, and leaves non-answer resolutions untouched.

Renderer read path (UI): `node_modules/.bin/tsx --tsconfig packages/ui/tsconfig.json --test packages/ui/test/askQuestionAnswerHistory.test.ts` passes a projected-shaped `ToolCallRow` through `toolCallRowToLegacyNode` and `readAskUserQuestionAnswers`, proving the card reader sees the answers.

Report renderer interaction coverage separately from projection and cold-replay checks. No installer or launched desktop result is implied by these checks.
