// Guards the context prompt-injection budget: the trimmed Mesa-owned prompt
// blocks stay small and keep every operative rule, and the Desktop-only section
// stays gated to the Desktop surface.
// See docs/specs/context-prompt-injection-budget.md.
import assert from "node:assert/strict";
import test from "node:test";

import { ContextBuilder } from "../src/context/builder.js";
import {
  buildContextManagementSection,
  buildDynamicBehaviorSection,
} from "../src/context/dynamic-sections.js";
import { buildMemorySection } from "../src/context/sections/memory.js";
import { buildDesktopContextSection } from "../src/context/sections/desktop.js";
import type { ContextBuilderConfig, EnvInfo } from "../src/context/types.js";

const BASE_ENV: EnvInfo = {
  cwd: "/work/repo",
  platform: "linux",
  shell: "bash",
  osVersion: "Linux 6.0",
  nodeVersion: "22.0.0",
  isGitRepository: false,
};

function baseConfig(overrides: Partial<ContextBuilderConfig> = {}): ContextBuilderConfig {
  return { workingDirectory: BASE_ENV.cwd, envInfo: BASE_ENV, ...overrides };
}

test("dynamic_behavior keeps its operative rules after trimming", () => {
  const content = buildDynamicBehaviorSection().content;
  assert.match(content, /final text message of the turn/);
  assert.match(content, /Lead with the outcome/);
  assert.match(content, /confirm/);
  assert.match(content, /code comment only to state a constraint/);
});

test("context_management keeps its operative rules after trimming", () => {
  const content = buildContextManagementSection().content;
  assert.match(content, /enough information to act, act/);
  assert.match(content, /check your last paragraph/);
  assert.match(content, /operating autonomously/);
  assert.match(content, /report your findings and stop/);
});

test("memory keeps its format and lifecycle rules after trimming", () => {
  const section = buildMemorySection("/home/user/.mesa-code/memory");
  assert.ok(section, "memory section should exist when a root is configured");
  const content = section.content;
  assert.match(content, /# Memory/);
  assert.match(content, /name: <short-kebab-case-slug>/);
  assert.match(content, /description: <one-line summary/);
  assert.match(content, /type: user \| feedback \| project \| reference/);
  assert.match(content, /\[\[name\]\]/);
  assert.match(content, /MEMORY\.md/);
});

test("trimmed sections keep their section shape", () => {
  for (const section of [
    buildDynamicBehaviorSection(),
    buildContextManagementSection(),
    buildMemorySection("/m"),
  ]) {
    assert.ok(section);
    assert.equal(section.injectionTarget, "system");
    assert.equal(section.cacheHint, "dynamic");
    assert.equal(section.chars, section.content.length);
    assert.ok(section.tokens > 0);
  }
});

test("memory section is absent without a memory root", () => {
  assert.equal(buildMemorySection(undefined), null);
});

test("desktop context is injected only for the Desktop surface", () => {
  const terminal = new ContextBuilder(baseConfig({ presentationSurface: "terminal" })).build();
  const desktop = new ContextBuilder(
    baseConfig({ presentationSurface: "mesaCode_desktop" }),
  ).build();

  assert.equal(
    terminal.sections.some((s) => s.source === "desktop_context"),
    false,
  );
  assert.equal(
    desktop.sections.some((s) => s.source === "desktop_context"),
    true,
  );
  assert.equal(
    desktop.sections.find((s) => s.source === "desktop_context")?.content,
    buildDesktopContextSection().content,
  );
});

test("the injected baseline stays within budget and keeps its sections", () => {
  const result = new ContextBuilder(baseConfig({ presentationSurface: "terminal" })).build();
  const sourceSet = new Set(result.sections.map((s) => s.source as string));
  for (const source of ["cli_prefix", "identity", "dynamic_behavior", "context_management", "env_info"]) {
    assert.ok(sourceSet.has(source), `baseline should include ${source}`);
  }

  // Before the trim the three Mesa-owned blocks were ~2,259 estimated tokens
  // (dynamic_behavior 1022, context_management 639, memory 598). Guard the new
  // budget so the prose cannot silently regrow.
  const trimmedTokens = result.sections
    .filter((s) => ["dynamic_behavior", "context_management", "memory"].includes(s.source))
    .reduce((sum, s) => sum + s.tokens, 0);
  assert.ok(trimmedTokens <= 1900, `trimmed prompt blocks grew to ${trimmedTokens} tokens`);

  assert.ok(result.totalTokens < 2200, `injected baseline grew to ${result.totalTokens} tokens`);
});
