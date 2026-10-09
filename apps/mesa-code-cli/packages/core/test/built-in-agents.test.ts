// Built-in subagent roster behavior: every roster entry is always present, is
// shaped from the shared metadata, and can only be shadowed by a user/project
// profile of the exact same name. Prompts are baked at construction for all
// built-ins except Explore, whose prompt the runtime substitutes (empty by design).
import assert from "node:assert/strict";
import test from "node:test";

import {
  BUILT_IN_SUBAGENT_METADATA,
  BUILT_IN_SUBAGENT_NAMES,
  getBuiltInSubagentMetadata,
  type ModelSelection,
} from "@mesa-code/shared";
import { createBuiltInAgentProfiles } from "../src/subagent/built-in-agents.js";
import { EXPLORE_AGENT_TYPE } from "../src/subagent/explore.js";
import {
  DEFAULT_SUBAGENT_TYPE,
  isBuiltInExploreAgentProfile,
  normalizeAgentProfiles,
  type AgentProfile,
} from "../src/subagent/profile.js";

const selection = (modelId: string): ModelSelection => ({ providerId: "anthropic", modelId });

test("normalizeAgentProfiles seeds every roster built-in even with no input profiles", () => {
  const profiles = normalizeAgentProfiles([]);
  assert.equal(profiles.length, BUILT_IN_SUBAGENT_METADATA.length);
  for (const profile of profiles) {
    assert.equal(profile.source, "built-in");
  }
  assert.deepEqual(
    profiles.map((profile) => profile.name).sort(),
    [...BUILT_IN_SUBAGENT_NAMES].sort(),
  );
});

test("each built-in profile carries its roster description, color, tool surface, and AGENTS.md flag", () => {
  const byName = new Map(normalizeAgentProfiles([]).map((profile) => [profile.name, profile]));
  for (const metadata of BUILT_IN_SUBAGENT_METADATA) {
    const profile = byName.get(metadata.name);
    assert.ok(profile, `missing built-in profile ${metadata.name}`);
    assert.equal(profile.description, metadata.description);
    assert.equal(profile.color, metadata.color);
    assert.deepEqual(profile.tools, [...metadata.tools]);
    assert.equal(profile.injectAgentsMd, metadata.injectAgentsMd);
  }
});

test("built-in prompts are baked at construction except Explore, which stays empty", () => {
  for (const profile of normalizeAgentProfiles([])) {
    if (profile.name === EXPLORE_AGENT_TYPE) {
      // Explore keeps an empty prompt so the runtime can substitute the
      // embedded-search prompt with the correct tool names.
      assert.equal(profile.systemPrompt, "");
      continue;
    }
    assert.ok(
      profile.systemPrompt.trim().length > 0,
      `${profile.name} ships without a system prompt`,
    );
  }
});

test("read-only built-ins expose no file-mutating tool; authoring built-ins expose both", () => {
  for (const profile of normalizeAgentProfiles([])) {
    const tools = profile.tools ?? [];
    if (profile.name === DEFAULT_SUBAGENT_TYPE) {
      assert.deepEqual(tools, ["*"]);
      continue;
    }
    const metadata = getBuiltInSubagentMetadata(profile.name);
    assert.ok(metadata, `no roster metadata for ${profile.name}`);
    if (metadata.readOnly) {
      assert.ok(
        !tools.includes("Edit") && !tools.includes("Write"),
        `${profile.name} is read-only but exposes a write tool`,
      );
    } else {
      assert.ok(
        tools.includes("Edit") && tools.includes("Write"),
        `${profile.name} is writable but lacks a write tool`,
      );
    }
  }
});

test("per-name model overrides apply to the matching built-in only", () => {
  const profiles = normalizeAgentProfiles([], {
    builtInModelSelectionOverrides: { Plan: selection("plan-model") },
  });
  assert.deepEqual(profiles.find((p) => p.name === "Plan")?.modelSelection, selection("plan-model"));
  for (const profile of profiles.filter((p) => p.name !== "Plan")) {
    assert.equal(profile.modelSelection, undefined);
  }
});

test("a user profile only shadows the built-in of the same name, leaving the rest intact", () => {
  const custom: AgentProfile = {
    name: "Plan",
    description: "my custom planner",
    source: "user",
    systemPrompt: "custom",
  };
  const profiles = normalizeAgentProfiles([custom]);
  // Same roster size: the user profile replaced an entry rather than growing the set.
  assert.equal(profiles.length, BUILT_IN_SUBAGENT_METADATA.length);
  const plan = profiles.find((p) => p.name === "Plan");
  assert.equal(plan?.source, "user");
  assert.equal(plan?.description, "my custom planner");
  assert.equal(profiles.find((p) => p.name === "Verify")?.source, "built-in");
});

test("isBuiltInExploreAgentProfile matches the built-in Explore but not a same-named user profile", () => {
  const explore = normalizeAgentProfiles([]).find((p) => p.name === EXPLORE_AGENT_TYPE);
  assert.ok(explore);
  assert.equal(isBuiltInExploreAgentProfile(explore), true);
  assert.equal(isBuiltInExploreAgentProfile({ name: EXPLORE_AGENT_TYPE, source: "user" }), false);
});

test("createBuiltInAgentProfiles preserves roster order and applies overrides", () => {
  const profiles = createBuiltInAgentProfiles({ Tester: selection("tester-model") });
  assert.deepEqual(
    profiles.map((profile) => profile.name),
    [...BUILT_IN_SUBAGENT_NAMES],
  );
  assert.deepEqual(profiles.find((p) => p.name === "Tester")?.modelSelection, selection("tester-model"));
});
