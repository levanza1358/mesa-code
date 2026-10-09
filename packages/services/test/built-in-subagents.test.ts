// Subagents service behavior for the built-in roster: the Settings list always
// surfaces one row per built-in, persisted model overrides round-trip, and a user
// agent may not take a built-in's name.
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { BUILT_IN_SUBAGENT_METADATA, type MesaCodeProvider } from "@mesa-code/shared";
import { createSubagentsService } from "../src/subagents/subagentsService.js";

const provider: MesaCodeProvider = "glm";

async function withService(
  run: (service: ReturnType<typeof createSubagentsService>) => Promise<void>,
): Promise<void> {
  const homeDir = await mkdtemp(join(tmpdir(), "mesa-code-subagents-"));
  try {
    await run(createSubagentsService({ homeDir, isDesktopRuntime: true }));
  } finally {
    await rm(homeDir, { recursive: true, force: true });
  }
}

test("list surfaces one built-in row per roster entry, in roster order", async () => {
  await withService(async (service) => {
    const result = await service.list({ workspacePath: process.cwd(), provider, mode: "settingsUserOnly" });
    const builtIns = result.agents.filter((agent) => agent.source === "built-in");
    assert.deepEqual(
      builtIns.map((agent) => agent.name),
      BUILT_IN_SUBAGENT_METADATA.map((entry) => entry.name),
    );
    for (const agent of builtIns) {
      assert.equal(agent.scope, "built-in");
      assert.equal(agent.readOnly, true);
      assert.equal(agent.enabled, true);
      assert.equal(agent.systemPrompt, "");
    }
    // Metadata is the single source of truth for the row's descriptive facts.
    const verify = builtIns.find((agent) => agent.name === "Verify");
    assert.equal(verify?.color, "green");
    assert.deepEqual(verify?.tools, [...(BUILT_IN_SUBAGENT_METADATA.find((e) => e.name === "Verify")?.tools ?? [])]);
  });
});

test("setBuiltInModelOverride persists a per-name override and list projects it back", async () => {
  await withService(async (service) => {
    await service.setBuiltInModelOverride({
      agentName: "CodeReviewer",
      modelSelection: { providerId: "anthropic", modelId: "claude-opus-4", options: { reasoningLevel: "high" } },
    });

    const result = await service.list({ workspacePath: process.cwd(), provider, mode: "settingsUserOnly" });
    const reviewer = result.agents.find((agent) => agent.name === "CodeReviewer");
    assert.deepEqual(reviewer?.modelSelection, {
      providerId: "anthropic",
      modelId: "claude-opus-4",
      options: { reasoningLevel: "high" },
    });
    // A different built-in is untouched.
    assert.equal(result.agents.find((agent) => agent.name === "Debugger")?.modelSelection, undefined);

    await service.setBuiltInModelOverride({ agentName: "CodeReviewer" });
    const cleared = await service.list({ workspacePath: process.cwd(), provider, mode: "settingsUserOnly" });
    assert.equal(cleared.agents.find((agent) => agent.name === "CodeReviewer")?.modelSelection, undefined);
  });
});

test("createAgent rejects every built-in name as reserved", async () => {
  await withService(async (service) => {
    const config = { name: "Placeholder", description: "desc", systemPrompt: "prompt" };
    for (const name of BUILT_IN_SUBAGENT_METADATA.map((entry) => entry.name)) {
      await assert.rejects(
        () => service.createAgent({ config: { ...config, name }, provider }),
        /reserved by a built-in agent/,
        `expected ${name} to be reserved`,
      );
    }
  });
});
