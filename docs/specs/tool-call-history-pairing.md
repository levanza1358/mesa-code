# Tool-call history pairing

Status: Implemented

## Product behavior

Every outgoing model request carries a `messages` history whose tool calls and tool
results are structurally consistent, regardless of provider protocol. A tool result
message must always be preceded by the assistant message that declared the matching
tool call.

Some OpenAI-compatible upstreams (for example CodeBuddy) reject an inconsistent history
with HTTP 400 and the business code `tool_call_sequence_broken`:

```
tool calls and tool results do not match, please start a new conversation and retry
```

Because the rejected history is persisted in the session, a naive retry repeats the
same failure forever and the turn can never recover. Mesa Code must therefore repair
the history locally at the logical-request boundary instead of relying on a retry.

## Ownership and boundary

`projectRequestHistory` (`packages/adapters/src/model/runner.ts`) is the single owner of
request-local history projection. It runs once per logical model request, so every
physical retry attempt reuses the already-normalized history rather than
re-normalizing a half-repaired copy.

The projection performs two independent passes:

- `normalizeReasoningHistory` — provider-scoped reasoning-block compatibility, applied
  only for the `anthropic` provider kind.
- `normalizeToolCallHistory` — protocol-neutral tool-call/tool-result pairing, applied
  for every provider kind.

Pairing repair belongs to the adapter, not to `packages/core`: the core history builder
(`buildProviderRequestMessages`) stays provider-neutral, and provider-specific protocol
serialization stays in the adapter.

## Invariants

- A tool result whose `toolCallId` has no preceding assistant tool call is dropped. It
  can never be satisfied, and forwarding it invokes upstream rejection.
- An assistant tool call with no matching tool result is preserved but its missing
  results are filled with an explicit interrupted-result placeholder, so the assistant
  turn remains well formed.
- Duplicate tool results for the same `toolCallId` are collapsed to the first result;
  later duplicates are dropped.
- Messages that are neither assistant tool calls nor tool results keep their relative
  order and content unchanged.
- Tool results are never reordered before their declaring assistant message.
- Normalization is idempotent: running it on its own output returns an equivalent
  history.

## Acceptance scenarios

1. Given history `[user, tool(call_x)]`, the outgoing request drops the orphan tool
   result and sends `[user]`.
2. Given history `[user, assistant(tool_calls=[call_a]), tool(call_a), tool(call_b)]`,
   the outgoing request drops `tool(call_b)` and keeps `tool(call_a)`.
3. Given history `[user, assistant(tool_calls=[call_a])]` with no result, the outgoing
   request appends an interrupted placeholder result for `call_a`.
4. Given history `[user, assistant(tool_calls=[call_a]), tool(call_a), tool(call_a)]`,
   the outgoing request keeps exactly one `tool(call_a)` result.
5. A CodeBuddy-backed model that previously failed every turn with
   `tool_call_sequence_broken` completes a turn once a broken session is normalized.
6. Anthropic-only reasoning normalization behavior is unchanged.
