import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_SUBAGENT_INACTIVITY_TIMEOUT_MS,
  type SessionEvent,
  type SubagentRunOptions,
} from "@mesa-code/contracts";
import { createExploreSubagentPort } from "../src/subagent/runner.js";
import { GENERAL_PURPOSE_AGENT_TYPE } from "../src/subagent/general-purpose.js";
import type { ExploreSubagentRuntimeRequest } from "../src/subagent/runner.js";

// ---------------------------------------------------------------------------
// Subagent inactivity watchdog
//
// Regression guard for the "subagent stuck for ~10 minutes" report. The runner's
// activity watchdog must (a) abort a child that produces no activity within the
// bounded window, and (b) leave a child that keeps reporting activity alone.
// ---------------------------------------------------------------------------

const BOUNDED_WINDOW_MS = 60;

function createPort(
  runExploreAgent: (
    request: ExploreSubagentRuntimeRequest,
    options?: SubagentRunOptions,
  ) => Promise<{ response: string; traceId: string; events: SessionEvent[] }>,
) {
  return createExploreSubagentPort({
    inactivityTimeoutMs: BOUNDED_WINDOW_MS,
    runExploreAgent: runExploreAgent as never,
    emitParentEvent: async () => {},
  });
}

function createRequest() {
  return {
    sessionId: "sess_parent_watchdog_test" as never,
    turnId: "turn_1" as never,
    parentToolCallId: "call_1",
    agentType: GENERAL_PURPOSE_AGENT_TYPE,
    description: "watchdog probe",
    prompt: "do nothing",
    workingDirectory: process.cwd(),
    workspaceRoot: process.cwd(),
    trace: {
      traceId: "trace_1" as never,
      spanId: "span_1",
      sessionId: "sess_parent_watchdog_test" as never,
    },
  };
}

test("watchdog aborts a child that never settles and stays silent", async () => {
  let aborted = false;
  const port = createPort(async (request, options) => {
    await request.onSessionReady?.();
    // The child neither returns nor reacts to abort: only the watchdog can settle it.
    options?.signal?.addEventListener("abort", () => {
      aborted = true;
    });
    return new Promise<never>(() => {});
  });

  await assert.rejects(
    () => port.run(createRequest() as never),
    (error: unknown) => {
      assert.equal((error as { type?: string }).type, "tool_timeout");
      assert.match(String((error as Error).message), /inactive/i);
      return true;
    },
  );
  assert.equal(aborted, true, "the watchdog must abort the child's AbortSignal");
});

test("watchdog does not fire while the child keeps reporting activity", async () => {
  let aborted = false;
  const port = createPort(async (request, options) => {
    await request.onSessionReady?.();
    const signal = options?.signal as AbortSignal;
    signal.addEventListener("abort", () => {
      aborted = true;
    });
    const report = setInterval(() => request.reportActivity?.(), 10);
    try {
      // Stay "running" well past the bounded window while reporting activity; then resolve
      // normally. If the watchdog wrongly fired, the guarded promise would reject instead.
      await new Promise<void>((resolve) => setTimeout(resolve, BOUNDED_WINDOW_MS * 3));
      return { response: "ok", traceId: "trace_1" as never, events: [] };
    } finally {
      clearInterval(report);
    }
  });

  const output = await port.run(createRequest() as never);
  assert.equal((output as { status?: string }).status, "completed");
  assert.equal(aborted, false, "a child that keeps reporting activity must not be aborted");
});

test("the default subagent window is independently bounded below the model-stream idle timeout", async () => {
  // 120s default must be strictly shorter than the 600s model-stream idle timeout, otherwise
  // the watchdog and the stream idle timeout expire together and neither interrupts a silent
  // child (the original defect).
  assert.equal(DEFAULT_SUBAGENT_INACTIVITY_TIMEOUT_MS, 120_000);
  assert.ok(DEFAULT_SUBAGENT_INACTIVITY_TIMEOUT_MS < 600_000);
});
