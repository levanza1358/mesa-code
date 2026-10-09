import {
  createContext,
  useContext,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

const WORKSPACE_SIDEBAR_DEFAULT_WIDTH_PX = 264;
const WORKSPACE_SIDEBAR_MIN_WIDTH_PX = 264;
const WORKSPACE_SIDEBAR_WIDTH_STORAGE_KEY = "mesaCode:workspace-shell:sidebar-width-px";

interface WorkspaceSidebarWidthContextValue {
  hasStoredWidth: boolean;
  widthPx: number;
  setWidthPx: (widthPx: number) => void;
}

const WorkspaceSidebarWidthContext = createContext<WorkspaceSidebarWidthContextValue | null>(null);

function readStoredWorkspaceSidebarWidth(): { hasStoredWidth: boolean; widthPx: number } {
  if (typeof window === "undefined") {
    return { hasStoredWidth: false, widthPx: WORKSPACE_SIDEBAR_DEFAULT_WIDTH_PX };
  }

  try {
    const raw = window.localStorage.getItem(WORKSPACE_SIDEBAR_WIDTH_STORAGE_KEY);
    const parsed = Number(raw);
    return raw !== null && Number.isFinite(parsed) && parsed >= WORKSPACE_SIDEBAR_MIN_WIDTH_PX
      ? { hasStoredWidth: true, widthPx: Math.round(parsed) }
      : { hasStoredWidth: false, widthPx: WORKSPACE_SIDEBAR_DEFAULT_WIDTH_PX };
  } catch {
    return { hasStoredWidth: false, widthPx: WORKSPACE_SIDEBAR_DEFAULT_WIDTH_PX };
  }
}

function persistWorkspaceSidebarWidthPx(widthPx: number) {
  try {
    window.localStorage.setItem(WORKSPACE_SIDEBAR_WIDTH_STORAGE_KEY, String(Math.round(widthPx)));
  } catch {
    // Local storage can be unavailable in restricted browser contexts.
  }
}

export function WorkspaceSidebarWidthProvider({ children }: { children: ReactNode }) {
  const [storedWidth] = useState(readStoredWorkspaceSidebarWidth);
  const [hasStoredWidth, setHasStoredWidth] = useState(storedWidth.hasStoredWidth);
  const [widthPx, setStoredWidthPx] = useState(storedWidth.widthPx);
  const value = useMemo<WorkspaceSidebarWidthContextValue>(
    () => ({
      hasStoredWidth,
      widthPx,
      setWidthPx: (nextWidthPx) => {
        const resolvedWidthPx = Math.max(WORKSPACE_SIDEBAR_MIN_WIDTH_PX, Math.round(nextWidthPx));
        setStoredWidthPx(resolvedWidthPx);
        setHasStoredWidth(true);
        persistWorkspaceSidebarWidthPx(resolvedWidthPx);
      },
    }),
    [hasStoredWidth, widthPx],
  );

  return (
    <WorkspaceSidebarWidthContext.Provider value={value}>
      <div
        className="relative h-full w-full"
        style={{ "--workspace-sidebar-width": `${widthPx}px` } as CSSProperties}
      >
        {children}
      </div>
    </WorkspaceSidebarWidthContext.Provider>
  );
}

export function useWorkspaceSidebarWidth() {
  const value = useContext(WorkspaceSidebarWidthContext);
  if (!value) {
    throw new Error("useWorkspaceSidebarWidth must be used within WorkspaceSidebarWidthProvider");
  }
  return value;
}
