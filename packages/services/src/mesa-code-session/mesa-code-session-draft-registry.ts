import type { MesaCodeSessionStateSnapshot } from "@mesa-code/shared";
import type {
  MesaCodeSessionWorkspaceTarget,
  MesaCodeTaskTarget,
} from "#src/mesa-code-session/mesa-code-session.js";

function getWorkspaceKey(target: MesaCodeSessionWorkspaceTarget): string {
  return target.workspaceIdentity?.trim() || target.workspacePath;
}

function getSessionScopedKey(target: MesaCodeTaskTarget): string {
  return `${getWorkspaceKey(target)}\0${target.sessionId}`;
}

export function createMesaCodeDeferredDraftRegistry() {
  const sessionKeys = new Set<string>();

  return {
    remember(params: MesaCodeSessionWorkspaceTarget, snapshot: MesaCodeSessionStateSnapshot): void {
      sessionKeys.add(
        getSessionScopedKey({
          workspacePath: snapshot.session.workspace.workspacePath,
          workspaceIdentity:
            snapshot.session.workspace.workspaceIdentity ?? params.workspaceIdentity,
          sessionId: snapshot.session.sessionId,
        }),
      );
    },

    has(target: MesaCodeTaskTarget): boolean {
      return sessionKeys.has(getSessionScopedKey(target));
    },

    forget(target: MesaCodeTaskTarget): void {
      sessionKeys.delete(getSessionScopedKey(target));
    },
  };
}
