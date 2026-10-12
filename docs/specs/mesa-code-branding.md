# Mesa Code Branding

**Status:** active  
**Owner:** repository, UI, and desktop identity maintainers  
**Authority:** contract  
**Scope:** product identity, startup presentation, language, and compatibility naming  
**Updated:** 2026-10-12 08:39 (local time)  
**Verification:** source-only documentation review; login and storage discrepancies remain below

## Current authority and unresolved differences

[Settings-only navigation and native Git authentication](github-only-login-and-push.md)
supersedes the login/welcome behavior described in the earlier Anonymous Startup
section below. Its removal contract is authoritative; the earlier statements that
explicit application login and expired-session login remain available must not be
used to restore those surfaces.

This specification and current storage helpers use `.mesaCode` / `.mesaCodeignore`,
while root workspace guidance names `.mesa-code/` / `.mesa-codeignore` as stable
identifiers. That disagreement requires maintainer clarification and, if behavior
changes, an explicit idempotent migration. This docs-only review renames neither
paths nor stored data. Current path spelling is not permission to discard existing
user data.

Packaging, startup, and language acceptance below remain required outcomes, not
proof that an installer or runtime passed this review.

## Purpose

Define the Mesa Code product identity and the internal identifier convention.
The repository already uses these names; this spec is the normative reference
that keeps new code, packaging, and documentation aligned with them.

## Scope

- User-visible product name: `Mesa Code`.
- Desktop executable name: `MesaCode.exe`.
- Package scope, directories, protocol source names, source symbols, scripts,
  and generated artifact names use the Mesa Code naming convention.
- Runtime environment variables use the `MESA_CODE_*` prefix.
- Persistent storage uses `.mesaCode`.
- Desktop distribution targets Windows x64; the installer uses the Mesa Code
  identity.
- Window title, product metadata, desktop shortcut, uninstall entry, and
  installer labels use Mesa Code.
- Primary user-facing documentation uses Mesa Code.
- All app, tray, installer, uninstaller, and platform icon sources use the
  canonical assets under `public/logo/icons/`.

## Out of Scope

- Renaming the stable internal identifiers listed in the migration boundary.
  That requires a separate, idempotent migration proposal.
- Provider names such as `Z.ai`, which identify an external provider.

## Ownership and Boundaries

- `packages/desktop` owns product identity for the desktop executable, window,
  installer, and shortcut.
- `packages/ui` owns user-facing UI text through the i18n system.
- The root README and user-facing documentation own consistent product naming.
- Legacy naming may appear only inside explicit migration adapters, legacy
  protocol decoders, or compatibility fixtures — never in new code.

## Invariants

1. The desktop build produces a Windows NSIS installer.
2. The primary executable in the Windows package is named `MesaCode.exe`.
3. New installations use `mesa-code://`, `MESA_CODE_*`, `@mesa-code/*`, and
   `.mesaCode`.
4. The build must not add new architecture violations.
5. Packaging does not use stale generated icon assets when canonical assets
   exist.
6. The packaged application icon is set explicitly from the canonical assets
   under `public/logo/icons/` (`win.icon` = `icon.ico`, `mac.icon` = `icon.icns`,
   `linux.icon` = `512x512.png`). The build must not rely on the electron-builder
   `build/icon.*` default, which this repository does not contain; relying on it
   silently embeds the default Electron icon in the executable and taskbar.

## Canonical Brand Assets

Canonical logo sources live under `public/logo/`:

- `mesa-code-mark.svg`
- `mesa-code-logo.svg`
- `mesa-code-logo-dark.svg`
- `mesa-code-favicon.svg`
- `icons/` raster and Windows icon assets

The shared startup and onboarding badge uses the geometric Mesa Code `M` mark
from `mesa-code-mark.svg`.

## Anonymous Startup

### Product Rule

Mesa Code must open the workspace without requiring account login or OAuth when
no provider is configured. Provider API-key setup remains an optional action available from Settings. Application login and GitHub OAuth are not part of the product surface.

### State Ownership

- `Root` owns whether the Welcome/Login surface is visible.
- Provider availability remains owned by the existing provider model-selection
  state and is not converted into a startup login requirement.
- Existing OAuth, API-key, session restoration, and provider-request flows
  remain available when explicitly invoked.

### Invariants

1. Startup must not set `welcomeScreenOpenReason` to
   `startup-provider-required` solely because the user is anonymous or no
   provider is configured.
2. Workspace fallback creation and session restoration must not wait for a login
   screen.
3. Explicit login/provider requests and session-expired recovery continue to
   open the existing login surface.
4. No internal storage keys, protocol identifiers, or provider configuration
   formats change.

### Acceptance Scenarios

- A fresh anonymous installation reaches the workspace without showing a login
  page.
- A user can open Settings and configure a provider API key when needed.
- Existing authenticated users and session-expired flows preserve their current
  behavior.

## English-Only Product Language

### Product Rule

Mesa Code uses English for all user-facing application UI, onboarding, menus,
settings, errors, documentation, and repository README entry points. English is
fixed as `en-US`; the app must not resolve UI language from the operating system
or expose a language selector.

### State Ownership

- `MesaCodeIntlProvider` owns the effective UI locale and resolves it to
  `en-US`.
- Existing locale values and persisted settings remain accepted only as
  compatibility data; they must not change the rendered UI language.
- Documentation is maintained in English. Dependency-owned documentation and
  third-party notices are outside this boundary.

### Invariants

1. The effective renderer locale is always `en-US`.
2. A previous `zh-CN` or `system` preference cannot make the UI render Chinese.
3. No language switcher or language selection control is visible in the
   application.
4. Internal protocol, storage, settings schema, and locale types remain
   compatible unless a separate migration is approved.

### Acceptance Scenarios

- A fresh install and an upgrade from a Chinese/system preference both render
  English UI.
- Settings and sidebar menus do not offer language choices.
- Root and translated README documentation are English-only.

## Startup Splash

### Product Rule

While the desktop startup gate is resolving, Mesa Code shows a calm branded
splash that keeps the transparent Electron window opaque, communicates that
startup is active, and transitions away as soon as the existing startup gate
clears.

### State Ownership

- `Root` remains the sole owner of whether the startup splash is rendered.
- `RootStartupSplash` owns presentation only; it does not create timers,
  polling, or a second startup state.
- The existing localized startup status remains the source of truth for the
  status label.

### Invariants

1. The splash must render without loading external assets.
2. The splash must remain readable across all supported themes and respect
   reduced-motion preferences.
3. The splash must not delay, alter, or duplicate startup readiness decisions.
4. The splash must preserve accessible status semantics while startup is
   blocked.
5. The shared startup and onboarding badge uses the Mesa Code `M` mark, matching
   `public/logo/mesa-code-mark.svg`.

### Acceptance Scenarios

- A desktop launch paints an opaque Mesa Code brand surface before the workspace
  is ready.
- The splash and onboarding badge display the Mesa Code `M` mark.
- The startup status is visible and announces progress through the existing
  status region.
- When startup readiness clears, the splash unmounts and the normal workspace
  appears.
- Reduced-motion users see the same information without decorative animation.

## Acceptance Scenarios

- Opening the built application shows `Mesa Code` in the title and application
  metadata.
- The Windows installer and uninstall entry show `Mesa Code`.
- The primary executable is named `MesaCode.exe`.
- The application reads existing sessions and configuration without a data
  migration.
- `pnpm typecheck`, `pnpm lint`, and `pnpm architecture:check --changed` pass.
- Windows packaging can produce an `.exe` installer in an environment with
  symbolic link rights or Developer Mode.

## Migration Boundary

The stable identifiers below are the current, intended names. Renaming them
requires a separate, idempotent migration proposal and must never silently
discard existing data:

- `@mesa-code/*` package scope
- `apps/mesa-code-cli`
- `MESA_CODE_*` environment variables
- `.mesaCode/` storage and `.mesaCodeignore`
- `mesa-code://` deep links
- `mesa-code-protocol` modules
