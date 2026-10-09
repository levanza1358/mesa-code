# Active specifications

**Status:** active catalog  
**Owner:** project maintainers and coding agents  
**Authority:** routing only; each linked specification owns its declared contract  
**Scope:** product specifications under `docs/specs/`  
**Updated:** 2026-10-09 16:31 (local time)

This catalog helps AI agents choose the smallest relevant specification. It is not a replacement for the linked documents. Read the linked specification before changing its behavior. A specification's status describes intent and history; [`../verification-log.md`](../verification-log.md) records evidence.

## Current product and UI contracts

| Specification                                                                      | Status                   | Read for                                                                  |
| ---------------------------------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------- |
| [`quiet-studio.md`](quiet-studio.md)                                               | Active                   | Stage 1 shell, sidebar, chat, task-list presentation, Appearance          |
| [`github-only-login-and-push.md`](github-only-login-and-push.md)                   | Active                   | Settings-only navigation, no application login, native Git authentication |
| [`github-release-automation.md`](github-release-automation.md)                     | Active                   | Windows x64 build and immutable GitHub Release publication                |
| [`settings-restructure.md`](settings-restructure.md)                               | Implemented              | Settings information architecture and layout                              |
| [`custom-provider-only-model-settings.md`](custom-provider-only-model-settings.md) | Implemented              | Custom-provider-only model settings                                       |
| [`custom-provider-model-discovery.md`](custom-provider-model-discovery.md)         | Implemented              | Custom model discovery                                                    |
| [`accent-picker.md`](accent-picker.md)                                             | Implemented              | Independent accent selection                                              |
| [`mesa-code-accent-identity.md`](mesa-code-accent-identity.md)                     | Implemented              | Mesa Code brand accent                                                    |
| [`black-theme.md`](black-theme.md)                                                 | In progress              | Black theme token coverage                                                |
| [`notification-pill-overlay.md`](notification-pill-overlay.md)                     | Active contract          | Notification pill behavior                                                |
| [`pinned-task-cache-membership.md`](pinned-task-cache-membership.md)               | Implemented and verified | Pinned/archive task cache membership                                      |
| [`workspace-only-mode.md`](workspace-only-mode.md)                                 | Active contract          | Workspace-only permission boundary                                        |

## Agent, skill, and runtime contracts

| Specification                                                                | Status          | Read for                                     |
| ---------------------------------------------------------------------------- | --------------- | -------------------------------------------- |
| [`built-in-subagents.md`](built-in-subagents.md)                             | Active contract | Built-in subagent roster and tool boundaries |
| [`builtin-productivity-skills.md`](builtin-productivity-skills.md)           | Active contract | Builtin skill packs and installer delivery   |
| [`proactive-skill-invocation.md`](proactive-skill-invocation.md)             | Implemented     | Skill loading and same-run continuation      |
| [`context-compaction-frequency.md`](context-compaction-frequency.md)         | Implemented     | Context compaction cadence                   |
| [`context-prompt-injection-budget.md`](context-prompt-injection-budget.md)   | Implemented     | System prompt budget                         |
| [`full-access-plan-auto-approval.md`](full-access-plan-auto-approval.md)     | Implemented     | Full Access plan approval behavior           |
| [`ask-user-question-answer-history.md`](ask-user-question-answer-history.md) | Active contract | AskUserQuestion answer projection            |
| [`tool-call-history-pairing.md`](tool-call-history-pairing.md)               | Implemented     | Tool-call and tool-result history pairing    |
| [`connected-workspace-tool-access.md`](connected-workspace-tool-access.md)   | Implemented     | Connected workspace tool access              |
| [`office-document-read.md`](office-document-read.md)                         | Implemented     | Office document reading                      |
| [`file-authoring-guidance.md`](file-authoring-guidance.md)                   | Implemented     | Plain-text file authoring                    |
| [`soul-md-persona-layer.md`](soul-md-persona-layer.md)                       | Implemented     | `SOUL.md` persona loading                    |

## Platform, compatibility, and packaging contracts

| Specification                                                                          | Status                                           | Read for                           |
| -------------------------------------------------------------------------------------- | ------------------------------------------------ | ---------------------------------- |
| [`desktop-development-reload.md`](desktop-development-reload.md)                       | Implemented                                      | Development renderer reload        |
| [`installer-version-scheme.md`](installer-version-scheme.md)                           | Implemented                                      | Installer version increments       |
| [`windows-installer-artifact-naming.md`](windows-installer-artifact-naming.md)         | Active contract                                  | Windows artifact naming            |
| [`windows-only-distribution.md`](windows-only-distribution.md)                         | Implemented                                      | Windows distribution boundary      |
| [`mesa-code-branding.md`](mesa-code-branding.md)                                       | Implemented                                      | Product and internal naming        |
| [`mesa-code-naming.md`](mesa-code-naming.md)                                           | Implemented                                      | File and symbol naming             |
| [`openai-reasoning-effort-compatibility.md`](openai-reasoning-effort-compatibility.md) | Implemented                                      | Reasoning-level compatibility      |
| [`conversation-rendering-performance.md`](conversation-rendering-performance.md)       | Source optimizations; runtime tracked separately | Conversation rendering performance |

## Historical or superseded specifications

| Specification                                                                | Status     | Reading rule                                                                                                                      |
| ---------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------- |
| [`theme-set-reduction.md`](theme-set-reduction.md)                           | Superseded | Historical context only; current theme catalog is in `docs/theme-catalog.md` and `DESIGN.md`.                                     |
| [`sidebar-account-actions-position.md`](sidebar-account-actions-position.md) | Superseded | Account/Connect behavior was removed. Use [`github-only-login-and-push.md`](github-only-login-and-push.md) and `quiet-studio.md`. |

If a specification is not listed here, treat it as reference or historical until its status is reviewed. Do not infer completion from the word `Implemented`; check the dated verification ledger.
