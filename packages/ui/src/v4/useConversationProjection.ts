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

/** 订阅 per-session projection store（useSyncExternalStore，row 级 selector 在组件内再做）。 */
export function useConversationProjection<T = ConversationStoreState>(
  lease: SessionLease | null,
  selector: (state: ConversationStoreState) => T = ((state) => state) as (
    state: ConversationStoreState,
  ) => T,
): T {
  const store = lease?.store ?? null;
  return useSyncExternalStore(
    (listener) => store?.subscribe(listener) ?? (() => {}),
    () => selector(store?.getState() ?? CLOSED_STATE),
    () => selector(CLOSED_STATE),
  );
}
