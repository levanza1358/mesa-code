import { useMesaCodeIntl } from "@/i18n/IntlProvider.js";
import { MesaCodeStartupLogoBadge } from "@/root/brandLogoBadge.js";
import "@/root/rootStartupSplash.css";

/**
 * Minimal startup splash shown while the desktop startup gate resolves.
 *
 * The Electron window is transparent, so an empty first frame would let the
 * desktop show through. This surface paints an opaque themed backdrop plus the
 * brand badge and a short status line, then unmounts as soon as the gate
 * clears.
 *
 * Design constraints:
 * - No timers, no polling, no state: it only animates while it is mounted.
 * - One shared CSS keyframe/pulse, fully disabled under reduced motion.
 * - No images to load, so the first paint costs nothing extra.
 */
export function RootStartupSplash() {
  const { intl } = useMesaCodeIntl();
  const label = intl.formatMessage({ id: "startup.global.silent" });
  return (
    <div
      className="root-startup-splash"
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label={label}
      data-testid="root-startup-splash"
    >
      <div className="root-startup-splash__ambient" aria-hidden="true">
        <span className="root-startup-splash__orb root-startup-splash__orb--primary" />
        <span className="root-startup-splash__orb root-startup-splash__orb--secondary" />
        <span className="root-startup-splash__grid" />
      </div>
      <div className="root-startup-splash__content">
        <div className="root-startup-splash__brand-mark">
          <MesaCodeStartupLogoBadge animated={false} />
          <span className="root-startup-splash__brand-line" />
        </div>
        <div className="root-startup-splash__copy">
          <p className="root-startup-splash__eyebrow">AI workspace</p>
          <h1 className="root-startup-splash__title">Mesa Code</h1>
          <p className="root-startup-splash__label">
            <span className="root-startup-splash__status-dot" aria-hidden="true" />
            {label}
          </p>
        </div>
      </div>
      <p className="root-startup-splash__footer">Build with clarity</p>
    </div>
  );
}
