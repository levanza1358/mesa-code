import assert from "node:assert/strict";
import test from "node:test";
import type {
  Model,
  ModelRequest,
  SessionEvent,
  SessionEventStorePort,
  SessionId,
  SkillMetadata,
  SkillPort,
} from "@mesa-code/contracts";
import { buildSkillsSection } from "../src/context/sections/skills.js";
import { AgentRuntime } from "../src/runtime/agent-runtime.js";
import { SubagentContextBuilder } from "../src/subagent/context-builder.js";
import { buildSubagentCommonNotes } from "../src/subagent/system-prompt.js";
import { skillToolEntry } from "../src/tool/handlers/skill.js";
import type { ToolExecutionContext } from "../src/tool/types.js";

const metadata: SkillMetadata = {
  name: "synthetic-check",
  description: "Run the synthetic task action.",
  path: "synthetic/SKILL.md",
  directory: "synthetic",
  rootPath: "synthetic",
  scope: "project",
  source: "agents",
  safeToAutoLoad: false,
  frontmatterKeys: [],
};
const outcome = { skills: [metadata], diagnostics: [], totalDiscovered: 1 };
const skillPort: SkillPort = {
  async discoverSkills() {
    return outcome;
  },
  async loadSkill() {
    return {
      metadata,
      content: "Call SyntheticAction, then report its result. ${MESA_CODE_SKILL_DIR}",
      baseDirectory: "synthetic",
      bytesRead: 80,
      sizeBytes: 80,
      truncated: false,
    };
  },
};

test("skill guidance requires same-agent task continuation, not an announcement", () => {
  for (const metadataBudget of [20_000, 1]) {
    const section = buildSkillsSection({ outcome, metadataBudget });
    assert.ok(section);
    assert.doesNotMatch(section.content, /Announce it and call it/);
    assert.match(section.content, /continue the original task in the same run/);
  }
  assert.match(skillToolEntry.metadata.description, /current agent conversation/);
  assert.match(buildSubagentCommonNotes(), /Report concrete results or a specific blocker/);
});

test("Skill forwards cancellation and trace while returning instructions with continuation", async () => {
  const controller = new AbortController();
  const context = {
    workingDirectory: ".",
    toolCallId: "skill-call",
    sessionId: "child",
    turnId: "turn",
    traceId: "trace",
    spanId: "span",
    parentSpanId: "parent",
    abortSignal: controller.signal,
    skillPort: {
      ...skillPort,
      async loadSkill(request, options) {
        assert.equal(request.name, metadata.name);
        assert.equal(request.maxBytes, 100_000);
        assert.equal(request.trace?.sessionId, "child");
        assert.equal(request.trace?.parentSpanId, "parent");
        assert.equal(options?.signal, controller.signal);
        return skillPort.loadSkill(request, options);
      },
    } satisfies SkillPort,
  } as ToolExecutionContext;
  const result = await skillToolEntry.handler({ skill: metadata.name }, context);
  assert.equal(typeof result, "string");
  assert.match(result as string, /Call SyntheticAction, then report its result\. synthetic/);
  assert.match(result as string, /continue the original assigned task in the same run/);
  assert.doesNotMatch(result as string, /\$\{MESA_CODE_SKILL_DIR\}/);
  const denied = new Error("Skill is not allowed");
  context.skillPort = {
    ...skillPort,
    async loadSkill() {
      throw denied;
    },
  };
  await assert.rejects(
    skillToolEntry.handler({ skill: metadata.name }, context),
    (error) => error === denied,
  );
});

test("child runtime commits Skill result, requests a task action, then returns concrete findings", async () => {
  const events: SessionEvent[] = [];
  const eventStore: SessionEventStorePort = {
    async append(event) {
      events.push(event);
      return event;
    },
    async getEvents() {
      return events;
    },
    async getEventsAfter(_sessionId, sequenceNumber) {
      return events.slice(sequenceNumber);
    },
    async getLatestSequenceNumber() {
      return events.length;
    },
    async deleteSession() {},
  };
  let requests = 0;
  let actions = 0;
  const model: Model = {
    providerId: "synthetic" as Model["providerId"],
    modelId: "synthetic" as Model["modelId"],
    properties: {
      requiresMfjsToolSchema: false,
      contextWindow: 200_000,
      inputFormat: {
        supportsText: true,
        supportsImage: false,
        supportsVideo: false,
        supportsAudio: false,
        supportsPdf: false,
      },
      outputFormat: { supportsText: true },
      supportsToolCall: true,
      supportsJsonSchemaOutput: false,
      supportsNativeWebSearch: false,
      supportsMidConversationSystem: true,
    },
    optionSpecs: {
      reasoningLevel: { values: ["low"], map: "reasoningLevel" },
      maxOutputTokens: { max: 4096, map: "maxOutputTokens" },
    },
    options: {},
    bind() {
      return this;
    },
    async generateText(request: ModelRequest) {
      requests++;
      assert.ok(requests <= 3, "Unexpected extra model request");
      const history = JSON.stringify(request.messages);
      if (requests === 1) {
        assert.match(history, /Complete the assigned task, not just preparation/);
        return {
          text: "",
          finishReason: "tool-calls",
          usage: {},
          toolCalls: [{ id: "load", name: "Skill", input: { skill: metadata.name } }],
        };
      }
      if (requests === 2) {
        assert.match(history, /Skill instructions are now loaded in this agent/);
        assert.match(history, /Call SyntheticAction/);
        return {
          text: "",
          finishReason: "tool-calls",
          usage: {},
          toolCalls: [{ id: "action", name: "SyntheticAction", input: { skill: metadata.name } }],
        };
      }
      assert.equal(actions, 1);
      assert.match(history, /Synthetic task action completed/);
      return {
        text: "Synthetic task action completed and verified.",
        finishReason: "stop",
        usage: {},
      };
    },
    async *streamText() {
      throw new Error("Unexpected streaming request");
    },
  };
  const contextBuilder = new SubagentContextBuilder({
    agentPrompt: "Complete the synthetic task using the listed skill.",
    envInfo: { cwd: ".", platform: "win32", isGitRepository: false } as ConstructorParameters<
      typeof SubagentContextBuilder
    >[0]["envInfo"],
    skills: outcome,
    model,
  });
  const runtime = new AgentRuntime(
    "synthetic-child" as SessionId,
    {
      mode: "yolo",
      modelStreaming: "off",
      workingDirectory: ".",
      subagentContext: { agentPrompt: "Complete the synthetic task using the listed skill." },
      parentSessionId: "synthetic-parent" as SessionId,
      modelSelection: { providerId: "synthetic", modelId: "synthetic" },
      toolAllowlist: ["Skill", "SyntheticAction"],
      memory: { enabled: false },
      titleGeneration: { enabled: false },
    },
    { eventStore, modelFactory: () => model, skillPort, contextBuilder },
  );
  runtime.getToolRegistry().register({
    ...skillToolEntry,
    metadata: { ...skillToolEntry.metadata, name: "SyntheticAction" },
    handler: async () => {
      actions++;
      return "Synthetic task action completed";
    },
  });
  runtime.invalidateToolCache();
  try {
    const result = await runtime.executeTurn("Run the synthetic task.", undefined, {
      inputSource: "subagent",
      presentation: "coordinator_input",
    });
    assert.equal(requests, 3);
    assert.equal(actions, 1);
    assert.equal(result.response, "Synthetic task action completed and verified.");
  } finally {
    runtime.beginShutdown();
  }
});
