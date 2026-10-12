import { useSyncExternalStore } from "react";
import type { ConversationStoreState } from "@/v4/conversationProjectionStore.js";
import type { SessionLease } from "@/v4/sessionDataLayer.js";

const CLOSED_STATE: ConversationStoreState = {
  status: "closed",
  snapshot: null,
  subscriptionId: null,
  lastError: null,
  optimisticCommands: [],
  loadingOlder: false,
  sessionPlans: [],
  planDirectoryRevision: 0,
  plansLoading: false,
  turnNavigatorDirectoryRevision: 0,
};

const identity = <T>(state: T): T => state;

/**
 * Subscribes to a per-session projection store (useSyncExternalStore; row-level selectors run in the
 * consumer).
 *
 * `options.sessionId` opts into a stale-lease guard. The pane acquires its lease in a passive effect,
 * so on the render where `sessionId` has already changed to the new session, `lease` still points at
 * the previous session's store for one commit. Reading that store hands out the OLD session's snapshot
 * (rows, pending interactions, composer, side docks, plan panels), which the pane then renders under
 * the new task's header — the "everything is wrong for a moment, then correct" flash on chat switch.
 * When `sessionId` is provided and does not match the lease, this returns the closed projection so the
 * whole pane renders empty/connecting together until the matching lease is in place. Callers that do
 * not pass `sessionId` (draft prewarm, read-only side panes) keep the previous behavior.
 */
export function useConversationProjection<T = ConversationStoreState>(
  lease: SessionLease | null,
  options: {
    sessionId?: string | null;
    selector?: (state: ConversationStoreState) => T;
  } = {},
): T {
  const selector = options.selector ?? (identity as (state: ConversationStoreState) => T);
  const expectedSessionId = options.sessionId ?? null;
  // An empty expected id means "no guard" so a draft/prewarm pane is unaffected.
  const store =
    lease && (!expectedSessionId || lease.sessionId === expectedSessionId) ? lease.store : null;
  return useSyncExternalStore(
    (listener) => store?.subscribe(listener) ?? (() => {}),
    () => selector(store?.getState() ?? CLOSED_STATE),
    () => selector(CLOSED_STATE),
  );
}
