interface RootStartupGateState {
  isResolvingStartupAuthState: boolean;
  isResolvingProviderStartupState: boolean;
  isRestoring: boolean;
  isBootstrappingInitialWorkspace: boolean;
}

interface FallbackWorkspaceCreateState {
  isMounted: boolean;
  activeWorkspacePath: string | null;
}

interface ProviderStartupSyncState {
  providerFamilyDomainMigrationComplete: boolean;
  modelSelectionViewHydrated: boolean;
}

interface ProviderStartupResolutionState {
  providerStartupSyncPending: boolean;
  providerAvailabilityStartupCheckCompleted: boolean;
}

export function shouldBlockRootRender(state: RootStartupGateState): boolean {
  return (
    state.isResolvingStartupAuthState ||
    state.isResolvingProviderStartupState ||
    state.isRestoring ||
    state.isBootstrappingInitialWorkspace
  );
}

export function shouldEnableProviderAvailabilityLoginEntryGuard(): boolean {
  // 匿名用户可以直接进入 workspace；登录和 API Key 只在用户主动连接时触发。
  return false;
}

export function shouldResolveProviderStartupState(state: ProviderStartupResolutionState): boolean {
  return state.providerStartupSyncPending || !state.providerAvailabilityStartupCheckCompleted;
}

export function shouldOpenFallbackWorkspaceAfterCreate(
  state: FallbackWorkspaceCreateState,
): boolean {
  return state.isMounted && !state.activeWorkspacePath;
}

export function isProviderStartupSyncPending(state: ProviderStartupSyncState): boolean {
  return !state.providerFamilyDomainMigrationComplete || !state.modelSelectionViewHydrated;
}
