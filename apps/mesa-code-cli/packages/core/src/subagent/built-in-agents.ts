// ============================================================
// Built-in subagent registry (shared metadata -> runtime AgentProfile)
// ============================================================
// The roster's descriptive facts live once in @mesa-code/shared
// (built-in-subagents.ts). This module pairs each roster entry with the behavior
// core owns: the per-agent system prompt. The runtime AgentProfile built here is
// what the Agent tool resolves by `subagent_type`.

import {
  BUILT_IN_SUBAGENT_METADATA,
  getBuiltInSubagentMetadata,
  type BuiltInSubagentMetadata,
  type ModelSelection,
} from "@mesa-code/shared";
import { CODE_REVIEWER_AGENT_TYPE, buildCodeReviewerSystemPrompt } from "./code-reviewer.js";
import { DEBUGGER_AGENT_TYPE, buildDebuggerSystemPrompt } from "./debugger.js";
import { GENERAL_PURPOSE_AGENT_TYPE, buildGeneralPurposeSystemPrompt } from "./general-purpose.js";
import { PLAN_AGENT_TYPE, buildPlanSystemPrompt } from "./plan.js";
import { TESTER_AGENT_TYPE, buildTesterSystemPrompt } from "./tester.js";
import { VERIFY_AGENT_TYPE, buildVerifySystemPrompt } from "./verify.js";
import { WRITER_AGENT_TYPE, buildWriterSystemPrompt } from "./writer.js";
import type { AgentProfile } from "./profile.js";

/**
 * System prompt builders keyed by built-in name.
 *
 * Every built-in bakes its prompt at construction time, because only built-in
 * Explore has its prompt substituted at runtime (runtime/methods/subagent.ts
 * replaces an empty systemPrompt for built-in Explore only). A built-in shipped
 * with an empty prompt would therefore run with no instructions.
 *
 * Explore is intentionally absent: its profile keeps an empty systemPrompt so the
 * runtime can substitute the search-oriented prompt with the correct
 * embedded-search tool names. Leaving a name out here yields the empty prompt.
 */
const BUILT_IN_SYSTEM_PROMPT_BUILDERS: Readonly<Record<string, () => string>> = {
  [GENERAL_PURPOSE_AGENT_TYPE]: buildGeneralPurposeSystemPrompt,
  [PLAN_AGENT_TYPE]: buildPlanSystemPrompt,
  [VERIFY_AGENT_TYPE]: buildVerifySystemPrompt,
  [CODE_REVIEWER_AGENT_TYPE]: buildCodeReviewerSystemPrompt,
  [DEBUGGER_AGENT_TYPE]: buildDebuggerSystemPrompt,
  [WRITER_AGENT_TYPE]: buildWriterSystemPrompt,
  [TESTER_AGENT_TYPE]: buildTesterSystemPrompt,
};

/** Materialize one runtime AgentProfile from a roster entry plus its model override. */
export function createBuiltInAgentProfile(
  metadata: BuiltInSubagentMetadata,
  options: { modelSelection?: ModelSelection } = {},
): AgentProfile {
  const buildSystemPrompt = BUILT_IN_SYSTEM_PROMPT_BUILDERS[metadata.name];
  return {
    name: metadata.name,
    description: metadata.description,
    color: metadata.color,
    injectAgentsMd: metadata.injectAgentsMd,
    ...(options.modelSelection ? { modelSelection: options.modelSelection } : {}),
    source: "built-in",
    systemPrompt: buildSystemPrompt ? buildSystemPrompt() : "",
    tools: [...metadata.tools],
  };
}

/** Every built-in profile in roster order, with each name's model override applied. */
export function createBuiltInAgentProfiles(
  overrides: Readonly<Partial<Record<string, ModelSelection>>> = {},
): AgentProfile[] {
  return BUILT_IN_SUBAGENT_METADATA.map((metadata) =>
    createBuiltInAgentProfile(metadata, { modelSelection: overrides[metadata.name] }),
  );
}

/** Built-in profile by name; `undefined` for a name outside the roster. */
export function createBuiltInAgentProfileByName(
  name: string,
  options: { modelSelection?: ModelSelection } = {},
): AgentProfile | undefined {
  const metadata = getBuiltInSubagentMetadata(name);
  return metadata ? createBuiltInAgentProfile(metadata, options) : undefined;
}
