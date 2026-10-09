import type { ModelInputMessage } from "@mesa-code/contracts";

const INTERRUPTED_TOOL_RESULT = "[Tool result unavailable: the model request was interrupted]";

/**
 * Repair tool-call / tool-result pairing for an outgoing model request.
 *
 * Some OpenAI-compatible upstreams reject a history whose tool results do not match the
 * assistant tool calls that declared them (CodeBuddy answers HTTP 400 with the business
 * code `tool_call_sequence_broken`). Because the rejected history stays in the session,
 * a retry repeats the same request and the turn can never recover, so the repair has to
 * happen locally at the logical-request boundary instead of relying on a retry.
 *
 * Owns three invariants:
 * - a tool result without a declaring assistant tool call is dropped;
 * - an assistant tool call without a result gets an interrupted-result placeholder;
 * - a duplicated tool result for one tool call id is collapsed to its first occurrence.
 */
export function normalizeToolCallHistory(messages: ModelInputMessage[]): ModelInputMessage[] {
  const declaredToolCallIds = collectDeclaredToolCallIds(messages);
  const withoutOrphans = dropUndeclaredToolResults(messages, declaredToolCallIds);
  const withoutDuplicates = dropDuplicateToolResults(withoutOrphans);
  const withPlaceholders = fillMissingToolResults(withoutDuplicates, declaredToolCallIds);
  return withPlaceholders;
}

function collectDeclaredToolCallIds(messages: readonly ModelInputMessage[]): Set<string> {
  const ids = new Set<string>();
  for (const message of messages) {
    for (const toolCall of message.toolCalls ?? []) {
      if (toolCall.id) ids.add(toolCall.id);
    }
  }
  return ids;
}

function dropUndeclaredToolResults(
  messages: ModelInputMessage[],
  declaredToolCallIds: ReadonlySet<string>,
): ModelInputMessage[] {
  const filtered = messages.filter((message) => {
    const toolCallId = toolResultId(message);
    // A tool result can only be answered when its declaring assistant tool call is still
    // in the history; an undeclared one is unsatisfiable and always rejected upstream.
    return toolCallId === undefined || declaredToolCallIds.has(toolCallId);
  });
  return filtered.length === messages.length ? messages : filtered;
}

function dropDuplicateToolResults(messages: ModelInputMessage[]): ModelInputMessage[] {
  const seen = new Set<string>();
  let result: ModelInputMessage[] | undefined;

  for (let index = 0; index < messages.length; index += 1) {
    const toolCallId = toolResultId(messages[index]!);
    if (toolCallId === undefined) continue;

    if (seen.has(toolCallId)) {
      result ??= messages.slice(0, index);
      continue;
    }
    seen.add(toolCallId);
    result?.push(messages[index]!);
  }

  return result ?? messages;
}

function fillMissingToolResults(
  messages: ModelInputMessage[],
  declaredToolCallIds: ReadonlySet<string>,
): ModelInputMessage[] {
  const answered = new Set<string>();
  for (const message of messages) {
    const toolCallId = toolResultId(message);
    if (toolCallId !== undefined) answered.add(toolCallId);
  }

  let result: ModelInputMessage[] | undefined;

  // Each assistant tool call keeps its result in the same position the interrupted-tool
  // path uses, so an assistant turn is never left half open.
  for (const message of messages) {
    const pending = (message.toolCalls ?? []).filter(
      (toolCall) => toolCall.id && declaredToolCallIds.has(toolCall.id) && !answered.has(toolCall.id),
    );
    if (pending.length === 0) {
      result?.push(message);
      continue;
    }

    result ??= [];
    result.push(message);
    for (const toolCall of pending) {
      answered.add(toolCall.id);
      result.push({
        role: "tool",
        content: INTERRUPTED_TOOL_RESULT,
        toolCallId: toolCall.id,
        toolName: toolCall.name,
        isError: true,
      });
    }
  }

  return result ?? messages;
}

/** Returns the tool call id when the message is a tool result, otherwise `undefined`. */
function toolResultId(message: ModelInputMessage): string | undefined {
  if (message.role !== "tool") return undefined;
  const toolCallId = message.toolCallId?.trim();
  return toolCallId ? toolCallId : undefined;
}
