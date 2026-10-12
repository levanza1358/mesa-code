import { useState, type ReactNode } from "react";
import { Ellipsis } from "lucide-react";
import { Button } from "@/components/ui/button.js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.js";

/**
 * The phone-layout "…" row-menu shell.
 *
 * Why it exists: a touch screen fires no `contextmenu` event and has no right
 * mouse button, so the desktop right-click menus (`TaskListItemContextMenu`,
 * `GroupedTaskContextMenuContent`) are unreachable on a phone. Long-press cannot
 * stand in for it either — the grouped task list makes each row a dnd-kit
 * draggable with a 6px activation distance, so holding a row starts (or, with
 * finger jitter, cancels) a drag instead of opening a menu.
 *
 * So the row carries an explicit "…" button. It is a dumb shell: it owns the open
 * state and renders `children` (the caller's menu body) **only while open**, so
 * callers can resolve lazily-loaded data (task/log paths) inside the body without
 * paying for it on every idle row. Callers gate it on a touch-only signal, so a
 * mouse desktop never mounts it and its DOM is unchanged.
 */
export function TaskRowMoreMenu({
  label,
  testId,
  triggerClassName,
  onOpenChange,
  children,
}: {
  /** Accessible name for the trigger (usually the localized "More"). */
  label: string;
  testId?: string;
  triggerClassName?: string;
  /** Notifies the row so it can lazily resolve task paths only while the menu is open. */
  onOpenChange?: (open: boolean) => void;
  /** The menu body, rendered only while the menu is open. */
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu
      modal={false}
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        onOpenChange?.(nextOpen);
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className={triggerClassName}
          data-testid={testId}
          aria-label={label}
          // The row is also a drag source and a click target; keep a menu tap from
          // reaching the row (which would select the task or start a drag).
          onMouseDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <Ellipsis className="size-3.5" />
        </Button>
      </DropdownMenuTrigger>
      {open ? (
        <DropdownMenuContent
          align="start"
          className="w-56"
          // Keep focus on the pointer position; a task row has no meaningful focus
          // ring to restore to, and stealing focus would scroll the list.
          onCloseAutoFocus={(event) => event.preventDefault()}
        >
          {children}
        </DropdownMenuContent>
      ) : null}
    </DropdownMenu>
  );
}
