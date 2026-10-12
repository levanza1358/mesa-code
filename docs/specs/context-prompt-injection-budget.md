# Context Prompt-Injection Budget

**Status:** active  
**Owner:** CLI core context maintainers  
**Authority:** contract  
**Scope:** Mesa-owned prompt compression without changing user instructions or section interfaces  
**Updated:** 2026-10-12 08:39 (local time)  
**Verification:** source-only documentation review; measured results below describe the original trim, not a fresh benchmark

## Problem

Every model request carries a fixed system prompt assembled by `ContextBuilder`
from ordered `ContextSection`s. Measured through the real builders with a full
set of inputs (this repository's instruction files, git context, and session
guidance), that baseline is about **21,859 characters / ~7,290 estimated tokens**
per step, before any conversation or tool output is added. Because it is present
on every step of every turn it is paid repeatedly, and it contributes directly to
how soon the context window fills and auto-compaction fires.

Three of the injected blocks are Mesa-owned boilerplate rather than
project-supplied instruction, and their prose was markedly longer than the rules
they carry. Pre-trim sizes:

| Section (source)                       | Chars | ~Tok |
| -------------------------------------- | ----: | ---: |
| `dynamic_behavior` (communicating etc.)|  3065 | 1022 |
| `context_management`                   |  1915 |  639 |
| `memory`                               |  1792 |  598 |

The remaining baseline is either small (`cli_prefix`, `env_info`,
`git_system_context`, `current_date`), already correctly gated
(`desktop_context`, Desktop only), or **user-owned** (`request_user_context` =
`AGENTS.md` and other instruction files, ~3,743 tokens for this repo).

## Product rules

1. **Trim Mesa-owned boilerplate only.** The trim targets are the Mesa-authored
   prompt blocks: `dynamic_behavior`, `context_management`, and `memory`. No
   other section is changed by this spec.
2. **Never trim user-owned instruction.** `request_user_context` (`AGENTS.md`
   and other resolved instruction files) is authored by the user and is a
   source of truth for agent behavior. It is explicitly **out of scope**; do not
   shorten, summarize, or reword it. This also means the fix must not "solve"
   token use by degrading the user's own instructions.
3. **Preserve every operative rule.** Trimming is compression, not deletion.
   Condensing must keep the rules the model must still obey:
   - communication: state what you're about to do before the first tool call;
     the final text message of the turn must carry everything the user needs;
     lead with the outcome; readable beats terse; match the response to the
     question; comment only on constraints the code cannot show;
   - autonomy: act when the information is present, recommend instead of
     surveying, proceed on reversible steps without asking, stop only for
     destructive or genuine scope changes, report-not-fix when the user is only
     asking/thinking aloud, do the last-paragraph work before ending the turn,
     check evidence before a state-changing command;
   - hard-to-reverse / outward-facing actions: confirm first unless durably
     authorized, deleting/overwriting requires looking at the target, report
     outcomes faithfully (failing tests, skipped steps, done-and-verified);
   - context management: don't wrap up early for a summary; the summary plus
     remaining context continues the work;
   - memory: the directory exists and is written to directly; one fact per file
     with the given frontmatter and the four `type` values; `[[name]]` linking;
     the `MEMORY.md` one-line index; check-then-update before saving; don't save
     what the repo or the conversation already records.
4. **No behavior or interface change.** No new section, no removed section, no
   change to `injectionTarget`, `cacheHint`, `source`, ordering, or metrics
   computation. Only the string content of the three trimmed blocks changes.
5. **Keep the Desktop gate.** `desktop_context` is injected only when
   `presentationSurface === "mesaCode_desktop"`. This is already correct and is
   not changed.

## Result (measured)

Measured through the same real builders after the trim. The trimmed blocks are
shown against their pre-trim size; the "minimal" total is the baseline with no
user instructions, no skills, no custom prompt, and the Desktop surface (so
`desktop_context` is absent).

| Section (source)      | Before chars / tok | After chars / tok |
| --------------------- | -----------------: | ----------------: |
| `dynamic_behavior`    |        3065 / 1022 |        2142 / 714 |
| `context_management`  |        1915 /  639 |        1572 / 524 |
| `memory`              |        1792 /  598 |        1646 / 549 |
| **trimmed subtotal**  |        6772 / 2259 |        5360 / 1787 |

Realized reduction: **−1,412 characters / −472 estimated tokens** on every step
of every turn (≈−21% of the three trimmed blocks, ≈−6.5% of a ~7,290-token full
baseline). The trimmed minimum (`cli_prefix` + `identity` + `dynamic_behavior` +
`memory` + `env_info` + `context_management`) is 7,327 chars / 2,444 estimated
tokens.

The original measurement description above labels the minimal fixture Desktop
while saying `desktop_context` is absent, which conflicts with the Desktop gate
required below. Re-establish the fixture/surface before reusing its total as current
evidence. The original measurement is retained, not silently reassigned.

## State owner

`ContextBuilder` (`apps/mesa-code-cli/packages/core/src/context/builder.ts`) is
the single owner of the injected baseline: it decides which sections exist and
in what order. The trimmed text is owned by the section builders:

- `buildDynamicBehaviorSection()` and `buildContextManagementSection()`
  (`context/dynamic-sections.ts`),
- `buildMemorySection()` (`context/sections/memory.ts`).

The section builders are pure functions of their inputs; there is no new stored
state, no persistence, and no write path.

## Interface

Unchanged. Each builder still returns the same `ContextSection` shape
(`name`, `source`, `injectionTarget: "system"`, `cacheHint: "dynamic"`,
`chars`, `tokens`, `content`, `preview`), computed from `content.length` and
`estimateTokens(content)`. `buildMemorySection` still returns `null` when no
memory root is configured; `buildContextManagementSection` and
`buildDynamicBehaviorSection` still always return a section.

Ordering (unchanged), for reference:

```
buildContextSystemSections(...)
  ├─ cli_prefix                         (skipped for workflow actors)
  ├─ customSystemPrompt? ─┐
  ├─ workflowActor?       ├─ replaces the identity/dynamic block
  ├─ identity             ─┘
  ├─ (if not custom prompt)
  │    ├─ desktop_context      only when surface === "mesaCode_desktop"
  │    ├─ dynamic_behavior     ◀ trimmed text
  │    ├─ session_guidance
  │    ├─ memory               ◀ trimmed text
  │    ├─ env_info
  │    ├─ output_style
  │    ├─ context_management   ◀ trimmed text
  │    └─ git_system_context
  ├─ skills
  ├─ soul
  └─ request_user_context (AGENTS.md — user-owned, untouched), current_date, custom
```

## Acceptance scenarios

1. **Baseline shrinks.** Assembling the baseline with no user instructions,
   no skills, no memory root, and no custom prompt yields a total estimated
   token count strictly lower than the pre-trim baseline, driven by the three
   trimmed sections.
2. **Rules survive.** Each trimmed section's `content` still contains its
   load-bearing markers: `dynamic_behavior` mentions the final-message rule, the
   lead-with-outcome rule, and "confirm" for hard-to-reverse actions;
   `context_management` mentions acting when information is present and checking
   the last paragraph; `memory` still documents the `name`/`description`/
   `metadata.type` frontmatter, the four `type` values, `[[name]]` linking, and
   `MEMORY.md`.
3. **Structure unchanged.** For each trimmed section, `injectionTarget` is
   `"system"`, `cacheHint` is `"dynamic"`, `source` is its original value, and
   `chars`/`tokens` equal the recomputed values for the new `content`.
4. **Memory null path.** `buildMemorySection(undefined)` still returns `null`.
5. **Desktop gate unchanged.** `buildDesktopContextSection()` is included in the
   assembled system sections only for `presentationSurface === "mesaCode_desktop"`,
   and a test asserts it is absent for `"terminal"`.
6. **User instructions untouched.** The trim does not read, modify, or depend on
   `request_user_context`; its content is passed through verbatim.

## Out of scope / non-goals

- Shortening `AGENTS.md` or any other user instruction file (rule 2).
- Changing the token estimator's divisor (`ESTIMATED_TOKEN_CHAR_DIVISOR`); the
  over-estimate noted in
  [context-compaction-frequency](context-compaction-frequency.md) is a separate
  topic.
- Changing the runtime reminders in `runtime/helpers/runtime-reminders.ts`
  (throttled, not part of the always-present baseline) or the Desktop context
  block's text.
- Any Settings field, protocol change, or new user-facing knob.

## Related

- [context-compaction-frequency](context-compaction-frequency.md) — the sibling
  cause of frequent compaction. This spec lowers the amount of context that is
  always present; that one lowers how eagerly the window is compacted. Both walk
  the same path (the request's token accounting) and are complementary.
- [soul-md-persona-layer](soul-md-persona-layer.md) — documents the priority
  stack that puts `AGENTS.md`/`SOUL.md` above default behavior, which is why that
  content is user-owned and untrimmed here (rule 2).
