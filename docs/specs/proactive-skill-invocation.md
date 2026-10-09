# Proactive skill invocation

Status: Implemented

## Problem

Skills are discoverable but under-used. Only skill **metadata** (name, description,
`when_to_use`) is injected into the system prompt; the skill body loads lazily through the
`Skill` tool. Whether a skill is used therefore depends entirely on the model deciding to
call the tool. In practice the model often proceeds without checking the skill list, so
relevant skills sit unused even when they match the request.

The current guidance is also narrow: the session guidance only tells the model what to do
when the user types `/<skill-name>` (explicit invocation). It says nothing about the model
proactively invoking a skill on its own when the skill matches the task.

## Product behavior

The agent must treat skill invocation as a default step, not an optional one, before it
starts work on a task that a skill covers.

1. **Check before acting.** At the start of a non-trivial task, the agent checks the
   available-skill list and decides whether any skill's `description` / `when_to_use`
   matches. This happens before producing the first substantive response.
2. **Invoke proactively.** When a skill matches, the agent calls the `Skill` tool before
   doing the work. A match is a blocking requirement, not a hint.
3. **Skip only on a positive reason.** The agent proceeds without a skill only when no
   listed skill matches the task, the task is trivial, or the skill is already loaded in
   the current turn. "I did not check" is not a valid reason.
4. **No invented skills.** The agent only invokes a skill that appears in the injected
   list, or one the user explicitly typed. Guessing a name is still forbidden.
5. **Explicit invocation is unchanged.** `/‹skill-name›` still forces that skill; the
   proactive rule is additive.

## Ownership and boundary

The behavior is delivered through the existing prompt surfaces only. No new tool, no new
runtime state, no skill-body preloading, and no persistence change.

- `skill` tool provider description
  (`apps/mesa-code-cli/packages/core/src/tool/handlers/skill.ts`): owns the "check and invoke
  before acting" instruction and the escalation of an implicit match to a blocking
  requirement.
- Session guidance (`apps/mesa-code-cli/packages/core/src/context/dynamic-sections.ts`,
  `buildSessionGuidanceSection`): owns the always-present proactive line, emitted whenever
  the `Skill` tool is registered and at least one skill exists. This is the surface that
  reaches the model even when it never inspects the tool description.
- The injected skills list (`context/sections/skills.ts`) carries the standing requirement
  in the same block as the list itself, so the instruction sits where the model reads the
  candidate skills. The list stays metadata-only; context cost does not grow with skill
  bodies.

`SkillPolicy.allowImplicitInvocation` remains declared and currently always true. This
spec does not gate on it; per-skill opt-out enforcement is out of scope.

## Skill loading and continuation

`Skill` loads instructions into the current agent, including a subagent. It does not execute a separate task, transfer work to the parent, or complete the assignment. After a successful load, the agent applies the instructions and continues the original task in the same run. A skill announcement, a statement that the skill was read, or a promise to use it is not a completed deliverable.

The skills list must not ask for an announcement that conflicts with the tool description. Common subagent notes and the loaded tool result explicitly state the continuation contract. Errors, cancellation, permission gates, and profile tool restrictions remain authoritative; loading a skill grants no extra tools or permissions.

The child `AgentRuntime` remains the execution owner. `SkillPort` only resolves and loads content. No new state, timers, retries, persistence keys, or protocol changes are introduced.

```text
Current agent model request
  -> Skill tool call
  -> SkillPort load (existing cancellation and restrictions)
  -> tool result committed to the same runtime history
  -> next model request with loaded instructions
  -> assigned task actions and final deliverable
```

Prompt and deterministic loop checks prove the continuation contract reaches the model and that the runtime does not stop after a normal Skill result. They do not guarantee compliance by every model or prove an unobserved production stall has the same cause.

## Acceptance scenarios

1. On a task covered by a listed skill, the agent invokes that skill before doing the work.
2. The agent does not skip the skill check and then claim the task is done.
3. Session guidance contains a proactive-invocation line whenever skills are present and
   the `Skill` tool is registered, in addition to the existing `/<name>` line.
4. When no listed skill matches, the agent proceeds normally without invoking one.
5. The agent never invents a skill name that is absent from the injected list.
6. `/‹skill-name›` still forces that exact skill (explicit path unchanged).
7. Skill bodies are still loaded lazily; the injected list stays metadata-only.
8. The injected skills block states the standing requirement above the list, so the
   instruction is co-located with the candidate skills.
9. Skill guidance never instructs the agent to announce instead of invoking. The loaded result and subagent notes require continuing the original task, not returning a skill-use announcement as the final answer.
10. A successful Skill result carries no stop-turn control; the next model request receives its instructions. A subsequent task action and final deliverable complete the scripted regression scenario.
