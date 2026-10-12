# Notification settings

**Status:** active specification  
**Owner:** shared UI notification and Settings maintainers  
**Authority:** product contract and acceptance scenarios  
**Scope:** renderer notification preferences, channel routing, and Sound settings  
**Updated:** 2026-10-12 08:31 (local time)  
**Verification:** source review only in this update; live notification/audio behavior not verified

## Problem

Notification preferences were two untyped `localStorage` booleans (master on/off and a sound
sub-toggle) surfaced as two rows inside the General settings section. There was no way to configure
the delivery channels, the notification position, or how long a notification stays on screen; the
preferences were not synchronized across windows; and while the main window was focused **no**
notification was delivered at all, because both the OS notification and the desktop pill are
suppressed when the app is focused. A subagent stopped by the inactivity watchdog reported its
termination only into the model transcript, so the user never saw that it had stopped.

This spec defines a single, typed notification-preferences record and the delivery rules that read
it.

## Product rules

1. **One owner, one write path.** `packages/ui/src/lib/taskNotificationPreferences.ts` owns the
   preference record, its storage key, its defaults, its normalization, and its migration from the
   legacy keys. It is the only module that reads or writes the stored value; every consumer goes
   through its accessors.
2. **Typed record.** The preference is a single JSON record under one storage key. It carries:
   `enabled` (master), `sound`, `soundPreset`, `soundVolume`, the per-channel switches
   `os`/`toast`/`pill`, `quietWhenFocused`,
   `position`, `durationMs`, and a per-event object `events` (`completed`, `failed`, `permission`,
   `subagentStalled`).
3. **Migration is idempotent and lossless.** When the new record is absent but the legacy keys
   (`mesa-code-notification-enabled`, `mesa-code-notification-sound-enabled`) are present, the
   record is seeded from them. A new key is added; the legacy values are never silently discarded.
   `enabled` is the master switch: every channel and every event is additionally gated by it.
4. **Channel routing by focus.** When the main window is focused, terminal task events are delivered
   as an in-app toast. When it is unfocused, they are delivered as the desktop pill and the OS
   notification. Each of the three channels is independently switchable, and per-event toggles
   decide which events are delivered at all.
   - The **permission event** is the exception that proves the rule: its passive OS notification
     honors `events.permission` and the `os` channel, but the answerable **permission pill** is an
     interaction affordance gated by the master switch only. A channel or event toggle must never
     strand a blocked agent with no way to answer, so the pill that carries Allow/Deny is not
     suppressed by them (the in-app dialog is the other answering path, and it is unreachable while
     the window is minimized). The current interaction hook applies this master-only gate to
     permission and question/Open-only input pills alike. Main still hides them when any registered
     app window is focused; they are not focused-window toasts.
5. **Quiet when focused.** When `quietWhenFocused` is on, a focused window delivers nothing for
   terminal task events (an automatic do-not-disturb). It does not suppress the unfocused pill/OS
   path.
6. **Position and duration are preferences.** The notification position (top-center, top-right,
   bottom-center, bottom-left) and the auto-dismiss duration apply to the in-app toast and, on
   Windows, to the desktop pill. A per-call override at a call site still wins; the preference is
   the default.
7. **Cross-window synchronization.** A preference change is broadcast so every window applies it.
   The store's existing broadcast feedback-loop guard applies to this field, exactly as it does to
   the appearance fields.
8. **Stalled subagent is a first-class event.** A subagent that ends in a non-success terminal state
   (including an inactivity-watchdog stop) produces a notification under `events.subagentStalled`,
   routed by the same channel/focus rules as other events.
9. **The notification sound is configurable in a dedicated Sound section.** The sound has its own
   Settings section (separate from Notifications) with: an enable switch (the record's `sound`), a
   built-in preset picker (`soundPreset`), a volume control (`soundVolume`, 0..1), a **Preview**
   button that plays the current sound regardless of the enable switch (an explicit user action),
   and an optional **custom uploaded sound**. The custom sound is owned by
   `lib/notificationSoundCustom.ts` as a data URL under its own `localStorage` keys (never inside the
   broadcast record, so a large blob never travels the cross-window channel); it overrides the preset
   at play time and falls back to the preset when cleared. Only audio files (by MIME or extension),
   capped at 1.5 MB, are accepted. The effective sound still requires the master switch: sound plays
   only when notifications are enabled and `sound` is on.

## Owner and interface

The renderer owns the preference. Storage is `localStorage`; the field is mirrored into the Zustand
store (`packages/ui/src/store/index.ts`) and included in the broadcast allowlist so a change in one
window reaches the others. The desktop main process does not read the preference: it only relays a
localized pill presentation and a localized OS notification; the renderer decides whether to send
them. The pill and the OS notification keep their existing focus suppression; the renderer adds the
focused-window toast on top so a focused window is no longer silent.

```text
taskNotificationPreferences.ts (owner: record + defaults + normalize + migrate)
        │ read/persist
        ▼
Zustand store  notificationPreferences / setNotificationPreferences   ── broadcast ─▶ other windows
        │
        ├─ useTaskNotifications  (terminal session edges; per-event + channel + focus routing)
        ├─ useSubagentTaskNotifications  (subagent terminal/failed edges → subagentStalled)
        ├─ usePendingInteractionTaskNotifications  (permission/plan; permission event)
        └─ toast default position/duration  ← preference

notificationSoundPreset.ts (pure: preset vocabulary + source resolution; asset-free)
notificationSoundCatalog.ts (preset id → bundled asset)      ─┐
notificationSoundCustom.ts  (owner: custom uploaded sound)    ─┼─▶ taskNotificationSound.ts
taskNotificationPreferences.ts (soundPreset + soundVolume)   ─┘    (resolve source + apply volume + preview)
```

## Interface

- `TaskNotificationPosition = "top-center" | "top-right" | "bottom-center" | "bottom-left"`.
- `TaskNotificationPreferences` fields: `enabled: boolean`, `sound: boolean`,
  `soundPreset: NotificationSoundPreset`, `soundVolume: number` (0..1), `os: boolean`,
  `toast: boolean`, `pill: boolean`, `quietWhenFocused: boolean`,
  `position: TaskNotificationPosition`, `durationMs: number`,
  `events: { completed: boolean; failed: boolean; permission: boolean; subagentStalled: boolean }`.
- `NotificationSoundPreset = "pop" | "ping" | "chime" | "marimba"` (default `pop`).
- Sound modules: `notificationSoundPreset.ts` (pure vocabulary + `resolveNotificationSoundSource`),
  `notificationSoundCatalog.ts` (`notificationSoundPresetSource` → bundled asset),
  `notificationSoundCustom.ts` (`read/persist/clearCustomNotificationSound`,
  `isSupportedNotificationSoundFile`, `MAX_CUSTOM_NOTIFICATION_SOUND_BYTES`),
  `taskNotificationSound.ts` (`playTaskNotificationSound`, `previewTaskNotificationSound`).
- Accessors: `readTaskNotificationPreferences()`, `persistTaskNotificationPreferences(record)`,
  and the retained `isTaskNotificationEnabled()` / `isTaskNotificationSoundEnabled()` (now derived
  from the record) so existing consumers keep working without a second source of truth.
- Store: `notificationPreferences` + `setNotificationPreferences(patch)`; the field is in the
  broadcast allowlist.
- The pill presentation schema has optional `position` and `durationMs`; when absent Main keeps
  top-center placement and an 8000 ms status auto-dismiss. Permission/question pills do not auto-dismiss.

### Defaults and normalization

Current [`taskNotificationPreferences.ts`](../../packages/ui/src/lib/taskNotificationPreferences.ts)
defaults are: master, sound, OS, toast, pill, and all four events enabled; `quietWhenFocused: false`;
`position: "top-center"`; `durationMs: 5000`; `soundPreset: "pop"`; `soundVolume: 0.7`.
[`NotificationsSection.tsx`](../../packages/ui/src/settings/NotificationsSection.tsx) offers duration
choices of 3, 5, 8, and 12 seconds. The stored record is not restricted to those picker choices:
finite durations are rounded to integer milliseconds and clamped to 1000–60000 ms; nonnumeric or
nonfinite input falls back to 5000 ms. Finite sound volume is clamped to 0–1 (without rounding),
otherwise it falls back to 0.7. Invalid positions and presets fall back to top-center and pop;
nonboolean fields and invalid/missing event values use their individual defaults.

### Current-source routing and gaps

Source review on 2026-10-12 confirms the terminal-event matrix in
[`taskNotificationRouting.ts`](../../packages/ui/src/lib/taskNotificationRouting.ts): master and
event gates first; focused delivery uses toast unless quiet; unfocused delivery uses independent
OS/pill switches. Its sound result follows toast while focused and OS while unfocused, not the pill
alone. The desktop focus guard can additionally suppress OS/pill delivery when another registered
app window is focused.

Passive interaction notifications in `usePendingInteractionTaskNotifications` (exported by
[`useTaskNotifications.ts`](../../packages/ui/src/hooks/useTaskNotifications.ts)) use the permission
OS/event gates and do not toast. The separate
[`use-notification-pill.ts`](../../packages/ui/src/hooks/use-notification-pill.ts) receives only the
master-enabled flag from `V4InteractionDialogs`, consistent with the interaction-pill exception.
It currently sends neither position nor duration: interaction pills remain top-center, rather than
following the position preference required by rule 6. Status pills do send both preferences.
This gap is not a change to the intended rule or proof of runtime behavior.

The dedicated Notifications and Sound branches exist in `SettingsPage.tsx`. Source presence,
normalization tests, and routing predicates do not prove actual focus transitions, cross-window
sync, overlay placement, or audible playback; those require runtime evidence.

## Acceptance scenarios

1. The user opens Settings → Notifications and sees the master switch, the per-channel switches
   (OS, in-app toast, desktop pill), "quiet when focused", the position picker, the duration picker,
   and the per-event toggles (completed, failed, permission, stalled subagent). The sound controls
   live in the separate **Sound** section (scenario 10).
2. With the app focused and everything enabled, a completed task shows an in-app toast at the
   configured position and dismisses after the configured duration.
3. With the app focused and "quiet when focused" on, a completed task shows nothing.
4. With the app unfocused, a completed task shows the pill (Windows) and the OS notification; the
   pill honors the configured position and duration.
5. Turning the master switch off delivers nothing on any channel. Turning only the toast channel off
   in a focused window delivers nothing while focused but still delivers the pill when unfocused.
6. Turning the "failed" event off suppresses failure notifications while completion notifications
   keep working.
7. A subagent stopped by the inactivity watchdog raises a stall notification under the
   `subagentStalled` toggle; with that event off it raises none.
8. Changing the position in one window changes it in every open window without a reload; no
   feedback loop (the store's broadcast guard prevents echo).
9. A profile that only has the legacy `-enabled` / `-sound-enabled` keys keeps its prior effective
   state after upgrade: a user who had disabled notifications still has them disabled.
10. Settings → Sound lets the user enable/disable the notification sound, pick a preset, adjust the
    volume, and upload a custom audio file. **Preview** plays the current sound even while the sound
    or notifications are switched off. The chosen volume and sound apply on the next delivered
    notification; with the sound off, or notifications off, delivered notifications are silent; a
    custom file that is too large or not audio is rejected with a message.

## Out of scope

- Delivery is not moved into `setting.json` / the zod app-settings schema; the record stays a
  renderer `localStorage` preference (the current model) with cross-window broadcast.
- No notification center / history / inbox.
- The desktop pill remains Windows-only; on other platforms the position/duration preference applies
  to the in-app toast only.
- Elicitation and workspace-hook-review notifications keep their current special handling; only the
  listed events gain toggles.
- Custom sounds are stored as a data URL in `localStorage` (bounded at 1.5 MB) rather than as an
  app-managed file; the picker uses the standard browser file input, so no new platform API is added.

## Verification

Source invariants and unit tests: the preference module is pure and covered by a unit test for
defaults, normalization, migration from legacy keys, the derived accessors, and the sound preset and
volume normalization; the store sync path is covered by a second-instance test; the toast
position/duration defaults and the pill geometry are covered by focused tests; the routing predicate
(focus → toast, unfocused → pill/OS, quiet-when-focused, per-channel and per-event gates) is covered
by a pure-function test; the sound preset vocabulary and source resolution are covered by a pure test;
the custom-sound owner (round-trip, clear, non-data-URL rejection, file support) is covered by a unit
test. Static checks (`pnpm typecheck`, `pnpm lint`, `pnpm architecture:check --changed`) must pass.
Runtime behavior in a running desktop window, the pill overlay, and real audio playback are not
implied by these checks and require an independent end-to-end check.
