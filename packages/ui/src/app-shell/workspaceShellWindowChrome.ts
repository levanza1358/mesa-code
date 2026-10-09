interface WorkspaceShellWindowChromeOptions {
  isMacDesktop?: boolean;
  isWindowsDesktop?: boolean;
  isLinuxDesktop?: boolean;
  macOSMajorVersion?: number | null;
}

type WorkspaceShellPlatformRadiusOptions = Pick<
  WorkspaceShellWindowChromeOptions,
  "isMacDesktop" | "isWindowsDesktop" | "isLinuxDesktop" | "macOSMajorVersion"
>;

export function resolveWorkspaceShellPanelRadiusPx({
  isMacDesktop,
  isWindowsDesktop,
  macOSMajorVersion,
}: WorkspaceShellPlatformRadiusOptions): number {
  if (isWindowsDesktop) return 5;
  // 忽略 macOS 版本会让 Sequoia 的内层 12px 圆角与原生窗口小圆角不协调。
  // 保留 4px 外层留白，旧系统和未知版本用 6px，明确识别 Tahoe 26+ 才用 12px。
  if (isMacDesktop) return (macOSMajorVersion ?? 0) >= 26 ? 12 : 6;
  return 12;
}

export function resolveWorkspaceShellResizeHandleInsetPx(
  options: WorkspaceShellPlatformRadiusOptions,
): number {
  return resolveWorkspaceShellPanelRadiusPx(options) + 4;
}

/**
 * Inner-panel frame used when the side pane is visible (the panel no longer carries the window edge).
 * Windows also stays frameless here: the OS draws the window edge, so a second outline on the
 * inner panel would read as clutter.
 */
export function resolveWorkspaceShellPanelFrameClass({
  isWindowsDesktop,
}: Pick<WorkspaceShellWindowChromeOptions, "isWindowsDesktop">): string {
  if (isWindowsDesktop) return "";
  return "rounded-(--workspace-panel-radius) border border-border";
}

export function resolveWorkspaceShellWindowChromeClass({
  isMacDesktop,
  isWindowsDesktop,
  isLinuxDesktop,
  macOSMajorVersion,
}: WorkspaceShellWindowChromeOptions): string {
  // Windows already draws the outer window edge through the native frame, so the renderer must not
  // paint a second decorative outline inside the window; the panels join the shell with no frame
  // and no extra inner rounding.
  if (isWindowsDesktop) return "";
  // Linux 与设置页一致使用 xl；面板已有独立留白，不承担系统窗口外沿。
  if (isLinuxDesktop) return "rounded-xl border border-border";
  const radius = resolveWorkspaceShellPanelRadiusPx({ isMacDesktop, macOSMajorVersion });
  return radius === 6 ? "rounded-[6px] border border-border" : "rounded-xl border border-border";
}
