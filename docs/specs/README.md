# Active specifications

**Status:** active catalog  
**Owner:** project maintainers and coding agents  
**Authority:** routing only; each linked specification owns its declared contract  
**Scope:** product specifications under `docs/specs/`  
**Updated:** 2026-10-12 08:37 (local time)

This catalog helps AI agents choose the smallest relevant specification. It is not a replacement for the linked documents. Read the linked specification before changing its behavior. A specification's status describes intent and history; [`../verification-log.md`](../verification-log.md) records dated evidence. `Implemented` below is a source/history label, not a runtime or installer claim; where coverage is limited, the row says so. Older installer evidence covers only the source packaged at that date, not subsequent changes.

## Current product and UI contracts

| Specification                                                                                  | Status                                             | Read for                                                                                                                                        |
| ---------------------------------------------------------------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| [`quiet-studio.md`](quiet-studio.md)                                                           | Active                                             | Stage 1 shell, sidebar, chat, task-list presentation, Appearance                                                                                |
| [`github-only-login-and-push.md`](github-only-login-and-push.md)                               | Active                                             | Settings-only navigation, no application login, native Git authentication                                                                       |
| [`github-release-automation.md`](github-release-automation.md)                                 | Active                                             | Windows x64 build and immutable GitHub Release publication                                                                                      |
| [`settings-restructure.md`](settings-restructure.md)                                           | Partial implementation; runtime error unresolved   | Settings architecture and layout; Migration remains in General, `dataLocation` lacks a content branch, removed rows remain                      |
| [`local-network-access.md`](local-network-access.md)                                           | Active; dated dev-build runtime evidence           | LAN/Tailscale access and Network settings; prior dev checks do not verify every later build, external-device route, or installed app            |
| [`web-remote-reconnect.md`](web-remote-reconnect.md)                                           | In progress                                        | Phone/web client reconnect after lock screen, backgrounding, or BFCache                                                                         |
| [`conversation-image-previews.md`](conversation-image-previews.md)                             | In progress                                        | Inline image previews for generated images in responses                                                                                         |
| [`quiet-studio-mobile-web-layout.md`](quiet-studio-mobile-web-layout.md)                       | Active; not yet runtime-verified                   | Phone-width layout for the web client (drawer + Settings master-detail + one-row composer toolbar), desktop untouched                           |
| [`custom-provider-only-model-settings.md`](custom-provider-only-model-settings.md)             | Implemented                                        | Custom-provider-only model settings                                                                                                             |
| [`custom-provider-model-discovery.md`](custom-provider-model-discovery.md)                     | Implemented                                        | Custom model discovery                                                                                                                          |
| [`custom-provider-connection-apply-and-test.md`](custom-provider-connection-apply-and-test.md) | Active contract; source wiring present             | Base URL/API key drafts, explicit Apply, manual Test, inline results; live provider success requires separate evidence                          |
| [`accent-picker.md`](accent-picker.md)                                                         | Implemented                                        | Independent accent selection                                                                                                                    |
| [`mesa-code-accent-identity.md`](mesa-code-accent-identity.md)                                 | Implemented                                        | Mesa Code brand accent                                                                                                                          |
| [`black-theme.md`](black-theme.md)                                                             | In progress                                        | Black theme token coverage                                                                                                                      |
| [`liquid-theme.md`](liquid-theme.md)                                                           | Source implemented; app visuals unverified         | Liquid translucent tokens, native materials, web backdrop, transparency slider; focused tests/engine checks are not running-app visual proof    |
| [`notification-pill-overlay.md`](notification-pill-overlay.md)                                 | Active contract                                    | Notification pill behavior                                                                                                                      |
| [`notification-settings.md`](notification-settings.md)                                         | Source and focused tests; runtime/audio unverified | Separate Notifications and Sound destinations: channel/focus/event routing, pill placement/duration, sound presets/volume/custom upload/preview |
| [`pinned-task-cache-membership.md`](pinned-task-cache-membership.md)                           | Implemented and verified                           | Pinned/archive task cache membership                                                                                                            |
| [`workspace-only-mode.md`](workspace-only-mode.md)                                             | Active contract                                    | Workspace-only permission boundary                                                                                                              |

## Agent, skill, and runtime contracts

| Specification                                                                | Status          | Read for                                     |
| ---------------------------------------------------------------------------- | --------------- | -------------------------------------------- |
| [`built-in-subagents.md`](built-in-subagents.md)                             | Active contract | Built-in subagent roster and tool boundaries |
| [`subagent-stall-detection.md`](subagent-stall-detection.md)                 | Implemented     | Bounded child inactivity watchdog            |
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

| Specification                                                                          | Status                                           | Read for                                                                                                                                                           |
| -------------------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`desktop-development-reload.md`](desktop-development-reload.md)                       | Implemented                                      | Development renderer reload                                                                                                                                        |
| [`installer-version-scheme.md`](installer-version-scheme.md)                           | Implemented                                      | Installer version increments                                                                                                                                       |
| [`windows-installer-artifact-naming.md`](windows-installer-artifact-naming.md)         | Active contract                                  | Windows artifact naming                                                                                                                                            |
| [`windows-only-distribution.md`](windows-only-distribution.md)                         | Implemented                                      | Windows distribution boundary                                                                                                                                      |
| [`mesa-code-branding.md`](mesa-code-branding.md)                                       | Implemented                                      | Product and internal naming                                                                                                                                        |
| [`mesa-code-naming.md`](mesa-code-naming.md)                                           | Implemented                                      | File and symbol naming                                                                                                                                             |
| [`openai-reasoning-effort-compatibility.md`](openai-reasoning-effort-compatibility.md) | Implemented                                      | Reasoning-level compatibility                                                                                                                                      |
| [`conversation-rendering-performance.md`](conversation-rendering-performance.md)       | Source optimizations; chat-switch fix unverified | Conversation rendering and switch projection; `SessionPane` passes `lease?.sessionId ?? sessionId`, so a stale existing lease does not exercise the mismatch guard |

## Historical or superseded specifications

| Specification                                                                | Status     | Reading rule                                                                                                                      |
| ---------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------- |
| [`theme-set-reduction.md`](theme-set-reduction.md)                           | Superseded | Historical context only; current theme catalog is in `docs/theme-catalog.md` and `DESIGN.md`.                                     |
| [`sidebar-account-actions-position.md`](sidebar-account-actions-position.md) | Superseded | Account/Connect behavior was removed. Use [`github-only-login-and-push.md`](github-only-login-and-push.md) and `quiet-studio.md`. |

If a specification is not listed here, treat it as reference or historical until its status is reviewed. Do not infer completion from the word `Implemented`; check the dated verification ledger.
