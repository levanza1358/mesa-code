import { TID_MOBILE_SIDEBAR_TOGGLE } from "@mesa-code/shared";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button.js";
import { useMesaCodeIntl } from "@/i18n/IntlProvider.js";

/**
 * Web phone layout: opens the off-canvas navigation drawer.
 *
 * Rendered only when the web client is on the phone layout (`isMobileWeb`), never
 * on desktop — the desktop shell already has its own sidebar toggle in the window
 * chrome. The drawer itself is the existing `isSidebarVisible` state in the shell;
 * this button just flips it. The button carries a tooltip-free `title`/`aria-label`
 * because touch devices have no hover affordance.
 */
export function MobileSidebarToggleButton({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const { intl } = useMesaCodeIntl();
  const label = intl.formatMessage({ id: "workspace.mobileMenu" });

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-md"
      data-testid={TID_MOBILE_SIDEBAR_TOGGLE}
      className="shrink-0 text-foreground hover:bg-hover hover:text-foreground [app-region:no-drag]"
      aria-label={label}
      title={label}
      onClick={onToggleSidebar}
    >
      <Menu className="size-4" />
    </Button>
  );
}
