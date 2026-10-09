import { memo } from "react";
import { ArrowLeft, Settings } from "lucide-react";
import { TID_TASK_SETTINGS_BUTTON } from "@mesa-code/shared";
import { cn } from "@/components/lib/utils.js";
import { Button } from "@/components/ui/button.js";
import { useMesaCodeIntl } from "@/i18n/IntlProvider.js";

export const WorkspaceSidebarFooter = memo(function WorkspaceSidebarFooterComponent({
  onSettingsButtonClick,
  settingsButtonMode = "settings",
  className,
}: {
  onSettingsButtonClick?: () => void;
  settingsButtonMode?: "settings" | "back";
  className?: string;
}) {
  const { intl } = useMesaCodeIntl();
  const label = intl.formatMessage({
    id: settingsButtonMode === "back" ? "workspace.backToWorkspace" : "settings.title",
  });
  const Icon = settingsButtonMode === "back" ? ArrowLeft : Settings;
  return (
    <footer className={cn("shrink-0 px-2 py-1", className)}>
      <Button
        type="button"
        variant="ghost"
        size="lg"
        className="w-full justify-start gap-2 rounded-lg"
        data-testid={TID_TASK_SETTINGS_BUTTON}
        aria-label={label}
        disabled={!onSettingsButtonClick}
        onClick={onSettingsButtonClick}
      >
        <Icon className="size-4" aria-hidden="true" />
        <span>{label}</span>
      </Button>
    </footer>
  );
});
