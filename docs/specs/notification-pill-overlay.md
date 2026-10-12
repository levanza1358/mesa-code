# Notification pill overlay

**Status:** active specification  
**Owner:** desktop Main overlay and shared UI interaction maintainers  
**Authority:** product contract and acceptance scenarios  
**Scope:** Windows status, permission, and question pill presentation and answer relay  
**Updated:** 2026-10-12 08:31 (local time)  
**Verification:** source review only in this update; no live delivery or runtime interaction evidence

## Product rules

When the main Mesa Code window is minimized or unfocused, task events surface in a small
always-on-top "pill" pinned to the screen, so the user can follow a task and answer a permission
request without restoring the full window. The pill never appears while a Mesa Code window is
focused; it hides again as soon as the app regains focus. Its anchor and auto-dismiss duration are
the notification-position and notification-duration preferences for status presentations
([`notification-settings.md`](notification-settings.md) rule 6). The current status renderer sends
those values (default top-center, 5000 ms). When a presentation omits them, Main keeps the legacy
top-center anchor and eight-second status auto-dismiss. Current permission/question presentations
omit position and duration, so they retain top-center placement and remain persistent; applying the
position preference to them is still an integration gap against the shared preference rule.

Three kinds of pill content exist:

- **Status pill** — task completed or failed. Shows the localized status text plus the task's
  last assistant answer preview (the existing bounded `SessionSummary.lastAssistantPreview`).
  It auto-dismisses after the configured duration (legacy default eight seconds); its explicit
  Open app action restores the source window.
- **Permission pill** — a permission request is waiting. Shows the request summary with
  Allow / Deny actions. It does not auto-dismiss: it stays until the user answers it or the
  request is resolved elsewhere. Answering from the pill resolves the same pending interaction
  the in-app dialog owns.
- **Question pill** — a userInput (AskUserQuestion) request is waiting whose questions are fixed
  single- or multi-select choices with no rich preview. The compact pill stays Open-only plus a
  **Show answer** action; pressing it opens a separate, larger **answer panel** window below the
  pill (never merged into the pill) that lists each question and its options. Picking option(s) and
  submitting resolves the same pending interaction the in-app dialog owns. The panel renders fixed
  options only — it never collects the dialog's free-text "Other" answer — and it stays Open-only for
  requests it cannot honestly present (a question with a rich preview, more than four questions, or an
  option count outside two to four).

Workspace Hook reviews do not produce an answerable pill: their only entry point is Settings. A
userInput request that is not answerable from the panel (rich preview, out-of-bounds question/option
counts) keeps the Open-only "input required" presentation. Open app restores the source window; no
answer is submitted from the pill.
The pill reads the existing task-notification preference record
([`notification-settings.md`](notification-settings.md)); it does not add a second setting.
Status pills honor the master switch, their completed/failed event toggle, and the `pill` channel.
Permission/question interaction pills honor the master switch only, not `pill`, `os`,
`events.permission`, or `quietWhenFocused`. Main still suppresses every pill while a registered
application window is focused; the interaction exception does not bypass focus suppression.

## Owner and interface

The desktop main process owns the pill window lifecycle. One module,
`notification-pill-overlay.ts`, is the single owner: it creates, positions, shows, hides, and disposes
the window, and it is the only place that decides pill visibility from window focus. It owns both the
compact pill window and, lazily, the taller answer-panel window for a Question pill; the panel is not
a second presentation owner and holds no business state of its own. It is host-less (no Local Host,
no workspace RPC), exactly like the Windows CUA operation indicator.

The pill and the answer panel are separate renderer entries (`notification-pill.html`,
`notification-pill-answers.html`) with their own minimal preloads; they never load the main app bundle
and never read settings or locale itself. All copy is produced by the renderer that already owns
localization and pushed in, mirroring how `dispatchTaskNotification` requires pre-localized
title/body.

Answers are not sent to the agent by the main process. The main process only relays a pill or panel
answer back to the renderer that owns the interaction; that renderer resolves it through the existing
V4 `resolveInteraction` command on the same transport the in-app dialog uses. The pill therefore
introduces no second command path and no new persistence.

```text
Renderer triggers (existing edges, localized copy)
  ├─ completed/failed => presentNotificationPill(status, answer preview)
  ├─ pending permission => presentNotificationPill(permission, original safe options)
  └─ pending userInput  => presentNotificationPill(input, answerPrompt when fixed-option)
        │ NotificationPillChannels.publish: token + presentation, or exact-token clear
        ▼
  Main: notification-pill-overlay.ts owns one ephemeral presentation + its windows
        ├─ registered app focus/source reload/destruction => clear token (pill + panel)
        ├─ NotificationPillChannels.state => host-less pill BrowserWindow
        │     ├─ Open app => NotificationPillChannels.action => restore exact source/task
        │     ├─ Allow once/Deny => action (permission answer, see below)
        │     └─ Show answer => action(reveal) => open the panel BrowserWindow
        │           NotificationPillChannels.panelState => panel (its questions + options)
        └─ NotificationPillChannels.action (also from the panel window, same overlay sender check)
              ├─ Open app => restore exact source/task
              └─ Submit selections (answers) => Main authenticates overlay/token/current questions,
                    marks busy => NotificationPillChannels.reply to owning app renderer
                    => renderer validates live identity/request/revision + every
                       {question, value} against the live pending questions
                    => same resolveInteraction + pendingCommandRegistry + transport
                    => accepted ACK: exact-token clear (panel included); failed ACK: retry
  Overlay focus never counts as registered app focus.
```

Single presentation write path: optional `presentNotificationPill` platform method and typed,
strictly validated IPC publication/action channels. Native `ShowTaskNotification` remains a
separate unchanged delivery path. No Agent protocol, storage identifier or migration changes.
Main retains at most one ephemeral presentation, never a pending business queue. An unresolved
permission presentation cannot be replaced by terminal status; a later permission may replace it.
Source unmount, disconnect, disabled preference, renderer reload/destruction and resolved snapshots
clear the exact token. App focus clears rather than defers a presentation.

Publication authenticates a registered main-app renderer and its exact main frame; actions
authenticate the exact live overlay renderer and its main frame. Subframe and missing-frame senders
are rejected. Actions echo an opaque token and exact session/request/workspace identity (trimmed identity
or local path fallback), remoteSessionId and snapshot logEpoch/revision. The owning renderer checks
these against its current snapshot and validates the original optionId again immediately before
using the SAME resolveInteraction and ACK registry as the dialog. Only allowOnce and deny are
exposed. A permission that carries the tool input as `detail`, or that allows optional deny
free-text, still shows Allow once/Deny: a pill answer submits the option's own decision and never
forwards edited input or free-text feedback, so the unreviewed payload is not needed to answer and
the full review stays one Open app away. What keeps a permission Open-only is content the pill
cannot honestly present: a rich display preview, an empty/whitespace summary, a summary long enough
that the single-line pill body would truncate it, or ambiguous (fewer than two, same-kind or
duplicate) options, or an option that carries its own `modifiedInput` or permission-update side
effects. Failed/rejected ACKs restore retry controls with localized error; accepted ACKs hide.
In-flight attempts are serialized across dialog and pill. While an answer for request A awaits ACK,
a replacement request B is published busy; its answer controls cannot submit until A settles.
Settlement republishes the current request, not A's stale presentation. A raced B click must not
leave Main's busy presentation stuck. Disconnect/restart invalidates the current snapshot reference;
process availability alone cannot republish it. Recovery requires both available transport and a new
snapshot object, including a fresh projection with unchanged session, epoch and revision.

The overlay renderer owns the rendered-summary safety gate. If the permission body is ellipsized,
clipped or outside the viewport, only Open app is shown. It rechecks after every presentation, resize,
font load and layout change; safe payload length alone does not authorize a visually truncated review.
Open restores the exact originating window and forwards its taskId; Allow/Deny never forwards
TaskNotificationClick. Quit confirmation chooses origin/focused windows only from the filtered
application/resource window list, never the pill.

Theme tokens, font token and localized labels are passed from the current app renderer; theme and
locale changes republish fresh values, not cached translations. Existing renderer background
throttling remains unchanged. Minimized delivery must be verified with production hooks; no
animation-frame gating or global throttling override is introduced for this presentation.
The host-less Windows-only window uses showInactive but remains keyboard focusable, denies
navigation/window-open, isolates context, disables Node, and renders only textContent under CSP.
Position uses sender display workArea with clamped bounds and repositions on display changes.
Closed-app operation, streaming answers, detailed review and Web/mobile overlays are out of scope.

Desktop only. Web and mobile have no pill; the platform methods are optional and their renderers
never call them.

## Acceptance scenarios

1. Main window minimized, task completes: the status pill appears at the configured anchor with the
   localized status and the answer preview; it disappears on its own after the configured duration.
2. Main window focused when a task completes: no pill appears (the existing OS notification path
   is also suppressed in this case).
3. Main window unfocused, permission request arrives: the permission pill appears with Allow and
   Deny. Clicking Allow while the app is still minimized resolves the pending interaction for the
   correct workspace/session and the pill hides.
4. A permission pill is open and the user restores the main window manually: the pill hides and
   the in-app dialog remains the single place the request is answered.
5. Clicking Open app restores and focuses the exact source window/task and hides the pill.
   Clicking the pill body has no action; Allow once/Deny never restores the app.
6. A free-text elicitation (no fixed questions, or an otherwise non-answerable userInput) arrives
   while unfocused: the pill shows a persistent Open-only "input required" presentation; there is no
   way to answer that question from the pill.
7. The user disables task notifications: neither a status nor a permission pill appears.
8. Two permission requests arrive in sequence: the pill updates to the newest pending request and
   never renders a stale option set.
9. The pill window is excluded from every "application window" enumeration (tray show, unread
   badge, focus/ping, quit confirmation), so it is never treated as a main window.
10. On locale change the pill re-renders its shell copy; on app quit the pill window is disposed.
11. A safe-length summary overflows after resize/font change: Allow once/Deny disappear; Open remains.
12. A waits for ACK, B replaces it: B stays busy until A settles, then B can answer without a stuck overlay.
13. Disconnect/restart followed by process availability: no stale pill. A fresh same-session/epoch
    snapshot permits recovery; snapshot arrival before availability also waits for availability.
14. The notification position is set to each of the four anchors: the pill is placed at that anchor
    inside the sender display work area, and unsent (legacy) presentations stay top-center.
15. Main window unfocused, a risk-gate confirmation (a permission whose tool input carries `detail`,
    such as "High risk tools require explicit approval") arrives: the pill still shows Allow once and
    Deny beside Open app, so the user answers without opening the app; the same request keeps its
    full review behind Open app.
16. Main window unfocused, an AskUserQuestion whose questions are fixed choices arrives: the pill
    shows Show answer beside Open app. Pressing Show answer opens the answer panel below the pill,
    listing each question and its options. Selecting an option and submitting resolves the pending
    interaction and closes both windows; the in-app dialog's free-text "Other" answer is never
    offered from the panel.
17. A userInput request with a rich option preview, more than four questions, or an option count
    outside two to four shows no Show answer: the pill stays Open-only.
18. While the answer panel is open, restoring the main window hides the pill and the panel; the
    in-app dialog remains the single place the request is answered.

## Verification

The 2026-10-12 source review traced status routing through `useTaskNotifications.ts` and
`decideTaskNotificationDelivery`, interaction publication through `V4InteractionDialogs.tsx` and
`use-notification-pill.ts`, and focus suppression/defaults through Main's
`notification-pill-overlay.ts`. No tests or runtime checks below were executed in this
documentation update. They describe verification entry points, not current pass results.

Source invariants (guard script): the pill HTML is a registered vite renderer entry; the overlay
module is created and disposed in the desktop main entry; the overlay window is excluded from the
application-window enumeration; typed pill channels exist; positioning clamps to the sender
display workArea. Source checks are not interaction E2E evidence.

Unit tests: `createNotificationPillOverlay` is driven with injected window/display/schedule stubs
asserting show-on-unfocused, hide-on-focus, status auto-hide, permission no-auto-hide, answer
relay, dispose cleanup, the four anchor positions in `notificationPillBounds`, and the configured
auto-dismiss duration (with the legacy 8000 ms default when absent).

Runnable checks:

- `pnpm exec tsx --tsconfig packages/desktop/tsconfig.json --test packages/desktop/src/main/notification-pill-overlay.test.ts`
  covers permission relay, ownership/exclusion, the four anchor positions, configured auto-dismiss, the
  reveal-opens-panel / selection-relays / resolve-clears-panel path, and panel placement under the pill
  with bottom-overflow flipping. `pnpm exec tsx --tsconfig packages/ui/tsconfig.json --test packages/ui/src/lib/notification-pill.test.ts`
  covers option gating, answer-prompt bounds, live userInput answer validation and the
  resolveInteraction content projection.
- `node scripts/notification-pill-e2e.mjs`: builds only synthetic host-less source/overlay renderers,
  launches isolated Electron with project-local fresh data, and exercises keyboard Allow, busy state,
  rejected-response retry/Deny, clearing, answer preview and explicit Open over a minimized source.
  It then publishes a fixed-option AskUserQuestion, presses Show answer, and asserts the separate
  answer window opens, selecting a fixed option relays the answer without restoring the app, and the
  resolved request hides both windows. Also mounts the real V4 interaction owner and pill hook against
  a synthetic transport, verifying original option IDs, pendingCommandRegistry admission/settlement,
  rejected ACK retry, accepted ACK clearing, stale identity rejection, preference disable and resolved
  snapshots. Its focused regression helper additionally checks A-to-B ACK serialization, disconnect/restart
  freshness in both event orders, rendered-summary overflow under font/viewport changes, and filtered
  quit-parent selection. UI shell dependencies are stubbed; the production resolveInteraction callback,
  command factory and ACK registry execute. Screenshot evidence stays in
  `.quiet-studio-runtime/notification-pill-e2e`. No real permissions, provider secrets, Host or Agent are involved.

The synthetic interaction check is not proof of a live conversation ACK, real remote attachment,
full-app theme/locale broadcast or installer behavior. Those require independent end-to-end checks.
No installer or packaged-desktop result is implied by source, unit or synthetic interaction checks.
