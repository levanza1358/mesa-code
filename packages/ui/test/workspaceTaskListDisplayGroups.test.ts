import assert from "node:assert/strict";
import test from "node:test";
import type { MesaCodeTaskMeta } from "@mesa-code/shared";
import { buildTaskEntityKey, type CachedTaskListResult } from "../src/lib/taskQueryCache.js";
import {
  buildWorkspaceTaskListDisplayGroups,
  type WorkspaceTaskListGroup,
} from "../src/hooks/workspaceTaskListDisplayGroups.js";

const scope = { workspacePath: "C:/workspace" };
const workspaceKey = scope.workspacePath;
const queryKey = "workspace-query";
const task = {
  taskId: "task-1",
  workspacePath: scope.workspacePath,
  title: "Fix",
  createdAt: 1,
  updatedAt: 2,
  status: "completed",
} as MesaCodeTaskMeta;
const taskKey = buildTaskEntityKey(task);

function result(overrides: Partial<CachedTaskListResult> = {}): CachedTaskListResult {
  return {
    taskKeys: [taskKey],
    total: 1,
    hasMore: false,
    fetchedAt: 1,
    invalidationVersion: 1,
    stale: false,
    partial: false,
    loadingShardKeys: [],
    failedShardKeys: [],
    descriptor: {
      kind: "workspace",
      sortBy: "updated",
      search: "",
      expanded: false,
      visibleLimit: 5,
      workspaceKeys: [workspaceKey],
    },
    ...overrides,
  };
}

function groups(
  cached: CachedTaskListResult | undefined,
  taskMetaByEntityKey: Record<string, MesaCodeTaskMeta>,
  previousGroupsByWorkspaceKey = new Map<string, WorkspaceTaskListGroup>(),
) {
  return buildWorkspaceTaskListDisplayGroups({
    queryConfigs: [
      {
        scope,
        workspaceKey,
        visibleLimit: 5,
        queryKey,
      },
    ],
    resultsByQueryKey: cached ? { [queryKey]: cached } : {},
    taskMetaByEntityKey,
    taskUnreadOverlayByEntityKey: {},
    optimisticTaskOverlayByWorkspaceKey: new Map(),
    previousGroupsByWorkspaceKey,
    sortBy: "updated",
  }).groups[0]!;
}

const committedGroup = groups(result(), { [taskKey]: task });

test("stale task metadata keeps the last committed rows visible", () => {
  const displayed = groups(result({ stale: true }), {}, new Map([[workspaceKey, committedGroup]]));

  assert.strictEqual(displayed, committedGroup);
  assert.deepEqual(displayed.items, [task]);
});

test("first hydration without a cache remains empty until data arrives", () => {
  const displayed = groups(undefined, {});

  assert.deepEqual(displayed.items, []);
  assert.equal(displayed.total, 0);
});

test("confirmed empty results replace the previous snapshot", () => {
  const displayed = groups(
    result({ taskKeys: [], total: 0, stale: false }),
    {},
    new Map([[workspaceKey, committedGroup]]),
  );

  assert.notStrictEqual(displayed, committedGroup);
  assert.deepEqual(displayed.items, []);
  assert.equal(displayed.total, 0);
});

test("intentional archive removal is not resurrected by stale fallback", () => {
  const displayed = groups(
    result({ taskKeys: [], total: 0, stale: true }),
    {},
    new Map([[workspaceKey, committedGroup]]),
  );

  assert.deepEqual(displayed.items, []);
  assert.equal(displayed.total, 0);
});

test("equivalent committed snapshots preserve group identity", () => {
  const displayed = groups(
    result(),
    { [taskKey]: task },
    new Map([[workspaceKey, committedGroup]]),
  );

  assert.strictEqual(displayed, committedGroup);
  assert.strictEqual(displayed.items, committedGroup.items);
});
