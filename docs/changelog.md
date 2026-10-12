# Mesa Code changelog

**Status:** active history  
**Owner:** project maintainers and coding agents  
**Scope:** append-only work history for this workspace  
**Updated:** 2026-10-12 10:09 (local time)

Entries are reverse chronological. Timestamps use local workspace time. This file records events; active source remains authoritative.

## 2026-10-12 10:09 (local time) — Correct theme-catalog and LAN-runbook claims

Documentation-only corrections from an independent review. No product behavior or code changed.

- **Theme catalog.** `docs/theme-catalog.md` no longer claims all foreground text stays opaque under
  the Liquid transparency slider — `--color-foreground-subtlest` is itself translucent in source — and
  no longer says the web shell "tint-blurs" the backdrop; `backdrop-filter` runs only on floating
  overlays and the mobile drawer.
- **LAN runbook.** `docs/quiet-studio/setup-and-windows-build.md` now separates local Vite development
  (`pnpm dev:web`, bound to `127.0.0.1:5174`) from the `pnpm dev:server` static-server path used to
  reach the app from another device.

See [`verification-log.md`](verification-log.md) for the checks and limitations of this pass.

## 2026-10-12 08:31 (local time) — Refresh active documentation and correct completion claims

Refreshed documentation routing, active specification metadata, setup guidance, and source/evidence
boundaries. Historical entries remain unchanged; this entry qualifies earlier completion claims.
The pass covers root documentation and active documents under `docs/`; agent skills, archived
contracts, generated material, and third-party/legal documents are not redesign targets.

- **Settings is partially implemented.** The three-group navigation and dedicated Notifications,
  Sound, and desktop-only Network sections exist. The Settings restructure contract is not fully
  satisfied: General still renders migration and data-directory controls and rows intended for
  removal; Data Location has a navigation entry without a content branch. These are documented
  implementation gaps, not product-rule changes or fixes.
- **Chat-switch correction.** The 07:13 entry overstates the integration result. The projection hook
  can reject a mismatched expected session, but `SessionPane` currently passes
  `lease?.sessionId ?? sessionId`, which matches any existing lease's own session. That call cannot
  establish the intended stale-lease rejection. Other readiness/timeline guards remain present;
  complete visual resolution has not been demonstrated. No code is changed in this pass.
- **General crash remains unresolved.** The reported `1 is not a function` error has no confirmed
  runtime cause. Typechecking, handler declarations, and literal searches neither reproduce nor
  exclude it. The preceding conversation's attribution to stale builds/HMR was speculation, not
  a diagnosis.
- **Evidence stays scoped.** Liquid theme source, notification preferences, and the separate
  AskUserQuestion answer panel are described separately from real-app visual, remote, and installer
  verification. Older packaging evidence does not prove that later working-tree changes shipped.

See [`verification-log.md`](verification-log.md) for the checks and limitations of this pass.

## 2026-10-12 07:13 (local time) — Stop the stale-session flash when switching chats

Switching between chats no longer paints the previous session under the new task's header for a frame
before settling — the "chat shows the old one, scroll jumps, editor flashes, side panels collapse
themselves for ~1 s, then it is correct" glitch.

- **Cause.** The pane acquires its per-session lease in a passive effect (`SessionPane.tsx:2408`). On
  the commit where the new `sessionId` is already set, the lease still belongs to the previous
  session, and `useConversationProjection` happily read that store — handing the OLD session's
  snapshot (rows, interactions, composer, docks, plan panels) to a pane already rendering the new
  task. Everything snapshot-derived briefly showed session A under session B's header, then corrected
  once the matching lease arrived. The scroll path additionally cleared its height cache and
  re-measured on the same transition, and the composer flickered as its disabled flag reset.
- **Fix.** `useConversationProjection` is now the single owner of a stale-lease guard: when the pane
  passes the session it is rendering and the lease does not match it, the hook returns the closed
  projection (`snapshot` null) instead of the old session's state. `SessionPane` gates with
  `lease?.sessionId ?? sessionId` (which always matches a set lease and only cuts the null-lease
  transition frame, so draft/prewarm panes are unaffected), widens `sessionLeaseReady` so it is also
  false while the lease has not caught up, and includes it in the composer-disabled flag so the editor
  stays disabled for the whole switch.
- **Behavior preserved.** No remount, no new state owner, cache, timer, or network path. The timeline
  keeps its existing empty-then-populate behavior during the transition; draft and prewarm projections
  are not suppressed; a returned-to chat with a live/keep-warm lease shows its own snapshot.
- **Files.** `packages/ui/src/v4/useConversationProjection.ts` (+ a focused
  `useConversationProjection.test.ts`), `packages/ui/src/v4/SessionPane.tsx`.
- **Docs.** [`docs/specs/quiet-studio.md`](specs/quiet-studio.md) new "Chat switch projection guard"
  section.

## 2026-10-12 00:48 (local time) — Answer AskUserQuestion from a separate pill answer panel

A minimized-window **Question pill** (a userInput / AskUserQuestion request) now shows **Show
answer** beside **Open app**. Pressing it opens a separate, larger **answer panel** window below
the pill — never merged into the compact pill — listing each question and its fixed options; picking
option(s) and submitting resolves the pending interaction without restoring the app.

- **New surface, additive protocol.** `notificationPillPresentationSchema` gains an optional
  `answerPrompt` (bounded: ≤4 questions, ≤4 options each, 2..4 per question, no free-text) and the
  pill action schema gains `reveal` plus optional `answers`. A presentation without `answerPrompt`
  is unchanged, so an older renderer keeps Open-only behavior.
- **Same answer path.** The panel relays through the existing V4 `resolveInteraction` command and
  `pendingCommandRegistry`; the owning renderer re-validates live identity, request, revision and
  every `{question, value}` against the live pending questions, then submits the same content shape
  the in-app `ElicitationDialog` builds (`answers` map + `answer_${index}` + legacy `answer`), so the
  agent cannot tell which surface answered.
- **Honest gating.** The panel renders fixed options only and never collects the dialog's free-text
  "Other" answer. A question with a rich preview, more than four questions, or an option count
  outside two to four keeps the pill Open-only (no Show answer).
- **Single owner.** `notification-pill-overlay.ts` still owns the presentation; it creates the panel
  window lazily, positions it under the pill (clamped to the sender work area, flipping above on
  bottom overflow), and clears both windows together on app focus / source reload / resolve.
- **Files.** `packages/shared/src/notification-pill.ts`, `packages/ui/src/lib/notification-pill.ts`
  (+ tests), `packages/ui/src/hooks/use-notification-pill.ts`,
  `packages/ui/src/v4/V4InteractionDialogs.tsx`, `packages/ui/src/v4/interactionAutoResolutionIntentTracker.ts`
  (the pure tracker extracted so the dialog file stays within the max-lines limit),
  `packages/ui/src/i18n/locales/en-US.ts`, `packages/desktop/src/main/notification-pill-overlay.ts`
  (+ tests), `packages/desktop/src/main/index.ts`, `packages/desktop/vite.config.ts`,
  `packages/desktop/src/preload/notification-pill.ts`, `packages/desktop/src/renderer/notification-pill-answers.html`,
  `packages/desktop/src/renderer/src/notification-pill-answers.ts`,
  `scripts/notification-pill-e2e.mjs`, `scripts/notification-pill-answer-panel-e2e.mjs`.
- **Docs.** [`docs/specs/notification-pill-overlay.md`](specs/notification-pill-overlay.md) rules,
  owner diagram and acceptance scenarios 16–18 (scenario 6 narrowed to non-answerable input).

## 2026-10-11 23:54 (local time) — Answer permission requests straight from the desktop pill

A minimized-window permission pill now shows **Allow once / Deny** beside **Open app** for ordinary
permission requests, including the risk-gate confirmations ("High risk tools require explicit
approval") that previously fell back to Open-only.

- **Cause.** `notificationPillOptions` (`packages/ui/src/lib/notification-pill.ts`) forced Open-only
  whenever the request carried `detail` (the tool input — always present in V4) or `freeText` (which
  V4 sets true for every permission). Every real permission therefore produced `[]` options, so the
  pill only ever had Open app.
- **Fix.** A pill answer submits the option's own decision (allow once / deny) and never forwards
  edited input or free-text feedback, so `detail`/`freeText` no longer block the answer buttons. The
  gate keeps blocking what the pill cannot honestly present: a rich `display` preview, an
  empty/whitespace summary, a summary long enough to truncate in the single-line body, and ambiguous
  options (fewer than two, same-kind, duplicate ids, or an option carrying its own `modifiedInput` /
  permission-update side effects). The full review stays one Open app away.
- **Behavior preserved.** Only `allowOnce` and `deny` are ever exposed; the always-allow /
  project-allow / session-allow option is still omitted, so the pill never grants standing
  permission. The same resolveInteraction command path, identity/option revalidation, busy
  serialization, and rendered-summary overflow gate are unchanged.
- **Docs.** [`docs/specs/notification-pill-overlay.md`](specs/notification-pill-overlay.md) rule and
  a new acceptance scenario 15.

## 2026-10-11 23:45 (local time) — Sound settings section (enable, preset, volume, custom upload)

Added a dedicated **Sound** Settings section for the task-notification sound, separate from
Notifications.

- **New section.** `lib/settingsNavigation.ts` gains the `sound` section id; `settingsPageConfig.ts`
  lists it after Notifications (General group, `Volume2` icon); `settings/SoundSection.tsx` renders
  enable, preset, volume, preview, and custom-upload rows. The sound row was removed from
  Notifications.
- **Preference record.** `taskNotificationPreferences.ts` gains `soundPreset` (default `pop`) and
  `soundVolume` (0..1, default 0.7), with normalization/clamping; the master switch still gates the
  effective sound (`isTaskNotificationSoundEnabled` = enabled && sound).
- **Presets.** Four bundled sounds: `pop` (existing), plus generated `ping`, `chime`, `marimba`
  (PCM WAV). Asset-free vocabulary/source logic lives in `lib/notificationSoundPreset.ts`; the
  asset map lives in `lib/notificationSoundCatalog.ts` so the preference record stays importable
  under the test runner.
- **Custom upload.** `lib/notificationSoundCustom.ts` owns a user-uploaded sound as a data URL under
  its own `localStorage` keys (capped 1.5 MB; audio type checked by MIME or extension), overriding
  the preset at play time. Kept out of the broadcast record so a large blob never travels the
  cross-window channel; same-origin windows share it and a change event keeps the view in sync.
- **Player.** `taskNotificationSound.ts` resolves preset/custom source, applies the configured
  volume, and adds `previewTaskNotificationSound()` (plays regardless of the enable switch, for the
  Preview button).
- **Cleanup.** Removed the now-unused `settings.notification*` / `settings.notifications.sound*`
  i18n keys and the dead `toggle_notification*` telemetry catalog actions; added the
  `settings.sound.*` keys (en/zh) and the `*.wav` asset module declaration.

Spec: [`docs/specs/notification-settings.md`](specs/notification-settings.md) (rule 9, scenario 10);
[`docs/specs/settings-restructure.md`](specs/settings-restructure.md).

## 2026-10-11 23:10 (local time) — Notification preferences, channel routing, and settings section

Turned task notifications from two untyped `localStorage` booleans with no UI into a typed,
configurable, cross-window feature, and fixed the case where a focused window received nothing.

- **One owner, one record.** `packages/ui/src/lib/taskNotificationPreferences.ts` now owns a single
  JSON record (`mesa-code-notification-preferences`): `enabled`, `sound`, per-channel `os`/`toast`/`pill`,
  `quietWhenFocused`, `position`, `durationMs`, and per-event `events.{completed,failed,permission,subagentStalled}`.
  It migrates the legacy `-enabled` / `-sound-enabled` keys idempotently (seeded once, legacy keys left in place),
  so an existing installation keeps its effective state.
- **Store + cross-window sync.** The Zustand store gained `notificationPreferences` /
  `setNotificationPreferences(patch)`; the field is in the broadcast allowlist, so a change in one
  window reaches the others under the existing feedback-loop guard.
- **Focus routing + settings.** New pure `decideTaskNotificationDelivery` routes terminal and subagent
  events: focused → in-app toast (honoring position/duration), unfocused → OS + pill; `quietWhenFocused`
  is an automatic do-not-disturb; each channel and each event is independently switchable. A new
  **Notifications** Settings section (with the position and duration pickers) replaces the two old
  General rows.
- **Subagent stall is a first-class event.** `useSubagentTaskNotifications` observes the conversation
  snapshot's subagent rows, and a row reaching a non-success terminal state (failed, or cancelled by
  the user / the inactivity watchdog) raises a `subagent_stalled` notification under the same routing
  rules. The payload status is additive; the desktop dedupe now keys on `requestId` when present so
  two stalled subagents of one session are not collapsed.
- **Pill position/duration.** `notification-pill.ts` gains optional `position` / `durationMs`; the
  overlay's `notificationPillBounds` anchors at the configured position and auto-dismiss uses the
  configured duration, both defaulting to the legacy top-center / 8000 ms when absent.

Specs: [`docs/specs/notification-settings.md`](specs/notification-settings.md) (new),
[`docs/specs/notification-pill-overlay.md`](specs/notification-pill-overlay.md),
[`docs/specs/settings-restructure.md`](specs/settings-restructure.md).

## 2026-10-11 21:45 (local time) — Windows x64 installer rebuilt as 1.0.2

- **Category:** packaging (Windows desktop installer, version bump)
- **Scope:** requested a 1.0.2 installer that carries the subagent stall-detection fix. `pnpm bundle:desktop` does not change the version, so bumped first and rebuilt.
- **Change:** `package.json` (root): version `1.0.1` → `1.0.2` via `node scripts/bump-desktop-version.mjs` (the capped patch step).
- **Command:** `MESA_CODE_SKIP_REMOTE_ASSETS=1 pnpm bundle:desktop -- --os win --arch x64` (full prepare — deliberately **not** `--skip-prepare`, so `prepare:agent-bundle` rebuilt the packaged agent `mesa-code.cjs`).
- **Result:**
  - Build exited `0`. Artifact `packages/desktop/dist/MesaCode-1.0.2-win-x64.exe` — 153.4 MiB (under the 500 MiB limit); `VersionInfo` Product `Mesa Code`, `FileVersion`/`ProductVersion` **1.0.2**; `NotSigned` (no signing credentials; expected).
  - The packaged agent `resources/glm/mesa-code.cjs` (staged 21:38) contains the subagent inactivity watchdog fix (`Subagent was inactive for …` / `subagent.activity_timeout`), so the installer ships the bounded 120s watchdog on both the foreground and background child paths.
  - `latest.yml` names `version: 1.0.2` / `path: MesaCode-1.0.2-win-x64.exe`; the earlier `1.0.0` and `1.0.1` installers remain in `dist/`.
- **Note:** the installer was built and its metadata inspected; it was not installed or launched here, and it is unsigned.

## 2026-10-11 21:15 (local time) — Subagent stall detection

Root-caused the "subagent stuck, did nothing for 6+ minutes" report against runtime evidence: a
`general-purpose` child finished `Skill` normally, then its **next model request produced no
stream bytes at all** until the parent turn was cancelled (a silent provider stall). The child
inactivity watchdog could never fire first because it defaulted to the same
`DEFAULT_MODEL_STREAM_IDLE_TIMEOUT_MS` (600s) as the model-stream idle timeout, and the desktop
never overrode it. Two changes:

- Added `DEFAULT_SUBAGENT_INACTIVITY_TIMEOUT_MS` (120s) and wired it as the subagent watchdog
  default (core runner + bootstrap runtime config), so it is independently bounded strictly below
  the model-stream idle timeout and fires first on a silent child. Activity includes streamed
  deltas and tool-progress events, so healthy long work is never killed.
- Extended the same watchdog to the **background** subagent path, which previously had none; a
  silent background child now fails (`SubagentStopped status=failed`) instead of staying
  `running` forever (the permanently-running orphan report).

Spec: [`docs/specs/subagent-stall-detection.md`](specs/subagent-stall-detection.md).

## 2026-10-11 14:20 (local time) — Web phone: reconnect after backgrounding + inline image previews

- **Category:** Web/LAN client (transport recovery) + Conversation rendering (image previews)
- **Scope:** (1) the phone web client went dead after lock screen / backgrounding and needed a full reload; (2) generated images showed only as a path in the response. Also corrected the AGENTS.md working-boundary line to be checkout-relative.
- **Changed:**
  - `packages/client/src/websocket.ts`: extracted `createWebSocketServiceAccess(socket, onEnd)`; an established socket that ends now `ChannelClient.dispose()`s (fail-closed: rejects in-flight and queued RPCs) and reports `onEnd`. Added `WebSocketConnectionOptions.onEnd`.
  - `packages/web/src/main.tsx`: replaced the single-shot bootstrap with a reconnect controller that holds the accessor + a generation counter, mounts the app via `renderWebApp`, and reconnects on `visibilitychange` (→ visible), `pageshow` (incl. `persisted`), and `online`; reconnect is guarded against double connections and stale end-events.
  - `packages/shared/src/media-preview.ts`: added `IMAGE_PREVIEW_FORMATS` / `getImagePreviewFormat`.
  - `packages/shared/src/conversation-preview-artifacts.ts`: added the `image` preview kind + type registration and image extensions to the path regexes.
  - `packages/ui/src/lib/assistantFileReferences.ts`: added the `image` kind, type table entry, subtitle id, and image extensions to the regexes.
  - `packages/ui/src/AssistantPreviewCards.tsx`: an image card now renders an inline thumbnail (`fileService.readMediaPreview` → data URL) that opens the full-size `ImagePreviewDialog`; works on desktop and phone.
  - `packages/ui/src/i18n/locales/en-US.ts`, `zh-CN.ts`: `chat.previewCards.image` ("Image" / "图片").
  - `packages/shared/src/markdown-artifact-images.ts`: fixed the decoder to accept `mesa-code-artifact://` (the produced scheme), not only the camelCase form.
  - `AGENTS.md`: the working-boundary rule is now the checkout containing the file, not a hard-coded path.
  - Specs: `docs/specs/web-remote-reconnect.md` (new), `docs/specs/conversation-image-previews.md` (new), `docs/specs/README.md` routing.
- **Result:** the phone client reconnects automatically after lock screen / background / BFCache and keeps the same Host/session; a dropped transport fails RPCs fast instead of hanging; generated images appear as inline thumbnails in the response.
- **Verification:** see the 14:20 [`verification-log.md`](verification-log.md) entry. `pnpm typecheck` passed; `pnpm lint` exit 0 with the same 6 pre-existing warnings; architecture check 0 violations; three focused tests passed (2 client + 1 shared + 1 ui suite).
- **Blocked / Not run:** the reconnect on a real phone, and the rendered thumbnail in the running app, were **not** viewed; only source checks and the focused tests were run.

## 2026-10-11 13:32 (local time) — Liquid theme: back to standard native-material glass

- **Category:** UI / Appearance (Liquid theme correction)
- **Scope:** a self-contained "in-window wallpaper" pass was tried to make the glass survive OS focus loss; it made the theme no longer see-through and diluted the transparency slider (100% read as ~20%). Reverted to the standard macOS/iOS liquid glass: translucent surfaces over the real native window material, no wallpaper.
- **Changed:**
  - `packages/ui/src/styles.css` `.theme-liquid`: removed `--mesa-code-liquid-wallpaper`; restored the token comment to describe native `vibrancy`/`acrylic` as the backdrop.
  - `packages/ui/src/quiet-studio.css`: removed the frame wallpaper rule, the frame content-child `backdrop-filter`, and the `[data-workspace-shell] { background: transparent }` override; restored the stacked-surface frost (overlays + mobile drawer) and the web ambient backdrop.
  - Docs (`docs/specs/liquid-theme.md`, `docs/theme-catalog.md`): reverted the self-contained-glass / focus-independence language back to native window material; acceptance scenario 9 again covers the 0-100 see-through range instead of focus behaviour.
- **Result:** Liquid is again translucent surfaces over the native window material. The transparency slider now maps directly to the token opacity, so 100% genuinely reads through to the desktop and 0% is opaque; there is no wallpaper layer to dilute it. macOS/Windows/Linux keep their native see-through (macOS `vibrancy`, Windows `acrylic`, Linux transparent window); Web keeps its ambient glow backdrop.
- **Verification:** see the 13:32 [`verification-log.md`](verification-log.md) entry. `pnpm typecheck` passed; `pnpm lint` exit 0 with the same 6 pre-existing warnings in untouched files; architecture check 0 violations; both focused tests passed.
- **Blocked / Not run:** the running-app glass appearance and the defocused-window appearance were **not** viewed; only static source checks were re-run.

## 2026-10-11 11:52 (local time) — Liquid glass transparency slider

- **Category:** UI / Appearance (Liquid theme preference)
- **Scope:** added a "Glass transparency" slider, shown only while the Liquid theme is active, so the glass strength is user-adjustable and persists.
- **Changed:**
  - `packages/ui/src/lib/liquidTransparency.ts` (new): storage key `mesa-code-liquid-transparency`, `normalizeLiquidTransparency` (clamps to 0-100, default 55), `loadLiquidTransparency`, `writeLiquidTransparency`, and `applyLiquidTransparency` which sets the root `--liquid-opacity` to `100 - value`.
  - `packages/ui/src/styles.css` `.theme-liquid`: every surface token now mixes a colour with `var(--liquid-opacity, 45%)` instead of a hard-coded percentage; text-bearing layers (card/surface/input/popover/menu/toast) add a fixed offset and overlays are capped with `min(90%, ...)` so they never go fully opaque; borders/hover derive from the variable too.
  - `packages/ui/src/store/appearanceState.ts`: new `liquidTransparency` field + setter + `APPEARANCE_BROADCAST_FIELDS` membership. `packages/ui/src/store/index.ts`: cross-window setter override, broadcast receive branch, and startup `applyLiquidTransparency`.
  - `packages/ui/src/settingsCodePreview.tsx`: a native `type="range"` slider in a `SettingsRow`, gated on `theme === "liquid"`, with a live percentage readout; props threaded from `packages/ui/src/SettingsPage.tsx` through `runUserAction` (`settings.appearance` / `change_liquid_transparency`).
  - `packages/ui/src/i18n/locales/en-US.ts`, `zh-CN.ts`: `settings.liquidTransparency` and `settings.liquidTransparencyDescription`.
  - `packages/ui/test/liquidTransparency.test.ts` (new): clamp/default coverage.
  - Docs: `docs/specs/liquid-theme.md`, `docs/theme-catalog.md`, `docs/specs/quiet-studio.md`, `DESIGN.md` describe the slider and the single-variable mechanism.
- **Mechanism note:** the `color-mix(in oklab, <colour> <calc over var>, transparent)` + `min()` cap was verified to compute in Chromium (Edge) before wiring the slider, because a malformed `color-mix` renders the surface transparent rather than erroring.
- **Result:** with Liquid active, the slider changes every Liquid surface together; the value is stored, broadcast, and restored on startup. It is inert (not shown) for other themes. No new store, protocol, or non-appearance persistence was introduced.
- **Verification:** see the 11:52 [`verification-log.md`](verification-log.md) entry. `pnpm typecheck` passed; `pnpm lint` exit 0 with 6 pre-existing warnings in untouched files; architecture check 0 violations; both focused tests passed.
- **Blocked / Not run:** the slider's live in-app effect and the running-app glass appearance were **not** viewed; the mechanism is verified in a browser engine only.

## 2026-10-11 11:47 (local time) — Liquid theme revision: real liquid glass

- **Category:** UI / Appearance (visual revision of the Liquid theme)
- **Scope:** the first Liquid pass sat at 66-92% colour, so it read as a flat extra dark theme close to Midnight, not as transparent glass. Made the surfaces strongly translucent and added an edge highlight and a web backdrop so the translucency actually shows.
- **Changed:**
  - `packages/ui/src/styles.css` `.theme-liquid`: background-family tokens dropped to roughly 30-50% colour (`background` ~32%, `sidebar`/`header`/`panel` ~40%, `card`/`surface` ~46-48%, `popover`/`menu` ~66%); borders switched to near-opaque white-tinted glass edges (`color-mix(... #b6c8d3 26%, transparent)`); terminal bg ~70%. Glass hooks raised to `--mesa-code-glass-blur: 44px` / `--mesa-code-glass-saturate: 2`.
  - `packages/ui/src/quiet-studio.css`: floating overlays now also carry a hairline top highlight + soft drop shadow for a polished glass edge; the web rule changed from a flat dark subsurface to a colorful layered ambient backdrop (radial glows over a deep base) so the translucent shell tints it and overlays frost something varied.
  - Docs resynced to the stronger-transparency design: `docs/specs/liquid-theme.md`, `docs/theme-catalog.md`, `docs/specs/quiet-studio.md`, `DESIGN.md`.
- **Result:** Liquid now reads as translucent glass over a visible backdrop instead of a darker flat theme; accent independence, persistence, and the no-store/no-protocol boundary are unchanged.
- **Verification:** see the 11:47 [`verification-log.md`](verification-log.md) entry. `pnpm typecheck` passed, `pnpm lint` exit 0 (0 errors, 10 pre-existing warnings in untouched files), architecture check 0 violations, focused theme test passed.
- **Blocked / Not run:** the running-app visual result on macOS/Windows, Linux, and web was **not** captured; transparency and the web ambient backdrop are claims from source only.

## 2026-10-11 11:41 (local time) — Fix `destroy is not a function` when the Network settings section unmounts

- **Category:** bug fix (desktop host + UI, RPC event contract)
- **Scope:** opening **Settings → Network** and leaving it threw `TypeError: destroy is not a function` (caught by `[ScopedErrorBoundary:workspace-settings-layer]`), twice — once while the layer mounted and once when it unmounted. Root cause: `INetworkAccessService.onStateChanged` / `onInstallStateChanged` were declared as `(listener) => () => void` methods, but the renderer reaches the service through `ProxyChannel.toService`, where any `on*` member is an RPC **event** — so `service.onStateChanged(applyState)` _subscribes_ and returns an `IDisposable` object. `NetworkSection` returned that object as the React effect cleanup, so React called the object as a function and threw.
- **Changed:**
  - `packages/services/src/network-access/networkAccess.ts`: `onStateChanged` / `onInstallStateChanged` are now `Event<NetworkAccessState>` / `Event<TailscaleInstallState>` (the same shape as `IBroadcastService.onMessage`), with a comment recording the RPC reason. Added `import type { Event } from "@mesa-code/rpc"`.
  - `packages/desktop/src/host/networkAccessService.ts`: the two listener `Set`s became `Emitter`s exposed as `onStateChanged: stateEmitter.event` / `onInstallStateChanged: installEmitter.event`; `emit`/`emitInstall` call `emitter.fire(...)`. (`Emitter.fire` isolates a throwing subscriber, preserving the old try/catch-isolation behavior.)
  - `packages/ui/src/settings/NetworkSection.tsx`: both effects capture `const subscription = service.onX(...)` and return `() => subscription.dispose()` (the established RPC-subscription pattern), never the raw subscription.
  - `docs/specs/local-network-access.md`: interface block, events paragraph, product rule 13, acceptance scenario 12, and the owner/interface note updated to the `Event` contract.
- **Result:** the events follow the channel contract; the Settings layer mounts and unmounts with no React cleanup error, and the state/install subscriptions still start and stop correctly.
- **Verification:** see the 11:41 [`verification-log.md`](verification-log.md) entry. `pnpm typecheck` passed, `pnpm lint` exit 0 (0 errors; all warnings pre-existing), architecture check 0 violations, the full `packages/ui/test` suite passed 113/113, and the host `networkAccessService.test.ts` passed 10/10.
- **Blocked / Not run:** the running desktop app was **not** re-driven to re-observe the error's absence after the fix; the fix is proven by source contract, the passing host test, and the passing UI suite only.

## 2026-10-11 11:32 (local time) — Liquid theme (first pass; superseded on glass intensity)

- **Category:** UI / Appearance (eleventh theme)
- **Scope:** added `liquid`, a translucent dark theme that lets macOS vibrancy and Windows acrylic read through, with renderer frost scoped to floating overlays.
- **Changed:**
  - `packages/ui/src/useTheme.ts`: `liquid` added to `Theme` and `CATALOGUE_DARK_THEMES` (class toggle + `resolveTheme`/`isTheme` then apply with no new branch).
  - `packages/ui/src/settings/settingsPageConfig.ts`: `{ mode: "liquid", icon: Droplet }` added to `THEME_MODES`.
  - `packages/ui/src/i18n/locales/en-US.ts`, `zh-CN.ts`: `settings.themeMode.liquid` (`Liquid` / `液态玻璃`).
  - `packages/ui/src/styles.css`: new `.theme-liquid` block — background-family tokens translucent via `color-mix(..., transparent)`, foreground/border/semantic/git tokens opaque; glass hooks `--mesa-code-glass-blur` / `--mesa-code-glass-saturate`.
  - `packages/ui/src/quiet-studio.css`: `.theme-liquid` frost on floating overlays (menus, popovers, dialogs, tooltips) and the mobile web drawer; web-only dark subsurface `html.theme-liquid[data-mesa-code-web]`. No animation added.
  - `packages/web/src/webThemeSeed.ts`: `liquid` added to the web theme-seed union and catalogue list (web seed had a separate union that otherwise type-errored).
  - `scripts/quiet-studio-composer-e2e.mjs`: `["liquid", "Liquid"]` added to the theme sweep.
  - `packages/ui/test/theme-catalog.test.ts`: expected count 10 → 11; new `liquid` validator test.
  - Docs: new `docs/specs/liquid-theme.md`; updated `docs/specs/quiet-studio.md`, `docs/theme-catalog.md`, `docs/specs/theme-set-reduction.md`, `docs/specs/README.md`, `DESIGN.md`.
- **Result:** Liquid is selectable in Appearance, persists under `mesa-code-theme`, resolves to dark, and keeps the independent accent. No store, protocol, or persistence key was added.
- **Verification:** see [`verification-log.md`](verification-log.md). Source checks (typecheck, lint, architecture, focused test) passed; the appearance was **not** viewed at runtime. The 66-92% token opacity in this pass read as a flat dark theme; superseded by the 11:47 revision.
- **Blocked / Not run:** the running-app visual result and the full `quiet-studio-composer-e2e.mjs` sweep were not executed. The Windows path (`transparent` + `backgroundMaterial: acrylic` with translucent renderer surfaces) is a runtime claim only.

## 2026-10-11 07:50 (local time) — Windows x64 installer rebuilt as 1.0.1

- **Category:** packaging (Windows desktop installer, version bump)
- **Scope:** requested a 1.0.1 installer. `pnpm bundle:desktop` does not change the version, so bumped first and rebuilt.
- **Changed:**
  - `package.json` (root): version `1.0.0` → `1.0.1` via `node scripts/bump-desktop-version.mjs` (the capped patch step). The root version drives `appVersion` in `packages/desktop/out/metadata/build-meta.json` and the artifact name `MesaCode-${version}-win-${arch}.exe`.
  - No product/web source change: this is a version bump plus a rebuild.
- **Command:** `MESA_CODE_SKIP_REMOTE_ASSETS=1 pnpm bundle:desktop -- --os win --arch x64 --skip-prepare` (`--skip-prepare` reuses the already-prepared runtime assets; the workspace `build` still ran, so `prepare:build-meta` re-baked `appVersion` `1.0.1` and the web CSS was rebuilt from source).
- **Result:**
  - Build exited `0`. `build-meta.json` written with `appVersion` **1.0.1** before packaging; the packaged app is 1.0.1.
  - Artifact: `packages/desktop/dist/MesaCode-1.0.1-win-x64.exe` — 153.4 MiB, `PE32 … Nullsoft Installer self-extracting archive`; `VersionInfo` Product `Mesa Code`, `FileVersion`/`ProductVersion` **1.0.1**. Size audit 153.4 MiB vs 500 MiB limit.
  - Signature: `NotSigned` (no signing credentials; expected) — unsigned local installer.
  - The 1.0.1 installer still packages the phone-toolbar fix: `resources/web/index.html` has `data-mesa-code-web` and `resources/web/assets/index-2zhODoB2.css` has the phone composer-row rule.
  - `latest.yml` now names `version: 1.0.1` / `path: MesaCode-1.0.1-win-x64.exe`. The earlier `MesaCode-1.0.0-win-x64.exe` and a stale `1.0.1` blockmap were left in `dist/`.
- **Verification:** see [`verification-log.md`](verification-log.md). Install, launch, and uninstall were not driven.
- **Blocked / Not run:** the `.exe` was **not** installed or launched; no signature. Artifact existence, format, product/version metadata, packed web bundle, and the size audit are the only claims.

## 2026-10-11 07:27 (local time) — Windows x64 installer built (unsigned local)

- **Category:** packaging (Windows desktop installer)
- **Scope:** built the Windows x64 NSIS installer on this machine with the documented command. No source change; this records a packaging run and its artifact.
- **Command:** `MESA_CODE_SKIP_REMOTE_ASSETS=1 pnpm bundle:desktop -- --os win --arch x64` (runbook: [`docs/quiet-studio/setup-and-windows-build.md`](quiet-studio/setup-and-windows-build.md)).
- **Result:**
  - Build exited `0`. Chain ran: `prepare:runtime-assets` → workspace `build` → `bundle:ensure-tools` → electron-builder → `verify-runtime-dependencies` → `audit-bundle-size`.
  - Artifact: `packages/desktop/dist/MesaCode-1.0.0-win-x64.exe` — 153.4 MiB, `PE32 … Nullsoft Installer self-extracting archive`, product **Mesa Code**, `FileVersion`/`ProductVersion` 1.0.0. Bundle-size audit: 153.4 MiB vs 500 MiB limit.
  - Signature: `Get-AuthenticodeSignature` → **NotSigned** (no signing credentials provisioned; expected per the runbook — treat as an unsigned local installer, SmartScreen warnings possible).
  - The installer packages the current web client: `dist/win-unpacked/resources/web/index.html` carries the `data-mesa-code-web` marker and `resources/web/assets/index-2zhODoB2.css` carries the phone composer-row rule, so the binary includes the 2026-10-11 03:25 phone-toolbar fix.
- **Version note:** `pnpm bundle:desktop` does not change the version, so this rebuilt `1.0.0` and overwrote the previous `MesaCode-1.0.0-win-x64.exe`. To publish a newer version, run `pnpm build:installer` (bumps the root version first); a stale `MesaCode-1.0.1-win-x64.exe.blockmap` remains in `dist/` from an earlier attempt.
- **Environment note:** the runbook pins Node **24.14.0** (`mise.toml`); the build here ran on the PATH Node `v26.7.0` and completed, but that is off the documented pinned runtime.
- **Verification:** see [`verification-log.md`](verification-log.md). Install, launch, and uninstall were not driven from here.
- **Blocked / Not run:** the `.exe` was **not** installed or launched; signature is absent by design. Artifact existence, format, product metadata, packed web bundle, and the size audit are the only claims here.

## 2026-10-11 03:25 (local time) — Phone layout: one tidy composer toolbar row (long model names truncate)

- **Category:** feature (web phone layout) + composer presentation
- **Scope:** the composer's bottom row (context menu, project/Git chips, mode/CUA entries, model chip, reasoning control, Send) read as two untidy lines on a phone, and a very long provider/model name (`provider/model` from a custom provider) dominated or collapsed the row. Made it one tidy, non-wrapping row on the phone, with the model chip bounded so a long name truncates; desktop is untouched.
- **Cause (verified in a real render):** `packages/ui/src/prompt-editor/ChatPromptEditor.tsx` gives the leading cluster `flex-1` and its project group `flex-wrap: wrap`; the `quiet-studio.css` override set `[data-composer-leading-actions] { flex: 1 1 20rem }`, a 20rem basis the leading cluster could not shrink below. The trailing cluster is `shrink-0`, so at phone width the flex algorithm wrapped them and the JS fitter (`useComposerToolbarFit`) then collapsed the model chip to its icon — two lines, name invisible.
- **Changed:**
  - `packages/web/index.html`: set the web-only document marker `data-mesa-code-web` on `<html>`. It is a pure web signal — the desktop renderer's `index.html` never sets it — so web-only CSS can be gated on `html[data-mesa-code-web]` without widening the desktop bundle with a second `isDesktop` prop/context.
  - `packages/ui/src/quiet-studio.css`: added a `@media (max-width: 767px)` block gated on that marker — the toolbar row is `nowrap`; only `[data-composer-leading-actions]` shrinks (`flex: 1 1 0`, `min-width: 0`); `[data-composer-leading-content]` and `[data-composer-project]` stay on one line; the project/branch chips (base `Button`s, `shrink-0`) may shrink to a small min-width and truncate; the model chip is bounded (`max-width: 8.5rem`) so a long name ellipsizes. The desktop renderer (no marker) keeps today's wrapping layout at every window width, including its 480px minimum.
  - `packages/ui/test/mobileComposerToolbar.test.ts` (new): asserts the one-line row rules and, crucially, that every phone composer rule requires the marker (a bare max-width query would reach a narrow desktop window) and that the marker is present in the web document and absent from the desktop document.
  - `docs/specs/quiet-studio-mobile-web-layout.md`: product rule 15 + acceptance scenario 14 + state-owner note (the marker and the CSS owner).
- **Result:** At phone width the composer's bottom row is a single line for a long provider/model name (`mirai/cbcn/deepseek-v4.1-flash`): no wrap, the project/branch chips and the model chip truncate instead of dominating. The model chip shows its truncated name once the composer reaches ~384px (e.g. a 440px phone); on a narrower phone it keeps its existing icon — the name appears exactly when there is room, and the row never wraps either way. On desktop nothing changes: removing the marker in the served page reverts the row to `wrap`/64px, exactly today's layout.
- **Verification:** `pnpm typecheck` (exit 0), `pnpm lint` (0 errors; the same six pre-existing warnings), `pnpm architecture:check --changed` (0 violations) passed. `@mesa-code/ui` tests 112/112 (including 3 new `mobileComposerToolbar` tests). The web bundle was rebuilt and `http://127.0.0.1:3351/` serves `index-DSsfLIMP.js` + `index-2zhODoB2.css` with the marker and the phone rule. A real render at 360–767px (headless Edge against the served bundle) confirms one row, no wrap, no horizontal overflow, no control spilling past the composer. See [`verification-log.md`](verification-log.md).
- **Blocked / Not run:** a physical phone and the desktop app window were not driven; the desktop-path claim rests on the served page reverting to `wrap`/64px when the marker is removed, plus the test asserting the desktop `index.html` never sets it.

## 2026-10-11 00:52 (local time) — Phone layout: reach the task-row menu (archive/delete/pin/rename) without a right-click

- **Category:** feature (web phone layout) + dual-input parity
- **Scope:** a touch screen has no right mouse button and fires no `contextmenu`, so the desktop right-click task menus were unreachable on a phone. Long-press cannot stand in for it: the grouped list makes each row a `dnd-kit` draggable with a 6px activation distance, so holding a row starts (or, with finger jitter, cancels) a drag instead of opening a menu. Added an explicit "…" per-row button, touch-only.
- **Changed:**
  - `packages/ui/src/TaskActionMenuContent.tsx`: exported `TaskActionMenuContentProps`; this body is now the single source of the task action set.
  - `packages/ui/src/useTaskActionMenuProps.ts` (new): builds the shared action props (pin/rename/archive/unread/move/open-in-file-manager/copy paths/feedback/split-pane) once, so the right-click and "…" menus cannot drift.
  - `packages/ui/src/TaskRowMoreMenu.tsx` (new): the "…" `DropdownMenu` shell (`TID_TASK_ROW_MORE_BUTTON`); renders its body only while open, so per-row task/log path resolution stays lazy.
  - `packages/ui/src/hooks/useIsTouchInput.ts` (new): touch-only signal (`(hover: none)`), defaulting off so desktop/SSR are unchanged.
  - `packages/ui/src/TaskListItem.tsx`: new `showMoreMenu` prop renders the "…" menu in the action group; `TaskListItemContextMenuContent` now delegates to `useTaskActionMenuProps`; added `TaskListItemMoreMenu`.
  - `packages/ui/src/TaskList.tsx`, `packages/ui/src/WorkspaceTimelineTasksSection.tsx`: pass `showMoreMenu={isTouchInput}` (project and timeline rows).
  - `packages/ui/src/workspace-grouped-tasks/task-context-menu-content.tsx`: extracted `GroupedTaskMenuBody` + primitive sets so the grouped (move-to-group / move-to-top) actions render through either `ContextMenu` or `DropdownMenu`; added `GroupedTaskDropdownMenuItems`.
  - `packages/ui/src/workspace-grouped-tasks/task-row.tsx`: grouped rows render the "…" menu on touch (excluded from the drag overlay).
  - `packages/shared/src/test-ids.ts`: `TID_TASK_ROW_MORE_BUTTON`. `packages/ui/test/taskRowMoreMenu.test.ts` (new): regression coverage.
  - `docs/specs/quiet-studio-mobile-web-layout.md`: product rule 14 + acceptance scenario 13.
- **Result:** On a phone every task row exposes its full action menu (in the grouped view also the group actions), matching the desktop right-click menu item for item; on a mouse/trackpad desktop no "…" button is rendered and the row DOM is unchanged (still right-click only).
- **Verification:** `pnpm typecheck` (exit 0), `pnpm lint` (0 errors; the same six pre-existing warnings), `pnpm architecture:check --changed` (0 violations) passed. `@mesa-code/ui` tests 109/109 (including 7 new `taskRowMoreMenu` tests) and `@mesa-code/shared` 10/10 passed. The web bundle was rebuilt and `http://127.0.0.1:3351/` now serves `index-DNsx2E1U.js`, whose chunk `src-D63uu9od.js` carries `task-row-more-button`. See [`verification-log.md`](verification-log.md).
- **Blocked / Not run:** a real phone render is still not automated; only source/test/bundle evidence is recorded here. The "…" button is additive (touch-only), so the desktop right-click path is unchanged.

## 2026-10-11 00:24 (local time) — Secure-context fallbacks: SHA-256 digest + clipboard guards (finish the non-secure LAN mirror)

- **Category:** bug fix (web client / non-secure context)
- **Scope:** close the remaining secure-context-only API gaps so the plain `http://<ip>:<port>` LAN / Tailscale mirror (the phone case) runs every reachable feature without throwing — the follow-up to the 00:02 `crypto.randomUUID` fix.
- **Changed:**
  - `packages/shared/src/sha256.ts` (new): dependency-free SHA-256 (`sha256Bytes` / `sha256Hex`) and `sha256()`, which prefers native WebCrypto and falls back to the pure-JS digest when `crypto.subtle` is undefined. `@noble/hashes` is only a transitive package, so it is not imported.
  - `packages/shared/src/index.ts`: export `sha256`.
  - `packages/ui/src/lib/pptxElementReference.ts`: `sha256Fingerprint` hashes through `sha256()` instead of `globalThis.crypto.subtle.digest` (which was unguarded and would throw on the pptx preview path off-localhost).
  - `packages/ui/src/v4/attachmentUploadTransaction.ts`: the attachment checksum hashes through `sha256()` instead of throwing a raw, untranslated `fault.attachment.checksumUnavailable` when `crypto.subtle` is absent, so attachment upload works from the phone.
  - `packages/ui/src/terminal/TerminalSession.tsx`, `packages/ui/src/ToolCallBlocks/ToolLayout.tsx`, `packages/ui/src/WorkspaceSidebarItem.tsx`: optional-chain the `navigator.clipboard` access and swallow the (secure-context) rejection; the copy/paste actions degrade (no "copied" state) instead of throwing where the clipboard is undefined.
  - `packages/shared/src/sha256.test.ts` (new), `packages/ui/test/secureContextFallback.test.ts` (new): regression coverage.
  - `docs/specs/quiet-studio-mobile-web-layout.md`: product rule 13, state-owner note, and acceptance scenario 12 for secure-context degradation.
- **Result:** On a non-secure origin the pptx fingerprint and attachment upload no longer touch `crypto.subtle` directly, and no reachable clipboard action throws — every secure-context API now degrades instead of reaching an error boundary.
- **Verification:** `pnpm typecheck` (exit 0), `pnpm lint` (0 errors; the same six pre-existing unused-variable warnings), `pnpm architecture:check --changed` (0 violations) passed. `@mesa-code/shared` tests 10/10 and `@mesa-code/ui` tests 102/102 passed. The web bundle was rebuilt and the served entry (`http://127.0.0.1:3351/`) now serves `index-DYTBaIpA.js`, whose chunk `src-17vRm4uj.js` carries the SHA-256 constants and `"SHA-256"`/`"sha256:"` markers. See [`verification-log.md`](verification-log.md).
- **Blocked / Not run:** a real phone render is still not automated; only source/test/bundle evidence is recorded here. The digest fallback is a pure-JS SHA-256 (slower than native) and is used only when `crypto.subtle` is absent.

## 2026-10-11 00:02 (local time) — Fix: `crypto.randomUUID is not a function` on the non-secure (LAN) web mirror

- **Category:** bug fix (web client / non-secure context) + mobile web layout polish
- **Scope:** make the web client work over plain `http://<ip>:<port>` (the LAN / Tailscale mirror opened on a phone), and tidy the mobile header control row.
- **Changed:**
  - `packages/shared/src/cryptoRandomUuidPolyfill.ts` (new): `ensureCryptoRandomUuid()` installs a `crypto.randomUUID` fallback when a non-secure context exposes `crypto` + `getRandomValues` but not `randomUUID`.
  - `packages/shared/src/uuid.ts`: split `createUuidFromEntropy()` out of `createUuid()` so the polyfill delegates to raw entropy and cannot re-enter the patched method (guards against infinite recursion).
  - `packages/shared/src/index.ts`: export the polyfill. `packages/web/src/main.tsx`: call `ensureCryptoRandomUuid()` before the first render.
  - `packages/ui/src/WorkspaceHeader.tsx`: the mobile header now renders one tidy row — drawer toggle + task back/forward/new-task (reusing `DesktopTopOverlayActionButton`) — and drops the desktop window-control left reserve (`pl-38`/`pl-44`) below `md`.
  - `packages/ui/src/app-shell/WorkspaceShellLayout.tsx`: the floating `DesktopTopOverlay` is suppressed on the mobile web layout (it is absolutely positioned at the top-left and overlapped the header); the header receives the task-navigation props it now renders inline.
  - `packages/shared/src/cryptoRandomUuidPolyfill.test.ts` (new), `packages/ui/test/mobileWebLayout.test.ts`: regression coverage.
  - `docs/specs/quiet-studio-mobile-web-layout.md`: adds the non-secure-origin requirement.
- **Result:** The phone-accessible LAN mirror no longer crashes on first paint — `crypto.randomUUID` is present on a plain-http origin. The mobile header shows a single, non-overlapping control row.
- **Verification:** `pnpm typecheck` (exit 0), `pnpm lint` (0 errors; the same six pre-existing unused-variable warnings), `pnpm architecture:check --changed` (0 violations) passed. `@mesa-code/ui` tests 98/98 and `@mesa-code/shared` tests 4/4 (including the four new polyfill tests) passed. `quiet-studio-check` passed. The web bundle was rebuilt and the served entry (`http://127.0.0.1:3351/`) was confirmed to contain the fallback. See [`verification-log.md`](verification-log.md).
- **Blocked / Not run:** the phone render itself was reported by the user (an error-boundary screenshot), not captured by an automated visual check here. A real phone-width render of the fixed mobile layout is still not automated. Related non-secure-context gaps remain out of scope: `crypto.subtle` in the pptx fingerprint path (`packages/ui/src/lib/pptxElementReference.ts` `sha256Fingerprint`, used by the pptx preview) will still throw off-localhost; `navigator.clipboard` is already guarded at its call sites. **(Superseded by the 2026-10-11 00:24 entry: the `crypto.subtle` gap and the unguarded clipboard sites are now fixed.)**

## 2026-10-10 23:26 (local time) — Phone-width layout for the web client (drawer + Settings master-detail)

- **Category:** UI (web client responsive presentation)
- **Scope:** a web-only mobile layout gated behind `isDesktop === false` and `max-width: 767px`; desktop shell and Settings are unchanged.
- **Changed:**
  - `packages/ui/src/hooks/useIsMobileWeb.ts` (new): the single gate (`isDesktop` always wins), `MOBILE_WEB_MEDIA_QUERY`, and `shouldUseMobileWebLayout`.
  - `packages/ui/src/app-shell/MobileSidebarToggleButton.tsx` (new): the header menu button.
  - `packages/ui/src/app-shell/WorkspaceShellLayout.tsx`: off-canvas sidebar drawer + scrim, mobile header inclusion on draft, a drawer toggle on the full-screen Automations view (which has no header), the floating `DesktopTopOverlay` suppressed on mobile (it overlaps the header), content-floor removal on mobile, and the drawer-yield/restore effect.
  - `packages/ui/src/WorkspaceHeader.tsx`: renders one tidy mobile control row — drawer toggle + task back/forward/new-task (+ the panel buttons on the right) — when `isMobileWeb`, and drops the desktop window-control left reserve (`pl-38`/`pl-44`) below `md` so the row sits at the header's left edge.
  - `packages/ui/src/SettingsPage.tsx`: `max-md:grid-cols-1` and a gated master-detail (section list → content + back).
  - `packages/shared/src/test-ids.ts`, `packages/ui/src/i18n/locales/{en-US,zh-CN}.ts`: three test ids and two message ids.
  - `packages/ui/test/mobileWebLayout.test.ts` (new): pins the gate, the breakpoint, the gated shell/header/Settings markup, and the new message ids.
  - `docs/specs/quiet-studio-mobile-web-layout.md` (new) plus routing/`local-network-access.md` cross-reference.
- **Result:** On the web client at ≤ 767px the workspace sidebar becomes an off-canvas drawer with a scrim and a header toggle, the content column loses its 320px floor, and Settings becomes a section list that opens into a detail with a back control. At every branch the layout is disabled whenever `isDesktop` is true, so the desktop app is untouched at any window size.
- **Verification:** `pnpm typecheck` (exit 0), `pnpm lint` (0 errors; the same six pre-existing unused-variable warnings, none in changed files), and `pnpm architecture:check --changed` (0 violations) passed. The full `@mesa-code/ui` `node:test` suite (via `node --import tsx --test`) passed 97/97, including the six new `mobileWebLayout` tests and the pre-existing `settingsSidebarLabels`/`settingsNetworkSection` tests. See [`verification-log.md`](verification-log.md).
- **Blocked / Not run:** the phone layout was **not** rendered in a real browser — no device or device-emulation at 390px was exercised. Correct rendering, the drawer animation, and desktop-unchanged behavior under a real viewport remain to be confirmed by opening the web client (or the LAN mirror) in a phone-width device emulation.

## 2026-10-10 22:47 (local time) — Documentation pass: Network feature confirmed working in dev

- **Category:** documentation (consistency pass) + runtime confirmation
- **Scope:** bring the specification, runbook, README, and spec catalog in line with the now-verified state of the Network feature (dev launch, channel registration, packaged web path).
- **Changed:**
  - Edited: `docs/specs/local-network-access.md` (metadata: `Verification` line now records that the listener, standalone path, and Tailscale detection were exercised on a real machine and the Host registration confirmed at runtime), `docs/quiet-studio/setup-and-windows-build.md` (the `.exe` packaging section now states the package carries `resources/web` and that pre-feature installers lack it), `README.md` (public entry points table gains the "reach the app from another device" row and notes `dev:desktop` also builds the web client), `docs/specs/README.md` (status of `local-network-access.md` → "Active; runtime-verified on a dev build"), `docs/README.md` (index timestamp). Metadata `Updated` stamps refreshed to 2026-10-10 22:47.
- **Result:** No source changed. The documents no longer read as if the Network feature were unverified: the in-app listener runs, the desktop Host registers the `network-access` channel, the dev launcher builds the web client, and a built installer ships `resources/web`.
- **Verification:** `pnpm dev:desktop` started successfully (after clearing a stale `vite dev` that held port 5174 from a previous session); the dev Host registered `channel "network-access"` at 22:41:07 in `.quiet-studio-runtime/home/.mesaCode/v2/logs/2026-10-10.log`, replacing the earlier stale-build `Unknown channel: network-access` errors. The user reported the feature working correctly after the fix. See [`verification-log.md`](verification-log.md).
- **Blocked / Not run:** the exact browser-mirror interaction was observed by the user, not by an automated check here; installing the new `.exe` and reaching the listener from a genuinely separate device (Windows Firewall inbound) remain unverified.

## 2026-10-10 22:32 (local time) — `dev:desktop` builds the web client; verify the installer ships the web path

- **Category:** build tooling (dev launcher) + packaging verification
- **Scope:** make `pnpm dev:desktop` a single, complete command for testing the desktop app **and** its Network mirror, and prove a freshly built installer includes the web path.
- **Changed:**
  - Edited: `scripts/dev-desktop-env.mjs` — before starting Electron, `dev:desktop` now runs `pnpm --filter @mesa-code/web build` (in order: `pre-dev`, web build, desktop agent CLI, `dev:runtime`). Previously only the desktop renderer was built, so the in-app mirror served a stale/absent `packages/web/dist` ("Web client bundle not found"). `docs/quiet-studio/setup-and-windows-build.md` documents the new step and that it is a one-shot build, not a watcher.
- **Result:** `pnpm dev:desktop` now builds everything the desktop app and the Network mirror need; the host resolves `packages/web/dist` in dev (verified: `out/host` → `packages/web/dist`, `index.html` present). No application source changed. The installer path was already wired (`prepare:web-bundle` → `bundled-web/<platform>` → electron-builder `extraResources` → `resources/web`); this revision proves it end to end.
- **Verification:** `pnpm typecheck`, `pnpm lint` (0 errors; six pre-existing warnings), and `pnpm architecture:check --changed` (0 violations) passed. `quiet-studio-check`, `quiet-studio-sidebar-parity-check`, and `quiet-studio-settings-transition-check` passed. A full Windows installer was built: `pnpm --filter @mesa-code/desktop run bundle -- --os win --arch x64` exited 0 and produced `MesaCode-1.0.0-win-x64.exe` (153.4 MiB); the packaged `resources/web/` now contains `index.html` + `assets/`, and the packaged `app.asar` contains the Network feature (`network-access` literal, `installTailscale`, `createHttpServer`, the winget `Tailscale.Tailscale` plan). See [`verification-log.md`](verification-log.md).
- **Blocked / Not run:** installing/launching the new `.exe` and driving the mirror from a browser were not performed on this machine (an older installed build is still present). Windows Firewall inbound and a genuinely separate device remain unverified.

## 2026-10-10 20:38 (local time) — Document both LAN/Tailscale exposure paths

- **Category:** documentation (spec + runbook)
- **Scope:** clarify that exposing the app by IP does not require the in-app mirror; record the already-existing standalone `@mesa-code/server` path alongside the Network page.
- **Changed:**
  - Edited: `docs/specs/local-network-access.md` (new product rule 12 + acceptance scenario 10: the standalone server path is a separate session and is not this feature's implementation), `docs/quiet-studio/setup-and-windows-build.md` (new "Exposing the app on the LAN / Tailscale (two paths)" section with a comparison table, the `PORT`/`MESA_CODE_SERVER_HOST`/`MESA_CODE_WEB_STATIC_ROOT`/`MESA_CODE_SERVER_AUTH_TOKEN` commands, and a shared Windows Firewall limitation), `docs/README.md` (network routing row now also points at the setup runbook; index refreshed).
- **Result:** No source behavior changed. The docs now say plainly that `pnpm dev:web`/`pnpm dev:server` already binds `0.0.0.0` and needs no code change to be reachable by IP, that it is a **separate** session (its own Agent/Host/services), and that the in-app Network mirror is the path to reach the **same** running session with a UI-editable port. Firewall is documented as applying to both paths and still unverified.
- **Verification:** `pnpm typecheck`, `pnpm lint` (0 errors), and `pnpm architecture:check --changed` (0 violations) all passed on this revision. Runtime evidence for the standalone path and the mirrored listener was captured by booting the real `createHttpServer` and the built `@mesa-code/server` entry point; see [`verification-log.md`](verification-log.md).
- **Blocked / Not run:** the in-app mirror end-to-end in a packaged app, the winget/manual Tailscale install flow, and Windows Firewall inbound behavior remain unverified (need a real Windows packaging/interaction run).

## 2026-10-10 16:16 (local time) — Network page: fix "cannot enable" and detect + install Tailscale

- **Category:** bug fix + feature (desktop Host + Settings)
- **Scope:** the Network page could not be enabled (`Channel name 'network-access' timed out after 10000ms`) and reported Tailscale as missing on a machine where it was installed. Adds Tailscale install (Phase 2).
- **Cause of "cannot enable":** the desktop Host process running the app was a **stale build that predates the Network feature**, so it never registered the `network-access` channel (the host log recorded `Unknown channel: network-access`) and its `ChannelServer` still used the old `10000ms` timeout. Current source registers the channel before the renderer's port is exposed (during `initializeServices`), and the packaged `app.asar` also predated the change. The fix is a fresh build; the channel now registers and `@mesa-code/server` is bundled into `out/host` (already in the host's `noExternal`).
- **Cause of "Tailscale not detected":** detection probed only `tailscale` on `PATH`. A packaged desktop app launched from a GUI frequently does not inherit the shell `PATH`, so an installed Tailscale (`C:\Program Files\Tailscale\tailscale.exe`) was invisible. Detection now resolves the CLI from `PATH` **and** the platform's default install locations.
- **Changed:**
  - Edited: `packages/desktop/src/host/tailscaleProbe.ts` (exe resolution + default locations + `executablePath`), `packages/desktop/src/host/networkAccessService.ts` (install wiring, `executablePath`, install state), `packages/services/src/network-access/networkAccess.ts` (`executablePath`, `TailscaleInstallState`, `installTailscale`, `onInstallStateChanged`, `install` field), `packages/services/src/index.ts`, `packages/ui/src/settings/NetworkSection.tsx` (Install button, progress, manual-fallback), `packages/ui/src/i18n/locales/{en-US,zh-CN}.ts`, `packages/desktop/src/host/{networkAccessService,tailscaleInstall}.test.ts`, `docs/specs/local-network-access.md`.
  - New: `packages/desktop/src/host/tailscaleInstall.ts` (per-OS install plan, installer runner, progress parsing, honest verify), `packages/desktop/src/host/tailscaleInstall.test.ts`.
- **Result:** Tailscale installed at its default location is detected even when the app `PATH` lacks it (verified on this machine: resolved `C:\Program Files\Tailscale\tailscale.exe`, `running: true`, `100.85.35.26`). The page offers **Install Tailscale** when missing; it runs winget (`Tailscale.Tailscale`) on Windows or `brew install --cask tailscale` on macOS, which raises the elevation prompt itself; progress streams to the page; the outcome is decided by re-probing after the installer exits, so a declined prompt / non-zero exit / finished-without-Tailscale is reported as a failure with the manual download link, never a false success. When no command is available (unsupported platform / missing package manager) the page reports that and offers the manual link.
- **Verification:** `pnpm typecheck` passed; `pnpm lint` 0 errors (same six pre-existing warnings, none in changed files); `pnpm architecture:check --changed` OK (0 violations); `quiet-studio-check`, `quiet-studio-sidebar-parity-check`, `quiet-studio-settings-transition-check` passed. Focused tests: 24 desktop (address helpers, listener lifecycle, install-plan/percent, runner honesty, resolve-executable) and 5 Network-section UI tests. The desktop host bundle was rebuilt with `tsup` and confirmed to register the channel, bundle `createHttpServer`, and emit the new modules. See [`verification-log.md`](verification-log.md).
- **Blocked / Not run:** the end-to-end browser mirror and the actual winget/manual UI install flow were not exercised against the running packaged app; Windows Firewall inbound behavior is unverified (needs a real Windows host).

## 2026-10-10 15:44 (local time) — Network settings page: expose the running session on LAN/Tailscale

- **Category:** feature (desktop Host + Settings)
- **Scope:** opt-in local listener that serves the web client so a browser on the LAN or a Tailscale tailnet opens the SAME running session; new desktop-only Network settings page.
- **Changed:**
  - New: `docs/specs/local-network-access.md`, `packages/services/src/network-access/networkAccess.ts`, `packages/desktop/src/host/networkAccessService.ts`, `packages/desktop/src/host/networkAccessAddresses.ts`, `packages/desktop/src/host/tailscaleProbe.ts`, `packages/ui/src/settings/NetworkSection.tsx`, `packages/desktop/scripts/prepare-web-bundle.mjs`, `packages/desktop/src/host/networkAccessAddresses.test.ts`, `packages/desktop/src/host/networkAccessService.test.ts`, `packages/ui/test/settingsNetworkSection.test.ts`.
  - Edited: `packages/shared/src/channels.ts`, `packages/shared/src/validationAppSettings.ts`, `packages/shared/src/protocol.ts`, `packages/services/src/{index.ts,accessor.ts,node.ts}`, `packages/client/src/remoteServiceAccess.ts`, `packages/desktop/src/host/index.ts`, `packages/desktop/package.json`, `packages/desktop/scripts/prepare-runtime-assets.mjs`, `packages/desktop/electron-builder.config.js`, `packages/ui/src/{SettingsPage.tsx,lib/settingsNavigation.ts,settings/settingsPageConfig.ts}`, `packages/ui/src/i18n/locales/{en-US,zh-CN}.ts`, `.gitignore`, `docs/specs/settings-restructure.md`, `docs/README.md`, `docs/specs/README.md`.
- **Cause (gap this closes):** the desktop app already ships the same `@mesa-code/ui` client and the same per-window Host services, but it never called `@mesa-code/server`'s `createHttpServer` and never bundled the built web client — so there was no way to reach the running desktop session from another device. The distribution `mesa-code --web` path can serve a session, but it starts its own Agent/Host and forces a token for non-local hosts.
- **Result:** `INetworkAccessService` (desktop window Host) is the single owner of the listener and the three persisted fields (`networkAccessEnabled`/`networkAccessHost`/`networkAccessPort`, default off, host `0.0.0.0`, port `0`). Enabling it calls `createHttpServer(windowHostServices, port, { host, staticRoot, spaFallback: true })` with **no auth token**, so a browser at `http://<ip>:<port>` loads the real web client and connects to the same-origin `/ws` as a `web-remote-replayable` client of the **same** session. The page lists every non-internal IPv4 address (`100.64.0.0/10` labelled Tailscale, the rest LAN), allows changing the port from the UI (clean close + rebind, no timeout papering), reports Tailscale presence read-only, and refuses to bind for remote (SSH/WSL/docker) workspaces. The three fields flow through the existing settings schema and `AppSettings` type; the service is exposed to the UI through the existing channel proxy. Changing the port updates the setting first (source of truth) then reconciles the listener through one serialized path.
- **Security (explicit product decision):** the listener has **no authentication**, inverting the project's fail-closed default (`packages/mesa-code-server-cli/src/server-core/http.ts` refuses a non-local host without auth; `scripts/mesa-code-distribution/runner.mjs` forces a token for non-local hosts). Anyone who can reach the address gets full control of the session. This is recorded as a user-accepted risk in the spec and shown as a required warning next to the toggle. No new credential, token, or pairing is introduced.
- **Verification:** `pnpm typecheck` passed; `pnpm lint` reported 0 errors (the six pre-existing unused-variable warnings are unchanged and none are in the changed files); `pnpm architecture:check --changed` reported OK (0 violations); `node scripts/quiet-studio-check.mjs` and the sidebar-parity, settings-transition, and name checks passed; `pnpm --filter @mesa-code/web build` succeeded (exit 0) so the `staticRoot` staging source is valid. Focused tests: 16 new (5 address helpers, 6 listener lifecycle against a fake `ISettingService` with a loopback bind, 5 Network-section gating/localization); the existing desktop and settings UI suites still pass (17 desktop tests, 12 settings UI tests). See [`verification-log.md`](verification-log.md).
- **Blocked / Not run:** the end-to-end mirror was not exercised in a running desktop window (no GUI/network in this environment); the actual bind was proven only against a loopback interface in the service test, not a LAN or tailnet address; Windows Firewall inbound-rule behavior was not verified (needs a real Windows host); `resolveWebStaticRoot` prefers the packaged `resources/web` directory, which was not produced here (only the `packages/web/dist` staging source was built).
- **Deferred (separate phase):** installing Tailscale (winget/brew/distro packages with admin elevation) is out of scope for this change; Stage 1 is read-only detection.

## 2026-10-10 14:58 (local time) — Settings sidebar looked ragged at narrow widths

- **Category:** UI / presentation bug fix
- **Scope:** Settings sidebar navigation below Tailwind's `lg` breakpoint (1024px)
- **Changed:** `packages/ui/src/SettingsPage.tsx`, `docs/specs/quiet-studio.md`, `docs/specs/settings-restructure.md`, `packages/ui/test/settingsSidebarLabels.test.ts`
- **Cause:** the settings shell always laid out a fixed 264px navigation column (`grid-cols-[264px_minmax(0,1fr)]`), but the nav button carried `max-lg:mx-auto max-lg:size-10 max-lg:justify-center max-lg:px-0` and the sidebar footer was wrapped in `max-lg:hidden`. Below 1024px each row collapsed to a 40px icon-only button while the column stayed 264px wide, so the icons floated in a wide empty column with no labels and the Settings-only bottom action disappeared — the sidebar read as a detached, ragged strip at the left edge. At ≥1024px the responsive classes were inactive, which is why the wide layout looked correct.
- **Result:** the nav rows keep their full width and labels at every window width, long labels truncate with an ellipsis, and the bottom Settings-only footer stays visible. The icon-rail behavior is removed; navigation never collapses to icons. This resolves the contradiction between `quiet-studio.md` ("narrow Settings retains icon-only navigation") and `settings-restructure.md` ("section names visible at every width") in favour of always-visible labels.
- **Verification:** 6 focused tests passed, including two new regression tests asserting no `max-lg` icon-rail classes on the button and no `max-lg:hidden` footer wrapper. The sidebar presentation parity check passed; `pnpm typecheck` passed; `pnpm lint` reported 0 errors (the six pre-existing warnings are unchanged). See [`verification-log.md`](verification-log.md).
- **Blocked:** Not confirmed by eye in a running desktop window; verification is the source assertions, the focused tests, and the parity check. The macOS-only `max-lg:h-16` top band was intentionally left untouched.
- **Follow-up:** Confirm the narrow Settings sidebar in an isolated desktop build on Windows and macOS.

## 2026-10-10 13:55 (local time) — Settings sidebar sat in the middle of the window

- **Category:** UI / layout bug fix
- **Scope:** Settings page shell grid
- **Changed:** `packages/ui/src/SettingsPage.tsx`, `docs/specs/settings-restructure.md`, `packages/ui/test/settingsSidebarLabels.test.ts`, `packages/ui/test/fixtures/settings-shell-layout-preview.html` (new)
- **Cause:** the settings shell used `grid-cols-[var(--workspace-sidebar-width)_minmax(0,1fr)]` while the workspace shell stays mounted but transparent during Settings (see `RootWorkspaceContent`). Nothing filled the first column, so it rendered as an empty band and the settings nav was auto-placed into **column 2**. The nav therefore appeared as a detached narrow strip in the middle of the window, separate from the workspace sidebar on its left.
- **Result:** the settings page now lays out its own two columns — a fixed nav column and a content column that fills the remainder — with no reserved workspace-sidebar column. The nav sits flush at the left edge.
- **Verification:** measured in a browser reproduction of both arrangements: before the fix the nav column started at x=264 with an empty 264px strip to its left; after the fix the nav sits at x=1 with width 264 and content fills from x=265. The running renderer was confirmed to serve the fixed module. 4 focused tests passed, including a new regression test. `pnpm typecheck` passed; `pnpm lint` reported no errors.
- **Blocked:** Not confirmed by eye in the running desktop app; verification is the measured reproduction plus the served-module check.
- **Follow-up:** Check the settings page at both wide and narrow window sizes in an isolated desktop build.

## 2026-10-10 11:50 (local time) — Connection Test reported no outcome

- **Category:** UI / bug fix
- **Scope:** provider connection Test action
- **Changed:** `docs/specs/custom-provider-connection-apply-and-test.md`, `packages/ui/src/settings/model-provider-section/InlineEditableProviderCard.tsx`, `packages/ui/src/i18n/locales/en-US.ts`, `packages/ui/src/i18n/locales/zh-CN.ts`, `packages/ui/test/providerConnectionApplyTest.test.ts`
- **Cause:** two defects. The handler only reported failures, so a successful test looked identical to a dead button — no running state and no success message. It also required `models[0]`, but the connectivity service needs a _persisted_ model selection, so a provider with no models yet could never be tested.
- **Result:** Test enters a visible running state and reports success or failure explicitly. When the provider has no usable model selection it falls back to probing the provider's own `/models` endpoint, which still verifies the Base URL and credential, and reports how many models it found.
- **Verification:** 10 focused tests passed. The configured provider was probed directly: `GET /v1/models` returned 200 in 315ms and `POST /v1/chat/completions` returned 200 in 1618ms, so the service was sound and the defect was the missing feedback. `pnpm typecheck` passed.
- **Blocked:** The button was not clicked in the running app; the running bundle was confirmed to contain the new states.
- **Follow-up:** Click Test in an isolated desktop build for both a reachable and an unreachable provider.

## 2026-10-10 11:30 (local time) — Explicit Apply/Test for custom provider connection, and a second credential-read loop

- **Category:** UI / product change, performance bug fix
- **Scope:** custom provider Base URL and API key editing; provider settings probe effects
- **Changed:** `docs/specs/custom-provider-connection-apply-and-test.md` (new), `docs/specs/custom-provider-only-model-settings.md`, `packages/ui/src/settings/model-provider-section/InlineEditableProviderCard.tsx`, `packages/ui/src/settings/model-provider-section/ProviderCardSections.tsx`, `packages/ui/src/settings/ModelProviderSection.tsx`, `packages/ui/src/i18n/locales/en-US.ts`, `packages/ui/src/i18n/locales/zh-CN.ts`, `packages/ui/test/providerConnectionApplyTest.test.ts` (new)
- **Result:**
  - **Apply/Test flow.** Base URL and API key are now draft-only while typing. An **Apply** action, enabled only when the draft differs from the saved config, is the sole writer of connection settings. A **Test connection** action becomes available once the draft is applied and runs the existing connectivity test on demand. Blur and the idle timer no longer write connection fields, so a partially typed Base URL or API key can no longer be persisted and typing issues no provider requests.
  - **Second credential-read loop fixed.** `ModelProviderSection`'s connection-token effect depended on `refreshCodingPlanPurchaseTokenState`, whose identity follows the service accessor. Each run read three credentials, producing the burst that was still visible after the earlier fix. The callback is now read through a ref and the effect keys only on the explicit refresh signal: `credential.load` fell from thousands per session to **4**.
- **Verification:** 8 focused tests for the Apply/Test rules passed; 28 tests passed in total. `pnpm typecheck` passed; `pnpm lint` reported no errors. Measured in the dev desktop app: `credential.load` totalled 4 calls with no sustained rate. See [`verification-log.md`](verification-log.md).
- **Blocked:** The Apply/Test buttons were not clicked in a running app; verification is the source assertions, the tests, and the RPC volume measurement.
- **Follow-up:** Confirm the Apply/Test interaction in an isolated desktop build, including a failing credential.

## 2026-10-10 11:50 (local time) — Test connection reported nothing

- **Category:** UI / bug fix
- **Scope:** provider connection Test action
- **Changed:** `docs/specs/custom-provider-connection-apply-and-test.md`, `packages/ui/src/settings/model-provider-section/InlineEditableProviderCard.tsx`, `packages/ui/src/i18n/locales/en-US.ts`, `packages/ui/src/i18n/locales/zh-CN.ts`, `packages/ui/test/providerConnectionApplyTest.test.ts`
- **Cause:** two defects. (1) The handler only reported failures, so a successful test looked identical to a dead button — no running state, no success message. (2) It required `models[0]` and the connectivity service needs a _persisted_ model selection, so a provider with no models yet could never be tested and only showed an instruction.
- **Result:** Test now enters a visible running state and reports success or failure explicitly. When the provider has no usable model selection it falls back to probing the provider's own `/models` endpoint, which still verifies the Base URL and credential, and reports how many models it found.
- **Verification:** 10 focused tests passed, including running-state, success-report, and catalog-fallback coverage. The configured provider was verified independently: `GET /v1/models` returned 200 in 315ms and `POST /v1/chat/completions` returned 200 in 1618ms, so the service path is sound and the defect was the missing feedback. `pnpm typecheck` passed.
- **Blocked:** The button was not clicked in the running app; the running bundle was confirmed to contain the new states, but no click was performed.
- **Follow-up:** Click Test in an isolated desktop build for both a reachable and an unreachable provider.

## 2026-10-10 11:00 (local time) — Stop the coding-plan probe from re-reading credentials in a loop

- **Category:** UI / performance bug fix
- **Scope:** coding-plan entry plan-list hook
- **Changed:** `packages/ui/src/hooks/useCodingPlanEntryPlanList.ts`, `packages/ui/test/codingPlanEntryPlanListLoop.test.ts` (new)
- **Cause:** the probe effect depended on `refresh` (a `useCallback` whose own deps are eight values taken from the entitlement family objects) and on `providerSettingsView` (a view object). Upstream renders recreated both identities, so the effect re-fired on every render. Each run read two credentials, producing sustained `credential.load` RPC traffic: **8,834 calls in one session, peaking around 200-270 per second**.
- **Result:** `refresh` is read through a ref and the effect keys on the provider view's revision (a stable content identifier) plus the explicit retry generation, so it runs once per real change instead of once per render. Both families are still probed.
- **Verification:** measured in the dev desktop app — `credential.load` dropped from 8,834 calls in a session to **4**, with no sustained rate; the remaining calls are the expected two-per-family reads when the provider view loads. 5 focused tests passed. `pnpm typecheck` passed; `pnpm lint` reported no errors.
- **Blocked:** The settings page was not driven through its UI; live evidence is the Host RPC call pattern.
- **Follow-up:** Audit other effects that depend on `refresh`-style callbacks or view objects for the same restart-per-render shape.

## 2026-10-10 10:45 (local time) — Restore Settings sidebar labels at narrow widths

- **Category:** UI / bug fix
- **Scope:** Settings sidebar group titles and section names
- **Changed:** `packages/ui/src/SettingsPage.tsx`, `docs/specs/settings-restructure.md`, `packages/ui/test/settingsSidebarLabels.test.ts` (new), `packages/ui/test/fixtures/settings-sidebar-groups-preview.html` (new)
- **Cause:** two `max-lg:sr-only` classes visually hid the sidebar text below Tailwind's `lg` breakpoint (1024px): one on the group title ("General" / "Agent" / "Data") and one on the shared sidebar button's label wrapper, which every section name passes through. `sr-only` keeps text in the accessibility tree, so screen readers still announced the labels while sighted users saw only icons and dividers, with no way to tell the groups apart.
- **Result:** both gates are removed, so group titles and section names render at every width. The now-redundant narrow-width divider on the group wrapper was dropped, and the unused loop index was removed.
- **Verification:** 3 focused tests passed (no `max-lg:sr-only` remains; the group title renders unconditionally; the button label wrapper is in normal flow). A browser capture of the fixture at a 420px sidebar width showed the titles clipped before the change and visible after. `pnpm typecheck` passed; `pnpm lint` reported no errors.
- **Blocked:** Not observed inside the running desktop app; verification is the fixture, the source assertions, and the tests.
- **Follow-up:** Confirm in an isolated desktop build at narrow widths and in both themes.

## 2026-10-10 10:35 (local time) — Fix running glow hidden by composer content

- **Category:** UI / bug fix
- **Scope:** chat composer running highlight
- **Changed:** `packages/ui/src/quiet-studio.css`, `packages/ui/test/composerRunningGlow.test.ts`, `packages/ui/test/fixtures/composer-running-glow-preview.html`, `docs/specs/quiet-studio.md`
- **Cause:** the highlight was painted at `z-index: 0` with a rule lifting the composer's direct children to `z-index: 1` (added so text stayed readable above the ring). That also lifted children carrying an opaque background — the editor wrapper and the toolbar row — above the ring, so the glow disappeared wherever content covered the border, including as soon as the pointer moved into the box.
- **Result:** the ring is now a top overlay (`z-index: 1`, `pointer-events: none`) and the child-raising rule is gone, so children stay in the normal flow. The highlight remains visible over every child and under the pointer, while text, toolbar hit areas, and the editor are unaffected.
- **Verification:** 5 focused CSS tests passed, including a new regression test asserting the ring paints above the content and that no rule raises the composer's children. A browser A/B capture of the fixture (now containing an opaque child mirroring the editor wrapper) showed the old stacking hid the ring and the fixed stacking keeps it visible; with the pointer inside the box the animated angle advanced 292deg to 9.8deg with opacity pulsing, so it keeps animating. `pnpm typecheck` passed; `pnpm lint` reported no errors.
- **Blocked:** Not observed inside the running desktop app; verification is the fixture plus the CSS assertions.
- **Follow-up:** Confirm in an isolated desktop build, including light/dark themes.

## 2026-10-10 10:25 (local time) — Fix endless "Fetching model list…" on the discovery dialog

- **Category:** UI / bug fix
- **Scope:** custom-provider model discovery dialog
- **Changed:** `packages/ui/src/settings/model-provider-section/ProviderCardSections.tsx`, `packages/ui/src/settings/model-provider-section/ProviderModelDiscoveryDialog.tsx`, `docs/specs/custom-provider-model-discovery.md`, `packages/ui/test/modelDiscoveryStableIdentity.test.ts` (new), `packages/ui/test/modelDiscoveryProbeLoop.test.ts` (new)
- **Cause:** the dialog's probe effect depended on state rebuilt from an inline array. `ProviderModelsSection` passed `existingModelIds={models.map((model) => model.modelId)}`, creating a new array every render; the dialog turned it into a new `Set`, which gave `runProbe` a new identity, so the `[open, runProbe]` effect re-fired. Because the probe also calls `setPhase("loading")`, each run triggered the next render: a refetch loop. The provider was answering normally (~300ms), but the spinner never settled because the dialog restarted its own request.
- **Result:** the parent now derives the id list from a content key so its identity is stable, and the dialog keys its probe on the provider identity plus that content key, reading the live id set through a ref. Opening the dialog performs one request, plus one more only if the provider's model list actually changes.
- **Verification:** 7 focused tests passed (never re-trigger on re-render; probe once per opening; re-probe once when the list changes; stable content key; empty-list handling). `pnpm typecheck` passed; `pnpm lint` reported no errors. Live check in the dev desktop app: 3 `provider-settings.discoverModels` calls over the session, each completing in ~300-430ms, versus 7 calls within ~300ms before the fix.
- **Blocked:** The dialog was not driven through its UI by an automated interaction; the live evidence is the Host RPC call pattern plus unit tests.
- **Follow-up:** None.

## 2026-10-10 08:50 (local time) — Running-response composer glow

- **Category:** UI / presentation
- **Scope:** chat composer border during an active response
- **Changed:** `docs/specs/quiet-studio.md`, `packages/ui/src/v4/ConversationComposer.tsx`, `packages/ui/src/quiet-studio.css`, `packages/ui/test/composerRunningGlow.test.ts` (new), `packages/ui/test/fixtures/composer-running-glow-preview.html` (new)
- **Result:** While a response is running, the composer border now carries a slow travelling highlight driven entirely by CSS. The composer exposes `data-composer-running` from its existing stop-capability state (`snapshot.control.canStop`); no new state owner, timer, network call, or persistence path was added. The highlight is drawn by a masked conic-gradient pseudo-element, so the neutral resting border is unchanged and the "one surface, one border" rule still holds. It uses the existing brand token, so it follows theme and accent automatically. Under `prefers-reduced-motion` the animation is replaced by a static brand border.
- **Verification:** Four focused CSS tests passed; `pnpm typecheck` passed; `pnpm lint` reported no errors. Visual behavior confirmed in a browser against the preview fixture: the animated angle advanced 74.6° to 166.6° over 600ms, the idle surface drew no glow, and reduced motion produced a static border with no animation. See [`verification-log.md`](verification-log.md).
- **Blocked:** Not verified inside the running desktop app; only the standalone CSS preview and the CSS assertions were exercised.
- **Follow-up:** Confirm in an isolated desktop build during a live response, including light/dark themes.

## 2026-10-10 07:45 (local time) — Tool check in the installer batch entry point

- **Category:** build / tooling / documentation
- **Scope:** `build-installer.bat` step order, tool readiness check, `.gitignore`
- **Changed:** `build-installer.bat`, `scripts/tools/tool-bootstrap.mjs`, `docs/build-tools.md`, `docs/quiet-studio/setup-and-windows-build.md`, `.gitignore`
- **Result:**
  - `build-installer.bat` now checks the external build tools **before** bumping the version. It runs `tool-bootstrap.mjs --check`; when a tool is missing it downloads the toolset, then bumps the version, then builds.
  - Added a `--check` mode to the bootstrap CLI. It prints per-tool presence and `ready=true|false`, and exits non-zero when a required tool is absent, without downloading anything.
  - Ignored the Rust shim's `target/` build output and committed a shim-local `.gitignore` plus `README.md`.
- **Verification:** `build-installer.bat` ran end to end with exit code 0 — `[1/3]` reported `ready=true`, `[2/3]` bumped `1.0.0` to `1.0.1`, `[3/3]` produced `MesaCode-1.0.1-win-x64.exe`. The test version bump and its artifact were reverted afterwards, so the tree remains at `1.0.0`. See [`verification-log.md`](verification-log.md).
- **Blocked:** Installer remains unsigned and was not installed or launched.
- **Follow-up:** None.

## 2026-10-10 01:30 (local time) — Build tool cache, faster packaging, corrected build docs

- **Category:** build / tooling / documentation
- **Scope:** external build tool bootstrap, `afterPack` asar rewrite, Windows build runbook, docs routing
- **Changed:** `scripts/tools/{tool-catalog,tool-bootstrap,seven-zip}.mjs` (new), `scripts/tools/seven-zip-shim/` (new: Rust shim, prebuilt binary, Cargo manifest), `packages/desktop/scripts/app-asar-rewrite.mjs` (new), `packages/desktop/scripts/packaged-sourcemap-cleanup.mjs`, `packages/desktop/scripts/bundle.mjs`, `packages/desktop/electron-builder.config.js`, `package.json`, `.gitignore`, `docs/build-tools.md` (new), `docs/README.md`, `docs/quiet-studio/setup-and-windows-build.md`, `README.md`
- **Result:**
  - Added a `.tools/` cache with a catalog, checksum verification, and on-demand download. `pnpm tools:bootstrap` prepares `winCodeSign`, `nsis`, and `nsis-resources`; `pnpm bundle:desktop` now calls it automatically, so a missing tool is fetched instead of failing packaging.
  - Non-admin Windows extraction works via a bundled `7za` shim that pre-creates the `winCodeSign` macOS symlink paths, answers `-y`, closes stdin, and treats 7za exit code 2 as success.
  - Packaging now rewrites `app.asar` in a single extract/repack cycle instead of three. Measured on the reference machine: asar extract 3 cycles/121.5s to 1 cycle/36.1s; asar pack 3 cycles/76.1s to 1 cycle/24.7s; total afterPack asar work ~197.6s to ~80.7s. A packaging-only re-run completed in ~3.5 minutes end to end.
  - Documentation corrected: the runbook no longer claims the checkout lacks Git metadata, documents the `pnpm bootstrap` submodule-path failure and the working install sequence, states the Node 24.14.0 requirement, and describes the tool cache and incremental build.
- **Verification:** `pnpm typecheck` passed; `pnpm lint` reported no errors (six pre-existing warnings); `pnpm fmt:check` passed; `pnpm bundle:desktop -- --os win --arch x64` exited 0 and produced one `MesaCode-1.0.0-win-x64.exe` (142.12 MB); `pnpm tools:bootstrap` exited 0 and reused cached tools. See [`verification-log.md`](verification-log.md).
- **Blocked:** Installer was not signed, installed, or launched; no desktop/web runtime interaction was exercised.
- **Follow-up:** Consider fixing the `apps/mesaCode-cli` submodule path in `scripts/bootstrap.mjs` so `pnpm bootstrap` works on this checkout.

## 2026-10-09 16:39 (local time) — Windows GitHub Release automation

- **Category:** release / CI / repository hygiene
- **Scope:** ignored build output, Windows x64 installer publication, GitHub Actions release flow
- **Changed:** `.gitignore`, `.github/workflows/windows-release.yml`, `docs/specs/github-release-automation.md`, `docs/README.md`, `docs/specs/README.md`, `docs/quiet-studio/setup-and-windows-build.md`, `config/README.md`
- **Result:** Added a guarded workflow that builds exactly one Windows x64 installer on `main`, creates an immutable version/commit release tag, and uploads the installer plus available updater metadata. Local build output and signing material are ignored.
- **Verification:** Workflow and documentation source reviewed. Local command validation is recorded separately below.
- **Blocked:** This checkout has no Git metadata or remote, so local commit, push, hosted build, and GitHub Release publication were not performed.
- **Follow-up:** Configure the intended GitHub remote and authenticated operator workflow before committing or pushing.

## 2026-10-09 16:31 (local time) — Documentation system overhaul

- **Category:** documentation / maintenance
- **Scope:** documentation index, AI reading order, policy, changelog, verification ledger
- **Changed:** `docs/README.md`, `docs/documentation-policy.md`, `docs/changelog.md`, `docs/verification-log.md`
- **Result:** Added a canonical reading route, document authority model, metadata/status rules, append-only history format, and evidence ledger.
- **Verification:** Documentation content reviewed against current `AGENTS.md`, `README.md`, Quiet Studio architecture/setup documents, and active specs.
- **Blocked:** Full repository freshness and changed-architecture checks require Git metadata that this workspace does not have.
- **Follow-up:** Normalize active project landing/spec/runbook documents and audit current Markdown links.

## 2026-10-09 16:31 (local time) — Sidebar task-list refresh stability

- **Category:** UI / task-list rendering
- **Scope:** stale-while-revalidate behavior for Workspace sidebar task groups
- **Changed:** `docs/specs/quiet-studio.md`, `packages/ui/src/hooks/workspaceTaskListDisplayGroups.ts`, `packages/ui/test/workspaceTaskListDisplayGroups.test.ts`
- **Result:** Preserve the last committed task snapshot while stale activity/entity data revalidates; prevent transient `No tasks yet` flashes.
- **Verification:** Five focused regression tests passed; `pnpm typecheck` passed; `pnpm lint` passed with six existing warnings; changed-file formatting passed.
- **Blocked:** No new runtime desktop interaction evidence recorded in this entry.
- **Follow-up:** Verify the behavior in a current isolated desktop build, not an older running executable.

## 2026-10-09 16:31 (local time) — Settings-only navigation and native Git authentication

- **Category:** UI / Git / authentication boundary
- **Scope:** remove application Connect/login surface while preserving native Git push
- **Changed:** Active Quiet Studio/Git specifications, Workspace and Settings sidebar wiring, root login paths, Git push wiring, GitHub OAuth registration/listener paths
- **Result:** Settings-only footer; no application GitHub login/OAuth path; commit remains local; push uses native Git credentials. Legacy GitHub credential identifiers remain compatibility-only.
- **Verification:** Root typecheck passed; root lint passed with existing warnings; source audit found no live login-entry, GitHub adapter, or callback-listener path.
- **Blocked:** Desktop runtime interaction, installer, real commit/push, and external OAuth/network checks were not performed.
- **Follow-up:** Keep compatibility identifiers only for legacy data readability; never restore them as an enabled login or push path.
