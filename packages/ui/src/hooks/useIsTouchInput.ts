import { useEffect, useState } from "react";

const TOUCH_INPUT_MEDIA_QUERY = "(hover: none)";

/**
 * True when the primary pointing device has no hover — i.e. a touch screen, the
 * phone case this layout targets. It is the gate for controls that only make
 * sense without a mouse (the "…" task-row menu, which replaces an unreachable
 * right-click), so a mouse/trackpad desktop never renders them and its DOM is
 * unchanged. Defaults to `false` (no touch UI until a `matchMedia` confirms it),
 * which keeps SSR, the Electron frame and desktop rendering identical.
 */
export function useIsTouchInput(mediaQuery: string = TOUCH_INPUT_MEDIA_QUERY): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return undefined;
    }
    const mediaQueryList = window.matchMedia(mediaQuery);
    setMatches(mediaQueryList.matches);
    const handleChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    if (typeof mediaQueryList.addEventListener === "function") {
      mediaQueryList.addEventListener("change", handleChange);
      return () => mediaQueryList.removeEventListener("change", handleChange);
    }
    // Safari < 14 fallback.
    mediaQueryList.addListener(handleChange);
    return () => mediaQueryList.removeListener(handleChange);
  }, [mediaQuery]);

  return matches;
}
