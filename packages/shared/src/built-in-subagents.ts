// ============================================================
// Built-in subagent roster (single source of truth)
// ============================================================
// The built-in subagent roster is defined once here and consumed by core
// (runtime profiles), services (Settings list), and bootstrap (reserved names +
// override parsing). Metadata holds only descriptive facts; each consumer adds the
// behavior it owns (core pairs an entry with its systemPrompt builder; services
// shapes an AgentSummary; bootstrap derives the reserved-name set).

import type { AgentColor } from "./subagents-types.js";

/** Tools a read-only investigation agent may use: no file-mutating tool is exposed. */
const READ_ONLY_TOOLS = [
  "Read",
  "Grep",
  "Glob",
  "Bash",
  "WebFetch",
  "WebSearch",
  "TodoWrite",
] as const;

/** Tools an authoring agent may use, including the file-write path. */
const AUTHORING_TOOLS = [
  "Read",
  "Write",
  "Edit",
  "Bash",
  "Glob",
  "Grep",
  "TodoWrite",
] as const;

export interface BuiltInSubagentMetadata {
  /** Stable profile name; the Agent tool's `subagent_type` and the override key. */
  readonly name: string;
  /** One-line purpose shown in Settings and in the Agent tool prompt. */
  readonly description: string;
  /** Identity color, so the UI never hashes the name into a random color. */
  readonly color: AgentColor;
  /** Tool surface; `["*"]` means every tool the parent exposes. */
  readonly tools: readonly string[];
  /** Whether the child receives the workspace AGENTS.md instructions. */
  readonly injectAgentsMd: boolean;
  /** Advisory read-only flag: the tool surface above must agree with it. */
  readonly readOnly: boolean;
  /** Advisory flag: the profile may create or edit files. */
  readonly writeCapable: boolean;
}

/**
 * Canonical roster order. `general-purpose` is first because it is the default
 * `subagent_type`; `Explore` follows because it keeps its dedicated read-only path.
 */
export const BUILT_IN_SUBAGENT_METADATA = [
  {
    name: "general-purpose",
    description:
      "General-purpose agent for researching complex questions, searching for code, and executing multi-step tasks. When you are searching for a keyword or file and are not confident that you will find the right match in the first few tries use this agent to perform the search for you.",
    color: "blue",
    tools: ["*"],
    injectAgentsMd: true,
    readOnly: false,
    writeCapable: true,
  },
  {
    name: "Explore",
    description:
      'Read-only search agent for broad fan-out searches - when answering means sweeping many files, directories, or naming conventions and you only need the conclusion, not the file dumps. It reads excerpts rather than whole files, so it locates code; it doesn\'t review or audit it. Specify search breadth: "medium" for moderate exploration, "very thorough" for multiple locations and naming conventions.',
    color: "cyan",
    tools: ["Bash", "Glob", "Grep", "Read", "WebFetch", "WebSearch", "TodoWrite"],
    injectAgentsMd: false,
    readOnly: true,
    writeCapable: false,
  },
  {
    name: "Plan",
    description:
      "Software architect for planning implementation work. Given a request, produce an ordered, verifiable plan: the files and interfaces involved, the single owner for each piece of state, the dependency direction, and how the result will be checked. It reads and searches the codebase but does not edit files - hand its plan to a general-purpose agent to execute.",
    color: "purple",
    tools: READ_ONLY_TOOLS,
    injectAgentsMd: true,
    readOnly: true,
    writeCapable: false,
  },
  {
    name: "Verify",
    description:
      "Independent verifier. Given a claim, finding, or completed change, confirm or refute it with evidence rather than opinion: run the specific tests, typechecks, lints, or commands that decide the question, read the relevant code, and report what actually passed or failed and what was left uncovered. It does not implement fixes.",
    color: "green",
    tools: READ_ONLY_TOOLS,
    injectAgentsMd: true,
    readOnly: true,
    writeCapable: false,
  },
  {
    name: "CodeReviewer",
    description:
      "Code reviewer for a diff, patch, or set of changed files. Look for bugs, regressions, missing edge cases, and security or permission issues, citing the exact lines and the reasoning behind each finding. It reports findings with evidence and severity; it does not rewrite the code.",
    color: "orange",
    tools: READ_ONLY_TOOLS,
    injectAgentsMd: true,
    readOnly: true,
    writeCapable: false,
  },
  {
    name: "Debugger",
    description:
      "Root-cause debugger. From a symptom - a failing test, an error, a stack trace, or unexpected behavior - form hypotheses and narrow them with searches, reads, and targeted commands, then report the confirmed root cause and the smallest fix that addresses it. It does not apply the fix.",
    color: "red",
    tools: READ_ONLY_TOOLS,
    injectAgentsMd: true,
    readOnly: true,
    writeCapable: false,
  },
  {
    name: "Writer",
    description:
      "Documentation and prose author. Write or revise Markdown and other text artifacts - READMEs, guides, specs, and code comments - matching the project's existing tone, structure, and conventions. It may create and edit files but does not invent capabilities or claim behavior the code does not have.",
    color: "pink",
    tools: AUTHORING_TOOLS,
    injectAgentsMd: true,
    readOnly: false,
    writeCapable: true,
  },
  {
    name: "Tester",
    description:
      "Test author and runner. Write focused tests for a change, run the relevant suite, and report real results - including failures. It follows existing test conventions and the project's actual test entry points, and it does not weaken or delete existing tests to make them pass.",
    color: "yellow",
    tools: AUTHORING_TOOLS,
    injectAgentsMd: true,
    readOnly: false,
    writeCapable: true,
  },
] as const satisfies readonly BuiltInSubagentMetadata[];

/** The union of every built-in subagent name, derived from the roster. */
export type BuiltInSubagentName = (typeof BUILT_IN_SUBAGENT_METADATA)[number]["name"];

/** Every built-in subagent name, in roster order. */
export const BUILT_IN_SUBAGENT_NAMES: readonly BuiltInSubagentName[] = BUILT_IN_SUBAGENT_METADATA.map(
  (entry) => entry.name,
);

const BUILT_IN_SUBAGENT_METADATA_BY_NAME: ReadonlyMap<string, BuiltInSubagentMetadata> = new Map(
  BUILT_IN_SUBAGENT_METADATA.map((entry) => [entry.name, entry]),
);

/** Look up a built-in subagent's metadata by name; `undefined` for unknown names. */
export function getBuiltInSubagentMetadata(name: string): BuiltInSubagentMetadata | undefined {
  return BUILT_IN_SUBAGENT_METADATA_BY_NAME.get(name);
}
