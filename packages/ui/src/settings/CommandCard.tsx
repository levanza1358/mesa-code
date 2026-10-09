import { Terminal } from "lucide-react";
import type { UserCommand, MesaCodeCommand } from "@mesa-code/shared";
import { isPluginCommand, isUserCommand } from "@mesa-code/shared";
import { useMesaCodeIntl } from "@/i18n/IntlProvider.js";
import { Switch } from "@/components/ui/switch.js";
import { settingsResourceRowInteraction } from "@/settings/settingsResourceRowInteraction.js";
import { PluginAvatar } from "@/settings/PluginAvatar.js";
import type { ManagedPluginItem } from "@/settings/pluginListing.js";

export function isEditableUserCommand(command: MesaCodeCommand): command is UserCommand {
  return isUserCommand(command) && command.location.source === "mesa-code";
}

interface CommandCardProps {
  command: MesaCodeCommand;
  onEdit?: (command: MesaCodeCommand) => void;
  onToggle?: (command: MesaCodeCommand, enabled: boolean) => void;
  isOperating?: boolean;
  pluginIconItem?: Pick<ManagedPluginItem, "name" | "listing">;
}

export function CommandCard({
  command,
  onEdit,
  onToggle,
  isOperating,
  pluginIconItem,
}: CommandCardProps) {
  const { intl } = useMesaCodeIntl();
  const canEdit = isEditableUserCommand(command);
  const editable = canEdit && Boolean(onEdit) && !isOperating;

  return (
    <div
      className={`grid cursor-default grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 transition-colors ${editable ? "hover:bg-hover" : ""}`}
      {...settingsResourceRowInteraction(editable ? () => onEdit?.(command) : undefined)}
    >
      {isPluginCommand(command) && pluginIconItem ? (
        <PluginAvatar
          item={pluginIconItem}
          className="size-9 bg-background"
          fallbackIcon={<Terminal className="size-4" />}
        />
      ) : (
        <div
          className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-background text-foreground-subtle"
          aria-hidden="true"
        >
          <Terminal className="size-4" />
        </div>
      )}

      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="truncate text-ui-base font-medium text-foreground">{command.name}</span>
          {command.argumentHint ? (
            <span className="text-ui-base text-foreground-subtlest">{command.argumentHint}</span>
          ) : null}
        </div>
        <p className="mt-0.5 line-clamp-2 text-ui-sm text-foreground-subtle">
          {command.description || intl.formatMessage({ id: "settings.commands.noDescription" })}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {isUserCommand(command) && onToggle ? (
          <Switch
            checked={command.enabled}
            onCheckedChange={(enabled) => onToggle(command, enabled)}
            disabled={isOperating}
          />
        ) : null}
      </div>
    </div>
  );
}
