import type { ConversationRow, SessionPhase } from "@mesa-code/shared/mesa-code-protocol-v4";
import { buildConversationTurnRenderUnitsUncached } from "@/v4/conversationTurnRenderUnitsCore.js";
import type {
  BuildConversationTurnRenderUnitsOptions,
  ConversationTurnRenderUnit,
} from "@/v4/conversationTurnRenderUnitsCore.js";

export type { AssistantWorkRow, ConversationTurnFlowItem } from "@/v4/conversationTurnFlowItems.js";
export type {
  ConversationTurnWorkSegment,
  ConversationTurnWorkStatus,
} from "@/v4/conversationTurnWorkSegments.js";
export {
  buildConversationTurnRenderUnitsUncached,
  type BuildConversationTurnRenderUnitsOptions,
  type ConversationTurnRenderUnit,
} from "@/v4/conversationTurnRenderUnitsCore.js";

export interface ConversationTurnRenderUnitsCacheEntry {
  unit: ConversationTurnRenderUnit;
  memberRows: readonly ConversationRow[];
  isLastDraft: boolean;
  nowMsKey: number | undefined;
  sessionPhase: SessionPhase | undefined;
}

export type ConversationTurnRenderUnitsCache = Map<string, ConversationTurnRenderUnitsCacheEntry>;

function rowsIdentityEqual(
  previous: readonly ConversationRow[],
  next: readonly ConversationRow[],
): boolean {
  return previous.length === next.length && previous.every((row, index) => row === next[index]);
}

export function buildConversationTurnRenderUnits(
  rows: readonly ConversationRow[],
  options: BuildConversationTurnRenderUnitsOptions = {},
  cache?: ConversationTurnRenderUnitsCache,
): ConversationTurnRenderUnit[] {
  if (!cache) return buildConversationTurnRenderUnitsUncached(rows, options).units;

  const nextCache: ConversationTurnRenderUnitsCache = new Map();
  // Reusing after materialization still derived every historical turn on each stream frame.
  // Cache the raw draft result before filtering; final position normalization stays in Core.
  const { units } = buildConversationTurnRenderUnitsUncached(
    rows,
    options,
    (turnId, memberRows, isLastDraft, materialize) => {
      const previous = cache.get(turnId);
      const matched =
        previous !== undefined &&
        previous.isLastDraft === isLastDraft &&
        previous.sessionPhase === options.sessionPhase &&
        previous.nowMsKey === (previous.unit.isRunning ? options.nowMs : undefined) &&
        rowsIdentityEqual(previous.memberRows, memberRows);
      const unit = matched ? previous.unit : materialize();
      nextCache.set(turnId, {
        unit,
        memberRows,
        isLastDraft,
        nowMsKey: unit.isRunning ? options.nowMs : undefined,
        sessionPhase: options.sessionPhase,
      });
      return unit;
    },
  );
  cache.clear();
  for (const [turnId, entry] of nextCache) cache.set(turnId, entry);
  return units;
}
