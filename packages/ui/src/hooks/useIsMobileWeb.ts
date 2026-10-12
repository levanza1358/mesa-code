import { useEffect, useState } from "react";

/**
 * Width at or below which the web client switches to the phone layout.
 *
 * Tailwind's `md` breakpoint is 768px, so `max-width: 767px` is exactly the
 * `max-md:` range. The two must stay in sync: the CSS half of the phone layout
 * (Settings master-detail, the `#content` min-width) is expressed with `max-md:`
 * variants, while this hook drives the parts that genuinely need JavaScript —
 * the off-canvas sidebar drawer and the scrim behind it.
 */
export const MOBILE_WEB_MEDIA_QUERY = "(max-width: 767px)";

/**
 * Pure predicate for the isDesktop gate, kept separate so it can be unit-tested
 * without a DOM.
 */
export function shouldUseMobileWebLayout(params: {
  isDesktop?: boolean;
  matchesMobileMediaQuery: boolean;
}): boolean {
  return !params.isDesktop && params.matchesMobileMediaQuery;
}

/**
 * True only for the web client rendered in a phone-width viewport.
 *
 * The desktop shell is never allowed onto the phone layout: `isDesktop` is an
 * explicit capability flag threaded from the Electron renderer, and when it is
 * set the hook is always false. Every mobile branch therefore lives behind
 * `isDesktop === false`, so desktop behaviour cannot change through this path
 * even if a desktop window is narrowed below 768px.
 *
 * The initial value is `false` rather than the synchronous media-query result so
 * the first paint (and any SSR pass) never flashes the drawer open; the effect
 * corrects it on mount and then follows viewport changes.
 */
export function useIsMobileWeb(
  isDesktop?: boolean,
  mediaQuery: string = MOBILE_WEB_MEDIA_QUERY,
): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const query = window.matchMedia(mediaQuery);
    const update = () => {
      setMatches(query.matches);
    };
    update();

    if (typeof query.addEventListener === "function") {
      query.addEventListener("change", update);
      return () => {
        query.removeEventListener("change", update);
      };
    }

    query.addListener(update);
    return () => {
      query.removeListener(update);
    };
  }, [mediaQuery]);

  return shouldUseMobileWebLayout({ isDesktop, matchesMobileMediaQuery: matches });
}
