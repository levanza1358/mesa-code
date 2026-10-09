// ============================================================
// Skill Tool Handler
// ============================================================

import {
  CoreErrorType,
  SkillInputJsonSchema,
  SkillInputSchema,
  SkillOutputJsonSchema,
  SkillOutputSchema,
  createCoreError,
  type SkillRuntimeInput,
} from "@mesa-code/contracts";
import type { ToolEntry, ToolHandler } from "../types.js";

const MAX_SKILL_BYTES = 100_000;

const skillHandler: ToolHandler = async (input, context) => {
  const { skill } = SkillInputSchema.parse(input) as SkillRuntimeInput;
  const skillPort = context.skillPort;

  if (!skillPort) {
    throw createCoreError(
      CoreErrorType.ConfigurationError,
      "SkillPort is not configured for Skill tool",
      {
        context: {
          toolCallId: context.toolCallId,
          toolName: "Skill",
        },
        recoverable: false,
      },
    );
  }

  const loaded = await skillPort.loadSkill(
    {
      name: skill,
      workingDirectory: context.workingDirectory,
      maxBytes: MAX_SKILL_BYTES,
      trace: {
        traceId: context.traceId,
        spanId: context.spanId,
        parentSpanId: context.parentSpanId,
        sessionId: context.sessionId,
        turnId: context.turnId,
      },
    },
    { signal: context.abortSignal },
  );

  context.recordSkillTelemetryMetadata?.({
    ...(loaded.metadata.qualifiedName ? { qualifiedName: loaded.metadata.qualifiedName } : {}),
    ...(loaded.metadata.pluginId ? { pluginId: loaded.metadata.pluginId } : {}),
    source: loaded.metadata.source,
  });

  return [
    `<skill_content name="${loaded.metadata.name}">`,
    `# Skill: ${loaded.metadata.name}`,
    "",
    expandSkillContextVariables(loaded.content, loaded.baseDirectory),
    "",
    `Base directory for this skill: ${loaded.baseDirectory}`,
    "Relative paths in this skill are relative to this base directory.",
    loaded.truncated ? "[Skill content truncated]" : "",
    "</skill_content>",
    // Loading supplies instructions, not execution; ambiguous completion guidance can end child tasks early.
    "Skill instructions are now loaded in this agent. Apply them and continue the original assigned task in the same run. Loading a skill does not execute or complete that task; do not end with only an announcement that you will use or read the skill.",
  ]
    .filter((line) => line.length > 0)
    .join("\n");
};

function expandSkillContextVariables(content: string, baseDirectory: string): string {
  // 只有 Skill 工具加载后才有明确的当前 skill 目录，因此变量替换限定在这里完成。
  return content.replace(/\$\{(CLAUDE_SKILL_DIR|MESA_CODE_SKILL_DIR)\}/gu, baseDirectory);
}

export const skillToolEntry: ToolEntry = {
  capability: "Load local skill instructions into the current session context",
  metadata: {
    name: "Skill",
    description: `Load skill instructions into the current agent conversation

This tool loads instructions; it does not execute a separate task. After a successful load, apply the instructions and continue the original assigned task in the same run, including when running as a subagent. A skill-use announcement is not a completed deliverable.

Before starting a non-trivial task, check the available skills and whether any matches. Skills provide specialized capabilities and domain knowledge; when one covers the task, use it rather than working from general knowledge.

When users reference a "slash command" or "/<something>", they are referring to a skill. Use this tool to invoke it.

How to invoke:
- Set \`skill\` to the exact name of an available skill (no leading slash). For plugin-namespaced skills use the fully qualified \`plugin:skill\` form.
- Set \`args\` to pass optional arguments.

Important:
- Available skills are listed in system-reminder messages in the conversation
- Only invoke a skill that appears in that list, or one the user explicitly typed as \`/<name>\` in their message. Never guess or invent a skill name from training data; otherwise do not call this tool
- When a skill matches the user's request, this is a BLOCKING REQUIREMENT: invoke the relevant Skill tool BEFORE generating any other response about the task. Do not announce that you will use the skill and then proceed without calling this tool.
- Proceed without a skill only when no listed skill matches, the task is trivial, or the skill is already loaded this turn \u2014 "I did not check" is not a reason to skip
- NEVER mention a skill without actually calling this tool
- Do not invoke a skill that is already running
- Do not use this tool for built-in CLI commands (like /help, /clear, etc.)
- If you see a <command-name> tag in the current conversation turn, the skill has ALREADY been loaded - follow the instructions directly instead of calling this tool again
`,
    readOnly: true,
    destructive: false,
    concurrentSafe: true,
    timeoutMs: 30000,
    maxOutputBytes: MAX_SKILL_BYTES,
    sideEffectScope: "session",
    riskLevel: "low",
    needsApproval: false,
  },
  handler: skillHandler,
  inputSchema: SkillInputJsonSchema,
  outputSchema: SkillOutputJsonSchema,
  runtimeInputSchema: SkillInputSchema,
  runtimeOutputSchema: SkillOutputSchema,
  permission: {
    permission: "skill",
    reason: "Skill loads local instructions into session context",
    riskLevel: "low",
    sideEffectScope: "session",
    needsApproval: false,
    patternSources: ["toolName"],
    alwaysAllowPatternSources: ["toolName"],
    denyPriority: "beforeAsk",
  },
  resultBudget: {
    maxInlineBytes: MAX_SKILL_BYTES,
    maxModelBytes: MAX_SKILL_BYTES,
    strategy: "truncate",
    preview: {
      maxBytes: MAX_SKILL_BYTES,
      direction: "head",
    },
  },
  timeout: {
    defaultMs: 30000,
    maxMs: 30000,
    allowCallOverride: false,
  },
  cancellation: {
    supported: true,
    cleanup: "none",
    userVisibleMessage: "Skill loading was cancelled before content was returned",
  },
  trace: {
    required: true,
    propagateToAdapters: true,
    recordInput: "summary",
    recordOutput: "summary",
  },
};
