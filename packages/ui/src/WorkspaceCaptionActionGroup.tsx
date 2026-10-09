import type { CSSProperties } from "react";
import type { RemoteTarget } from "@mesa-code/shared";
import { WorkspaceEditorButtonGroup } from "@/WorkspaceEditorButtonGroup.js";
import { WorkspaceSidePaneToggleButton } from "@/WorkspaceSidePaneToggleButton.js";
import { WorkspaceTerminalToggleButton } from "@/WorkspaceTerminalToggleButton.js";
import {
  createWindowsCaptionControlsStyle,
  WINDOWS_CAPTION_CONTROLS_RIGHT_INSET_VAR,
} from "@/windowCaptionControls.js";

/**
 * The renderer caption cells that sit against the native window buttons.
 *
 * This is a single overlay pinned to the window's right edge, not a cell group that
 * lives inside a surface. The conversation header is nested in the resizable
 * conversation panel, so a cell hosted there slides left whenever the side pane opens
 * and then jumps back as the pane closes. Anchoring the cells to the window instead
 * means their position is independent of the pane state: only their open/selected
 * styling changes, never their place.
 *
 * The overlay only pads the native band width, so the cells land flush against the
 * first native button, and it spans the title-bar height so a hover surface is the
 * same square cell as the OS cells. The padding area is `pointer-events-none` so it
 * never covers the native buttons; the cells themselves stay clickable and are
 * `no-drag` while the surrounding title bar remains draggable.
 */
export function WorkspaceCaptionActionGroup({
  isTerminalOpen,
  onToggleTerminal,
  disabledReason,
  isSidePaneOpen,
  onToggleSidePane,
  toggleSidePaneShortcutLabel,
  workspaceAbsPath,
  workspaceIdentity,
  remoteTarget,
}: {
  workspaceAbsPath: string;
  workspaceIdentity?: string;
  remoteTarget?: RemoteTarget;
  isTerminalOpen?: boolean;
  onToggleTerminal?: () => void;
  disabledReason?: string;
  isSidePaneOpen: boolean;
  onToggleSidePane: () => void;
  toggleSidePaneShortcutLabel?: string;
}) {
  const bandStyle: CSSProperties = {
    ...createWindowsCaptionControlsStyle(),
    paddingRight: WINDOWS_CAPTION_CONTROLS_RIGHT_INSET_VAR,
  };

  return (
    <div
      data-windows-caption-band=""
      style={bandStyle}
      className="pointer-events-none absolute top-0 right-0 z-30 flex h-12 items-stretch"
    >
      <div className="pointer-events-auto flex h-full items-stretch [app-region:no-drag]">
        <WorkspaceEditorButtonGroup
          workspaceAbsPath={workspaceAbsPath}
          workspaceIdentity={workspaceIdentity}
          remoteTarget={remoteTarget}
          disabledReason={disabledReason}
          useWindowsCaptionSpacing
        />
        {onToggleTerminal ? (
          <WorkspaceTerminalToggleButton
            isTerminalOpen={Boolean(isTerminalOpen)}
            onToggleTerminal={onToggleTerminal}
            disabledReason={disabledReason}
            useWindowsCaptionSpacing
          />
        ) : null}
        <WorkspaceSidePaneToggleButton
          isSidePaneOpen={isSidePaneOpen}
          onToggleSidePane={onToggleSidePane}
          shortcutLabel={toggleSidePaneShortcutLabel}
          useWindowsCaptionSpacing
        />
      </div>
    </div>
  );
}
