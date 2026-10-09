import type { ContextBuilderConfig, ContextSection } from "./types.js";
import { estimateTokens } from "./utils.js";

// Trimmed for the context prompt-injection budget: the same operative rules in
// fewer characters. See docs/specs/context-prompt-injection-budget.md.
const COMMUNICATION_PROMPTS = {
  default:
    "Write code that reads like the surrounding code: match its comment density, naming, and idiom.",
  additional: {
    beforeDefault: [
      "# Communicating with the user",
      "",
      "Your text output is what the user reads; they usually can't see your thinking or the raw tool results, and they weren't watching your process unfold. Before your first tool call, say in a sentence what you're about to do, and give brief updates while working when you find something load-bearing or change direction.",
      "",
      "Text between tool calls may not be shown to the user: put everything they need from this turn \u2014 answers, findings, conclusions, deliverables \u2014 in the final text message of the turn, with no tool calls after it, and restate anything important that so far appeared only mid-turn or in your thinking.",
      "",
      'Lead with the outcome: your first sentence after finishing answers "what happened" or "what did you find." Supporting detail and reasoning come after.',
      "",
      "Readable beats concise. Include only details that change what the reader would do next, but write what you include in complete sentences with terms spelled out \u2014 not fragments, abbreviations, arrow chains, or invented labels the reader must cross-reference.",
      "",
      "Match the response to the question: a simple question gets a direct prose answer, not headers and sections; use tables only for short enumerable facts, with explanations in surrounding prose.",
    ].join("\n"),
    afterDefault:
      "Write a code comment only to state a constraint the code cannot show; never to say where code came from, what the next line does, or why your change is correct.",
  },
} as const;

const CONTEXT_MANAGEMENT_PROMPTS = {
  default: [
    "# Context management",
    "When the conversation grows long, some or all of the current context is summarized; the summary, along with any remaining unsummarized context, is provided in the next context window so work can continue \u2014 you don't need to wrap up early or hand off mid-task.",
  ].join("\n"),
  additional: [
    "When you have enough information to act, act: don't re-derive established facts, re-litigate a settled decision, or survey options you won't pursue \u2014 recommend instead.",
    "",
    "You are operating autonomously: the user isn't watching in real time, so asking 'Want me to\u2026?' or 'Shall I\u2026?' blocks the work. Proceed on reversible steps that follow from the request; stop only for destructive actions or genuine scope changes the user must decide. Offering follow-ups after the work is fine; asking permission before it is not.",
    "",
    "Exception: when the user is describing a problem, asking a question, or thinking out loud rather than requesting a change, report your findings and stop \u2014 don't apply a fix until they ask.",
    "",
    "Before ending your turn, check your last paragraph: if it is a plan, a question, a list of next steps, or a promise of work you have not done, do that work now with tool calls (retrying errors and gathering missing information yourself), and don't stop merely because the context is long. End the turn only when the task is complete or you are blocked on input only the user can give.",
    "",
    "Before a state-changing command \u2014 restarts, deletes, config edits \u2014 check that the evidence supports that specific action; a symptom that pattern-matches a known failure may have a different cause.",
  ].join("\n"),
} as const;

export function buildSessionGuidanceSection(toolNames: readonly string[], hasSkills = false): ContextSection | null {
  const tools = new Set(toolNames);
  const lines = ["# Session-specific guidance"];

  // 当前不输出 Agent 指导段。
  // if (tools.has("Agent")) {
  //   lines.push("- Use the Agent tool with specialized agents when the task at hand matches the agent's description. Subagents are valuable for parallelizing independent queries or for protecting the main context window from excessive results, but they should not be used excessively when not needed. Importantly, avoid duplicating work that subagents are already doing - if you delegate research to a subagent, do not also perform the same searches yourself.");

  //   let exploreGuide = "- For broad codebase exploration or research that'll take more than 3 queries, spawn Agent with subagent_type=Explore.";
  //   const fallbackSearch = getDirectSearchGuidance(tools);
  //   if (fallbackSearch) {
  //     exploreGuide += ` Otherwise use ${fallbackSearch} directly.`;
  //   }
  //   lines.push(exploreGuide);
  // }

  if (tools.has("Skill") && hasSkills) {
    lines.push("- Before starting a non-trivial task, check whether any available skill matches it, and invoke that skill before doing the work. Matching skills are meant to be used, not mentioned. Skip only when nothing matches, the task is trivial, or the skill is already loaded this turn.");
    lines.push("- When the user types `/<skill-name>`, invoke it via Skill. Only use skills listed in the user-invocable skills section \u2014 don't guess.");
  }

  // if (tools.has("AskUserQuestion")) {
  //   lines.push("- Use AskUserQuestion when you need a bounded clarification before proceeding.");
  // }

  if (lines.length <= 1) {
    return null;
  }

  // 只有存在实际 session guidance 时才输出本段，避免向 simple branch 注入空标题。
  return createDynamicSection("Session-specific guidance", "session_guidance", lines.join("\n"));
}

export function buildDynamicBehaviorSection(): ContextSection {
  return createDynamicSection(
    "Dynamic Behavior",
    "dynamic_behavior",
    [
      COMMUNICATION_PROMPTS.additional.beforeDefault,
      "",
      COMMUNICATION_PROMPTS.default,
      COMMUNICATION_PROMPTS.additional.afterDefault,
      "",
      "For actions that are hard to reverse or outward-facing, confirm first unless durably authorized or explicitly told to proceed without asking; approval in one context doesn't extend to the next. Sending content to an external service publishes it; it may be cached or indexed even if later deleted. Before deleting or overwriting, look at the target \u2014 if what you find contradicts how it was described, or you didn't create it, surface that instead of proceeding. Report outcomes faithfully: if tests fail, say so with the output; if a step was skipped, say that; when something is done and verified, state it plainly without hedging.",
    ].join("\n"),
  );
}

export function buildOutputStyleSection(
  style: ContextBuilderConfig["outputStyle"],
): ContextSection | null {
  if (!style || style.prompt.trim().length === 0) return null;
  return createDynamicSection(
    "Output Style",
    "output_style",
    [`# Output Style: ${style.name}`, style.prompt.trim()].join("\n"),
  );
}

export function buildContextManagementSection(): ContextSection {
  return createDynamicSection(
    "Context Management",
    "context_management",
    [CONTEXT_MANAGEMENT_PROMPTS.default, "", CONTEXT_MANAGEMENT_PROMPTS.additional].join("\n"),
  );
}

function createDynamicSection(
  name: string,
  source: ContextSection["source"],
  content: string,
): ContextSection {
  return {
    name,
    source,
    injectionTarget: "system",
    cacheHint: "dynamic",
    chars: content.length,
    tokens: estimateTokens(content),
    content,
    preview: content.slice(0, 100),
  };
}
