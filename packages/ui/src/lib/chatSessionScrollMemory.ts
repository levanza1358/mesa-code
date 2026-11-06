export interface ChatSessionScrollMemoryState {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
  wasPinnedToBottom?: boolean;
  updatedAt: number;
}

const CHAT_SESSION_SCROLL_MEMORY_MAX_ENTRIES = 200;
const CHAT_SESSION_SCROLL_MEMORY_STORAGE_KEY = "mesa-code-chat-scroll-memory";

const chatSessionScrollMemory = new Map<string, ChatSessionScrollMemoryState>();
let hydratedFromStorage = false;

function hydrateChatSessionScrollMemory(): void {
  if (hydratedFromStorage || typeof window === "undefined") return;
  hydratedFromStorage = true;
  try {
    const raw = window.localStorage.getItem(CHAT_SESSION_SCROLL_MEMORY_STORAGE_KEY);
    if (!raw) return;
    const entries = JSON.parse(raw) as unknown;
    if (!Array.isArray(entries)) return;
    for (const entry of entries) {
      if (!Array.isArray(entry) || typeof entry[0] !== "string" || !entry[1]) continue;
      const state = entry[1] as ChatSessionScrollMemoryState;
      if (
        Number.isFinite(state.scrollTop) &&
        Number.isFinite(state.scrollHeight) &&
        Number.isFinite(state.clientHeight) &&
        Number.isFinite(state.updatedAt)
      ) {
        chatSessionScrollMemory.set(entry[0], state);
      }
    }
    pruneChatSessionScrollMemory();
  } catch {
    // Storage can be unavailable in private/webview contexts; memory-only fallback is sufficient.
  }
}

function persistChatSessionScrollMemory(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      CHAT_SESSION_SCROLL_MEMORY_STORAGE_KEY,
      JSON.stringify([...chatSessionScrollMemory.entries()]),
    );
  } catch {
    // Storage quota/security failures must not affect scrolling.
  }
}

function normalizeKeyPart(value?: string | null): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function touchChatSessionScrollMemoryEntry(
  key: string,
  state: ChatSessionScrollMemoryState,
): ChatSessionScrollMemoryState {
  chatSessionScrollMemory.delete(key);
  chatSessionScrollMemory.set(key, state);
  return state;
}

function pruneChatSessionScrollMemory(): void {
  while (chatSessionScrollMemory.size > CHAT_SESSION_SCROLL_MEMORY_MAX_ENTRIES) {
    const oldestKey = chatSessionScrollMemory.keys().next().value;
    if (!oldestKey) {
      return;
    }

    chatSessionScrollMemory.delete(oldestKey);
  }
}

export function buildChatSessionScrollMemoryKey({
  workspacePath,
  workspaceIdentity,
  paneId,
  sessionId,
  taskId,
}: {
  workspacePath: string;
  workspaceIdentity?: string;
  paneId?: string;
  sessionId?: string | null;
  taskId?: string | null;
}): string | null {
  const workspaceKey = normalizeKeyPart(workspaceIdentity) ?? normalizeKeyPart(workspacePath);
  const paneScope = normalizeKeyPart(paneId);
  const sessionScope = normalizeKeyPart(sessionId);
  const taskScope = normalizeKeyPart(taskId);
  if (!workspaceKey) {
    return null;
  }

  const rendererScope = paneScope ? `${workspaceKey}::pane:${paneScope}` : workspaceKey;

  if (sessionScope) {
    return `${rendererScope}::session:${sessionScope}`;
  }

  return taskScope ? `${rendererScope}::task:${taskScope}` : null;
}

export function readChatSessionScrollMemoryState(
  key: string | null,
): ChatSessionScrollMemoryState | null {
  hydrateChatSessionScrollMemory();
  if (!key) {
    return null;
  }

  const state = chatSessionScrollMemory.get(key);
  return state ? touchChatSessionScrollMemoryEntry(key, state) : null;
}

export function saveChatSessionScrollMemoryState(
  key: string | null,
  state: ChatSessionScrollMemoryState,
): void {
  if (!key) {
    return;
  }

  hydrateChatSessionScrollMemory();
  touchChatSessionScrollMemoryEntry(key, state);
  pruneChatSessionScrollMemory();
  persistChatSessionScrollMemory();
}

export function resolveChatSessionScrollRestoreTop(
  state: Pick<ChatSessionScrollMemoryState, "scrollTop">,
  metrics: Pick<HTMLElement, "clientHeight" | "scrollHeight">,
): number {
  const maxScrollTop = Math.max(metrics.scrollHeight - metrics.clientHeight, 0);
  return Math.min(Math.max(state.scrollTop, 0), maxScrollTop);
}
