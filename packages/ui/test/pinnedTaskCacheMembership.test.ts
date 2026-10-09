// Regression coverage for docs/specs/pinned-task-cache-membership.md.
//
// Pinning a task from the timeline list must move the row into the "Pinned" query result and out of
// the timeline result. The bug this guards against: the pin call site passes
// `previousState: { pinned: false }`, and the store used to trust that for every cached query, so
// the `pinned` query computed `previousIncluded = nextIncluded = false` and never received the row.
import assert from "node:assert/strict";
import test from "node:test";
import type { MesaCodeTaskMeta } from "@mesa-code/shared";
import {
  buildTaskEntityKey,
  buildTaskListCacheKeyFromDescriptor,
} from "../src/lib/taskQueryCache.js";
import {
  useTaskQueryCacheStore,
  type TaskListMembershipState,
} from "../src/store/taskQueryCacheStore.js";

const work = {
  kind: "workspace" as const,
  sortBy: "updated" as const,
  search: "",
  expanded: true,
  visibleLimit: null,
  workspaceKeys: ["/example/workspace"],
};
const timeline = { ...work, kind: "timeline" as const };
const pinned = { ...work, kind: "pinned" as const };
const archived = { ...work, kind: "archived" as const };

function buildTask(taskId: string, updatedAt: number): MesaCodeTaskMeta {
  return {
    taskId,
    traceId: `trace-${taskId}`,
    title: `Task ${taskId}`,
    workspacePath: "/example/workspace",
    createdAt: updatedAt,
    updatedAt,
    mode: "build",
    provider: "glm",
  };
}

function seedResults(tasks: MesaCodeTaskMeta[]): void {
  const store = useTaskQueryCacheStore.getState();
  const items = tasks.map((task) => ({ ...task, taskId: task.taskId }));
  const entityKeys = tasks.map((task) => buildTaskEntityKey(task));
  for (const descriptor of [timeline, pinned, archived]) {
    // The pinned/archived descriptors start empty; the timeline holds the whole task set.
    const isTimeline = descriptor.kind === "timeline";
    store.setQueryResult({
      queryKey: buildTaskListCacheKeyFromDescriptor(descriptor),
      descriptor,
      items: isTimeline ? items : [],
      total: isTimeline ? items.length : 0,
      hasMore: false,
    });
  }
  assert.equal(entityKeys.length, tasks.length);
}

function readQuery(descriptor: typeof work): {
  taskKeys: string[];
  total: number;
} {
  const result =
    useTaskQueryCacheStore.getState().resultsByQueryKey[
      buildTaskListCacheKeyFromDescriptor(descriptor)
    ];
  assert.ok(result, `expected a cached ${descriptor.kind} query result`);
  return { taskKeys: result.taskKeys, total: result.total };
}

test("pinning from timeline adds the row to pinned and removes it from timeline", () => {
  const store = useTaskQueryCacheStore.getState();
  store.clearAll();
  const task = buildTask("t1", 10);
  seedResults([task]);
  const entityKey = buildTaskEntityKey(task);

  const previousState: TaskListMembershipState = { pinned: false, archived: false };
  const nextState: TaskListMembershipState = { pinned: true, archived: false };
  store.applyTaskMutation({ previousTask: task, nextTask: task, previousState, nextState });

  const pinnedResult = readQuery(pinned);
  const timelineResult = readQuery(timeline);
  assert.deepEqual(pinnedResult.taskKeys, [entityKey], "row must appear in pinned");
  assert.equal(pinnedResult.total, 1, "pinned total must count the new row");
  assert.deepEqual(timelineResult.taskKeys, [], "row must leave timeline");
  assert.equal(timelineResult.total, 0, "timeline total must drop the row");
});

test("pinning an already-pinned row does not duplicate or double-count it", () => {
  const store = useTaskQueryCacheStore.getState();
  store.clearAll();
  const task = buildTask("t2", 11);
  seedResults([task]);
  const entityKey = buildTaskEntityKey(task);

  const nextState: TaskListMembershipState = { pinned: true, archived: false };
  // First pin: timeline -> pinned.
  store.applyTaskMutation({
    previousTask: task,
    nextTask: task,
    previousState: { pinned: false, archived: false },
    nextState,
  });
  assert.deepEqual(readQuery(pinned).taskKeys, [entityKey]);
  assert.equal(readQuery(pinned).total, 1);

  // Second pin on an already-pinned row: confirming no-op must keep the row once.
  store.applyTaskMutation({
    previousTask: task,
    nextTask: task,
    previousState: { pinned: true, archived: false },
    nextState,
  });
  assert.deepEqual(readQuery(pinned).taskKeys, [entityKey]);
  assert.equal(readQuery(pinned).total, 1, "pinned total must not double count");
});

test("unpinning from pinned moves the row back to timeline", () => {
  const store = useTaskQueryCacheStore.getState();
  store.clearAll();
  const task = buildTask("t3", 12);
  seedResults([task]);

  // Move into pinned first.
  store.applyTaskMutation({
    previousTask: task,
    nextTask: task,
    previousState: { pinned: false, archived: false },
    nextState: { pinned: true, archived: false },
  });
  assert.equal(readQuery(pinned).total, 1);

  // Unpin: pinned -> timeline.
  store.applyTaskMutation({
    previousTask: task,
    nextTask: task,
    previousState: { pinned: true, archived: false },
    nextState: { pinned: false, archived: false },
  });
  assert.equal(readQuery(pinned).total, 0, "row must leave pinned");
  assert.equal(readQuery(timeline).total, 1, "row must return to timeline");
});

test("archiving a pinned row removes it from both live lists and adds it to archived", () => {
  const store = useTaskQueryCacheStore.getState();
  store.clearAll();
  const task = buildTask("t4", 13);
  seedResults([task]);
  const entityKey = buildTaskEntityKey(task);

  store.applyTaskMutation({
    previousTask: task,
    nextTask: task,
    previousState: { pinned: false, archived: false },
    nextState: { pinned: true, archived: false },
  });
  store.applyTaskMutation({
    previousTask: task,
    nextTask: task,
    previousState: { pinned: true, archived: false },
    nextState: { pinned: false, archived: true },
  });

  assert.equal(readQuery(pinned).total, 0, "row must leave pinned");
  assert.equal(readQuery(timeline).total, 0, "row must leave timeline");
  assert.deepEqual(readQuery(archived).taskKeys, [entityKey], "row must appear in archived");
  assert.equal(readQuery(archived).total, 1);
});

test("pinning reaches a never-fetched pinned query that has no cached row", () => {
  const store = useTaskQueryCacheStore.getState();
  store.clearAll();
  const task = buildTask("t5", 14);
  seedResults([task]);
  const entityKey = buildTaskEntityKey(task);

  // A fresh pinned query must be able to receive the row even though its taskKeys started empty.
  assert.equal(readQuery(pinned).total, 0);
  store.applyTaskMutation({
    previousTask: task,
    nextTask: task,
    previousState: { pinned: false, archived: false },
    nextState: { pinned: true, archived: false },
  });
  assert.deepEqual(readQuery(pinned).taskKeys, [entityKey]);
  assert.equal(readQuery(pinned).total, 1);
});

test("a row already cached in pinned survives a pin whose caller declares previousState pinned=false", () => {
  // Regression for the reported bug: the pin call site passes `previousState: { pinned: false }`
  // even though the pinned query already holds the row. Trusting that claim removed the row from the
  // pinned result (visibleCandidateKeys dropped it) while leaving total unchanged, so the pinned row
  // vanished from the sidebar. The row's own list membership must win.
  const store = useTaskQueryCacheStore.getState();
  store.clearAll();
  const task = buildTask("t6", 15);
  seedResults([task]);
  const entityKey = buildTaskEntityKey(task);

  // Simulate the confirmed pin that already populated the pinned result.
  store.applyTaskMutation({
    previousTask: task,
    nextTask: task,
    previousState: { pinned: true, archived: false },
    nextState: { pinned: true, archived: false },
  });
  // The store cannot add a row it never had, so seed the pinned result the way a refetch would.
  store.setQueryResult({
    queryKey: buildTaskListCacheKeyFromDescriptor(pinned),
    descriptor: pinned,
    items: [{ ...task }],
    total: 1,
    hasMore: false,
  });
  assert.deepEqual(readQuery(pinned).taskKeys, [entityKey]);

  // Now a caller that wrongly claims the row was not pinned must not evict it.
  store.applyTaskMutation({
    previousTask: task,
    nextTask: task,
    previousState: { pinned: false, archived: false },
    nextState: { pinned: true, archived: false },
  });
  assert.deepEqual(readQuery(pinned).taskKeys, [entityKey], "row must stay in pinned");
  assert.equal(readQuery(pinned).total, 1, "pinned total must stay consistent");
});
