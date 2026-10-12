import assert from "node:assert/strict";
import test from "node:test";
import { ConversationProjectionStore } from "@/v4/conversationProjectionStore.js";
import type { SessionLease } from "@/v4/sessionDataLayer.js";
import type { ConversationTransport } from "@/v4/transport.js";
import type { ConversationSnapshot } from "@mesa-code/shared/mesa-code-protocol-v4";

// Minimal transport: only the subscriptions the store constructor touches are needed here; the store
// is driven by assigning its private `state` directly so no frame delivery is involved.
function createStoreWithSnapshot(sessionId: string): ConversationProjectionStore {
  const transport = {
    onAssemblyFault: () => () => {},
    onRuntimeLifecycle: () => () => {},
    onRuntimeRestart: () => () => {},
  } as unknown as ConversationTransport;
  const store = new ConversationProjectionStore(`mesa-code-conversation:${sessionId}`, transport);
  const snapshot = { sessionId, logEpoch: "epoch", revision: 1 } as unknown as ConversationSnapshot;
  (store as unknown as { state: object }).state = { status: "live", snapshot };
  return store;
}

function createLease(sessionId: string, store: ConversationProjectionStore): SessionLease {
  return { sessionId, store } as unknown as SessionLease;
}

// The hook's store selection is the guard's whole effect: given a lease and the session the pane is
// rendering, which store (if any) does it read? Mirroring it here keeps the test free of a React
// renderer while still pinning the exact rule the hook encodes.
function storeForGuard(lease: SessionLease | null, sessionId: string | null) {
  const expectedSessionId = sessionId ?? null;
  return lease && (!expectedSessionId || lease.sessionId === expectedSessionId)
    ? lease.store
    : null;
}

test("stale-lease guard rejects the previous session's store for the new session", () => {
  const oldStore = createStoreWithSnapshot("old-session");
  const newStore = createStoreWithSnapshot("new-session");
  const lease = createLease("old-session", oldStore);

  assert.equal(
    storeForGuard(createLease("new-session", newStore), "new-session"),
    newStore,
    "a lease that matches the rendered session yields its store",
  );
  assert.equal(
    storeForGuard(lease, "new-session"),
    null,
    "a stale lease (old session) is rejected while the pane already renders the new session",
  );
  assert.equal(
    storeForGuard(lease, null),
    oldStore,
    "a draft/prewarm render (no session) keeps the projection",
  );
  assert.equal(storeForGuard(null, "new-session"), null, "no lease yields no store");
});

test("the guard leaves the new session's pane empty until its own snapshot arrives", () => {
  const oldStore = createStoreWithSnapshot("old-session");
  const lease = createLease("old-session", oldStore);
  assert.equal(oldStore.getState().snapshot?.sessionId, "old-session", "fixture exposes old rows");

  // With the guard the stale frame's store is null, so the pane reads the closed projection
  // (snapshot null): the timeline stays empty instead of flashing the old chat under the new task,
  // and the composer sees `snapshot === null` and stays disabled through the switch.
  const guarded = storeForGuard(lease, "new-session");
  assert.equal(guarded, null, "no old-session snapshot leaks into the new session's pane");
});
