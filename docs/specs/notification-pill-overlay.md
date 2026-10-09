# Notification pill overlay

## Product rules

When the main Mesa Code window is minimized or unfocused, task events surface in a small
always-on-top "pill" pinned to the top-center of the screen, so the user can follow a task and
answer a permission request without restoring the full window. The pill never appears while a
Mesa Code window is focused; it hides again as soon as the app regains focus.

Two kinds of pill content exist:

- **Status pill** — task completed or failed. Shows the localized status text plus the task's
  last assistant answer preview (the existing bounded `SessionSummary.lastAssistantPreview`).
  It auto-dismisses after eight seconds; its explicit Open app action restores the source window.
- **Permission pill** — a permission request is waiting. Shows the request summary with
  Allow / Deny actions. It does not auto-dismiss: it stays until the user answers it or the
  request is resolved elsewhere. Answering from the pill resolves the same pending interaction
  the in-app dialog owns.

Elicitation (user input) requests and workspace Hook reviews do not produce an answerable pill:
user input has no fixed options to render, and Hook review's only entry point is Settings. When an
elicitation request arrives while unfocused, the pill shows a persistent Open-only "input required"
presentation. Open app restores the source window; no answer is submitted from the pill.

The pill is gated by the existing task-notification preference (currently defaulting to enabled)
(`mesa-code-notification-enabled`). Disabling task notifications disables the pill too; the pill
does not add a second setting.

## Owner and interface

The desktop main process owns the pill window lifecycle. One module,
`notification-pill-overlay.ts`, is the single owner: it creates, positions, shows, hides, and disposes
the window, and it is the only place that decides pill visibility from window focus. It is
host-less (no Local Host, no workspace RPC), exactly like the Windows CUA operation indicator.

The pill is a separate renderer entry (`notification-pill.html`) with its own minimal preload; it
never loads the main app bundle and never reads settings or locale itself. All copy is produced by
the renderer that already owns localization and pushed into the pill, mirroring how
`dispatchTaskNotification` requires pre-localized title/body.

Answers are not sent to the agent by the main process. The main process only relays a pill answer
back to the renderer that owns the interaction; that renderer resolves it through the existing V4
`resolveInteraction` command on the same transport the in-app dialog uses. The pill therefore
introduces no second command path and no new persistence.

```text
Renderer triggers (existing edges, localized copy)
  ├─ completed/failed => presentNotificationPill(status, answer preview)
  └─ pending interaction => presentNotificationPill(permission, original safe options)
        │ NotificationPillChannels.publish: token + presentation, or exact-token clear
        ▼
  Main: notification-pill-overlay.ts owns one ephemeral presentation
        ├─ registered app focus/source reload/destruction => clear token
        └─ NotificationPillChannels.state => host-less pill BrowserWindow
              ├─ Open app => NotificationPillChannels.action => restore exact source/task
              └─ Allow once/Deny => NotificationPillChannels.action
                    => Main authenticates overlay/token/current option, marks busy
                    => NotificationPillChannels.reply to owning app renderer
                    => renderer validates live identity/request/revision/option
                    => same resolveInteraction + pendingCommandRegistry + transport
                    => accepted ACK: exact-token clear; failed ACK: retry publication
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
exposed; rich displays, nonempty detail, free-text review, truncated summaries or ambiguous options
use Open only. Failed/rejected ACKs restore retry controls with localized error; accepted ACKs hide.
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

1. Main window minimized, task completes: the status pill appears top-center with the localized
   status and the answer preview; it disappears on its own after the timeout.
2. Main window focused when a task completes: no pill appears (the existing OS notification path
   is also suppressed in this case).
3. Main window unfocused, permission request arrives: the permission pill appears with Allow and
   Deny. Clicking Allow while the app is still minimized resolves the pending interaction for the
   correct workspace/session and the pill hides.
4. A permission pill is open and the user restores the main window manually: the pill hides and
   the in-app dialog remains the single place the request is answered.
5. Clicking Open app restores and focuses the exact source window/task and hides the pill.
   Clicking the pill body has no action; Allow once/Deny never restores the app.
6. An elicitation request arrives while unfocused: the pill shows a persistent Open-only "input
   required" presentation; there is no way to answer the question from the pill.
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

## Verification

Source invariants (guard script): the pill HTML is a registered vite renderer entry; the overlay
module is created and disposed in the desktop main entry; the overlay window is excluded from the
application-window enumeration; typed pill channels exist; positioning clamps to the sender
display workArea. Source checks are not interaction E2E evidence.

Unit tests: `createNotificationPillOverlay` is driven with injected window/display/schedule stubs
asserting show-on-unfocused, hide-on-focus, status auto-hide, permission no-auto-hide, answer
relay, and dispose cleanup.

Runnable checks:

- `pnpm exec tsx --tsconfig packages/desktop/tsconfig.json --test packages/desktop/src/main/notification-pill-overlay.test.ts`
- `pnpm exec tsx --tsconfig packages/ui/tsconfig.json --test packages/ui/src/lib/notification-pill.test.ts`
- `node scripts/notification-pill-e2e.mjs`: builds only synthetic host-less source/overlay renderers,
  launches isolated Electron with project-local fresh data, and exercises keyboard Allow, busy state,
  rejected-response retry/Deny, clearing, answer preview and explicit Open over a minimized source.
  Also mounts the real V4 interaction owner and pill hook against a synthetic transport, verifying
  original option IDs, pendingCommandRegistry admission/settlement, rejected ACK retry, accepted ACK
  clearing, stale identity rejection, preference disable and resolved snapshots. Its focused regression
  helper additionally checks A-to-B ACK serialization, disconnect/restart freshness in both event orders,
  rendered-summary overflow under font/viewport changes, and filtered quit-parent selection. UI shell dependencies
  are stubbed; the production resolveInteraction callback, command factory and ACK registry execute.
  Screenshot evidence stays in `.quiet-studio-runtime/notification-pill-e2e`. No real permissions,
  provider secrets, Host or Agent are involved.

The synthetic interaction check is not proof of a live conversation ACK, real remote attachment,
full-app theme/locale broadcast or installer behavior. Those require independent end-to-end checks.
No installer or packaged-desktop result is implied by source, unit or synthetic interaction checks.
