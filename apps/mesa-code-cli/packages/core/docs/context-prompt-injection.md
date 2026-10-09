# Context prompt injection

## Behavior

Every model request carries a system prompt assembled by `ContextBuilder` from an
ordered list of `ContextSection`s. Each section declares an `injectionTarget`
(`"system"` or `"meta_user"`), a `cacheHint` (`"stable"` or `"dynamic"`), its
`source` key, and its computed `chars`/`tokens`.

Mesa-owned boilerplate — the communicating, autonomy, hard-to-reverse,
context-management, and memory guidance — is kept terse: the same operative rules
in fewer characters, so the always-present baseline costs less on every step. The
user-owned instruction block (resolved `AGENTS.md` and other instruction files,
plus the Project Memory index) is injected **verbatim** and is never shortened.

## Owner and boundary

`ContextBuilder` (`src/context/builder.ts`) is the single owner of what is
injected and in what order. It decides which sections exist; the section builders
own each section's text and are pure functions of their inputs:

- `buildDynamicBehaviorSection`, `buildContextManagementSection`
  (`src/context/dynamic-sections.ts`),
- `buildMemorySection` (`src/context/sections/memory.ts`),
- `buildRequestUserContextSection` (`src/context/sections/request-user-context.ts`),
- `buildDesktopContextSection` (`src/context/sections/desktop.ts`).

There is no new stored state, persistence, or write path: `chars`/`tokens` are
recomputed from `content.length` and `estimateTokens(content)`. `buildMemorySection`
returns `null` when no memory root is configured; `buildRequestUserContextSection`
returns `null` when there is no user instruction and no memory index.

The Desktop-only block (`desktop_context`) is included only when
`presentationSurface === "mesaCode_desktop"`; `"terminal"` never receives it.

Assembly order (stable across the trim):

```
cli_prefix
customSystemPrompt? | workflowActor? | identity
  (when not a custom prompt)
    desktop_context      desktop surface only
    dynamic_behavior
    session_guidance
    memory               only when a memory root is set
    env_info
    output_style
    context_management
    git_system_context
skills
soul
request_user_context (meta_user — user-owned, verbatim)
current_date (meta_user)
custom sections
```

## Acceptance

- The baseline assembles from the builders above with no duplicated or removed
  section, and the ordering above holds.
- Trimming `dynamic_behavior`, `context_management`, and `memory` lowers the
  baseline token count while every operative rule survives as load-bearing
  markers in the section text.
- `request_user_context` content passes through verbatim; the trim never reads,
  rewrites, or depends on it.
- `buildMemorySection(undefined)` returns `null`; the Desktop gate is present only
  for `presentationSurface === "mesaCode_desktop"` and absent for `"terminal"`.
- Each trimmed section keeps `injectionTarget: "system"`, `cacheHint: "dynamic"`,
  its original `source`, and `chars`/`tokens` equal to the recomputed values.

## Specs

- [context-prompt-injection-budget](../../../../../docs/specs/context-prompt-injection-budget.md)
  — product rules, the measured before/after, and the trim's acceptance
  scenarios.
- [soul-md-persona-layer](../../../../../docs/specs/soul-md-persona-layer.md)
  — why `AGENTS.md`/`SOUL.md` content is user-owned and untrimmed.
