import type {
  MesaCodeTaskMeta,
  MesaCodeProvider,
  MesaCodeTaskChangeSummary,
  EditorInfo,
  GitRepositorySummary,
  RemoteTarget,
  UserInfo,
} from "@mesa-code/shared";

export interface WorkspaceHeaderState {
  selectedProvider: MesaCodeProvider;
}

export type WorkspaceHeaderVariant = "task" | "draft";

export interface WorkspaceHeaderReloadSessionOptions {
  resumeTaskId?: string | null;
  provider?: MesaCodeProvider | null;
}

export interface WorkspaceHeaderTitleSectionProps {
  variant?: WorkspaceHeaderVariant;
  readOnlyReason?: string;
  workspaceAbsPath: string;
  remoteSessionId?: string;
  workspaceIdentity?: string;
  remoteTarget?: RemoteTarget;
  localWorkspacePath?: string;
  projectName: string;
  activeTaskTitle: string;
  activeTaskChangeSummary?: MesaCodeTaskChangeSummary | null;
  activeTaskId: string | null;
  activeTraceId: string | null;
  activeSessionId: string | null;
  activeTaskProvider: MesaCodeProvider | null;
  resolvedActiveTaskMeta?: MesaCodeTaskMeta | null;
  gitSummary: GitRepositorySummary;
  gitDirtyFileCount: number;
  sessionLogPath: string | null;
  nativeSessionLogProvider: MesaCodeProvider | null;
  nativeSessionLogPath: string | null;
  nativeSessionLogExists: boolean;
  nativeSessionLogLoading: boolean;
  onReloadSession?: (options?: WorkspaceHeaderReloadSessionOptions) => void | Promise<void>;
  reloadSessionDisabled?: boolean;
  reloadSessionPending?: boolean;
  onRefreshGit: () => void;
  workspaceHeaderState: WorkspaceHeaderState;
  isMacDesktop?: boolean;
  isMacFullscreen?: boolean;
  isWindowsDesktop?: boolean;
  simplifyForNarrowRemote?: boolean;
  selectedEditor: EditorInfo | null;
  compact?: boolean;
}

export interface WorkspaceHeaderActionSectionProps {
  variant?: WorkspaceHeaderVariant;
  activeTaskId?: string | null;
  user?: UserInfo | null;
  readOnlyReason?: string;
  workspaceAbsPath: string;
  workspaceIdentity?: string;
  remoteSessionId?: string;
  remoteTarget?: RemoteTarget;
  isDesktop?: boolean;
  isTerminalOpen: boolean;
  isSidePaneOpen: boolean;
  onToggleTerminal: () => void;
  onToggleSidePane: () => void;
  toggleSidePaneShortcutLabel?: string;
  onSelectedEditorChange?: (editor: EditorInfo | null) => void;
  simplifyForNarrowRemote?: boolean;
  showWindowControls?: boolean;
  useWindowsCaptionSpacing?: boolean;
  /**
   * On Windows the terminal and side-pane toggle cells live in a window-pinned
   * caption-band overlay (WorkspaceCaptionActionGroup), not in this header, so this
   * cluster must not draw a second copy. The header reserves the same band width, so
   * the editor group stops short of the pinned cells instead of sliding under them.
   * Non-Windows callers (macOS, Linux, web, remote) keep the cells inline.
   */
  captionBandOwnsCells?: boolean;
}
