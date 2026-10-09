# Desktop Development Reload

Status: Implemented

## Product behavior

In an unpackaged Mesa Code desktop development build, `Ctrl+R` on Windows and Linux, or `Cmd+R`
on macOS, reloads the focused application renderer. The development View menu exposes the same
action.

## Ownership and boundaries

Electron owns the reload shortcut through its development-only View menu role. The main process
reloads only the window renderer; it does not relaunch the application, terminate the window Host,
or restart the Agent CLI. Renderer lifecycle reconnects to the existing Host after reload.

## Invariants

- The shortcut is available only while `app.isPackaged` is false.
- The packaged application does not expose this development action.
- `pnpm dev:desktop` remains the appropriate command for validating desktop behavior.
- Vite HMR continues to update ordinary renderer changes; edits to main or preload code can still
  require restarting the desktop development process.

## Acceptance scenarios

1. With `pnpm dev:desktop` running on Windows, pressing `Ctrl+R` reloads the Mesa Code window.
2. The View menu shows Reload in an unpackaged development build and does not show it in a package.
3. After reload, the renderer reconnects to its existing Host and active session runtime.
