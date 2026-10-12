/**
 * Synchronous window-focus check used by notification routing.
 *
 * The delivery decision is made at the moment an event arrives, so it must read the live focus
 * state rather than a React value that may be one render behind. The desktop main process still
 * suppresses the OS notification and the pill while a window is focused, so this is the renderer
 * half of the same rule; it decides whether the focused-window toast is the channel instead.
 */
export function isWindowFocused(): boolean {
  if (typeof document === "undefined") {
    return false;
  }
  try {
    return document.hasFocus();
  } catch {
    return false;
  }
}
