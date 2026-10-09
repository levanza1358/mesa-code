/**
 * Zustand Store —— 全局状态管理
 *
 * 需要跨窗口同步的状态通过 BroadcastService 广播。
 * 广播频道前缀 "state:" 表示状态同步类消息。
 */
import { create } from "zustand";
import type { IBroadcastService, BroadcastMessage } from "@mesa-code/services";
import type { CodingPlanResetType } from "@mesa-code/shared";
import type { CodePreviewSettings } from "@/lib/codePreviewSettings.js";
import type {
  CodingPlanQuotaResetUiEntries,
  CodingPlanQuotaResetUiEntry,
} from "@/lib/codingPlanQuotaResetUi.js";
import {
  applyCodingPlanQuotaResetAutoPlayedBroadcast,
  createCodingPlanQuotaResetStoreActions,
  parseCodingPlanQuotaResetAutoPlayedBroadcastMessage,
  type CodingPlanQuotaResetAutomaticObservations,
  type CodingPlanQuotaResetAutoPlayReservation,
  type CodingPlanQuotaResetAutoPlayReservationAttempt,
  type CodingPlanQuotaResetAutoPlayedSlot,
} from "@/store/codingPlanQuotaResetState.js";
import { DEFAULT_CODE_PREVIEW_SETTINGS, normalizeCodeTheme } from "@/lib/codePreviewSettings.js";
import { readSafeLocalStorage, writeSafeLocalStorage } from "@/lib/browserEnvironment.js";
import {
  applyUiFontSizePx,
  normalizeUiFontSizePx,
  UI_FONT_SIZE_STORAGE_KEY,
} from "@/lib/uiFontSize.js";
import {
  isTaskNotificationEnabled,
  isTaskNotificationSoundPreferenceEnabled,
  persistTaskNotificationEnabled,
  persistTaskNotificationSoundEnabled,
} from "@/lib/taskNotificationPreferences.js";
import { applyTheme, normalizeThemePreference, resolveTheme, type Theme } from "../useTheme.js";
import { applyAccent, normalizeAccent, writeStoredAccent, type Accent } from "../accent.js";
import {
  APPEARANCE_BROADCAST_FIELDS,
  createAppearanceSlice,
  LOCALE_STORAGE_KEY,
  THEME_STORAGE_KEY,
  type AppearanceBroadcastField,
  type AppearanceState,
} from "./appearanceState.js";

// v4 重构：类型与默认值下沉到 @/lib/codePreviewSettings.ts，
// 让纯展示组件不依赖 store；这里保留 re-export 兼容既有 import 路径。
export type { CodePreviewSettings, CodeTheme } from "@/lib/codePreviewSettings.js";
export { DEFAULT_CODE_PREVIEW_SETTINGS } from "@/lib/codePreviewSettings.js";

const CODE_PREVIEW_SETTINGS_KEY = "mesa-code-code-preview-settings";
const PERFORMANCE_MODE_STORAGE_KEY = "mesa-code-performance-mode";

function loadCodePreviewSettings(): CodePreviewSettings {
  try {
    const raw = readSafeLocalStorage(CODE_PREVIEW_SETTINGS_KEY);
    if (!raw) {
      return DEFAULT_CODE_PREVIEW_SETTINGS;
    }

    const parsed = JSON.parse(raw) as Partial<CodePreviewSettings>;
    return {
      ...DEFAULT_CODE_PREVIEW_SETTINGS,
      ...parsed,
      lightTheme: normalizeCodeTheme(parsed.lightTheme, DEFAULT_CODE_PREVIEW_SETTINGS.lightTheme),
      darkTheme: normalizeCodeTheme(parsed.darkTheme, DEFAULT_CODE_PREVIEW_SETTINGS.darkTheme),
      fontSizePx:
        typeof parsed.fontSizePx === "number"
          ? Math.min(20, Math.max(12, Math.round(parsed.fontSizePx)))
          : DEFAULT_CODE_PREVIEW_SETTINGS.fontSizePx,
    };
  } catch {
    return DEFAULT_CODE_PREVIEW_SETTINGS;
  }
}

function loadPerformanceMode(): boolean {
  return readSafeLocalStorage(PERFORMANCE_MODE_STORAGE_KEY) === "true";
}

// ============================================================================
// State 定义
// ============================================================================

export interface MesaCodeState extends AppearanceState {
  authSessionSeq: number;
  /** 代码预览设置 */
  codePreviewSettings: CodePreviewSettings;
  setCodePreviewSettings: (patch: Partial<CodePreviewSettings>) => void;

  /** 是否启用性能模式 */
  performanceMode: boolean;
  setPerformanceMode: (enabled: boolean) => void;

  /** 是否启用任务通知（桌面通知；提示音由子开关控制） */
  notificationEnabled: boolean;
  setNotificationEnabled: (enabled: boolean) => void;

  /** 是否启用任务通知声音（依附于任务通知总开关） */
  notificationSoundEnabled: boolean;
  setNotificationSoundEnabled: (enabled: boolean) => void;

  /** Coding Plan 额度重置 UI 状态；entry/观察记录只在当前窗口内共享，不持久化。 */
  codingPlanQuotaResetUiBySource: Record<string, CodingPlanQuotaResetUiEntries>;
  /** 自动/运营完成首次被观察时所属的鉴权会话，用于区分同会话后挂载和重新登录。 */
  codingPlanQuotaResetAutomaticObservationsBySource: Record<
    string,
    CodingPlanQuotaResetAutomaticObservations
  >;
  /** 自动完成提示"多窗口只播一次"的已播 used_at 记录；窗口内存态，可被广播合并。 */
  codingPlanQuotaResetAutoPlayedBySource: Record<string, CodingPlanQuotaResetAutoPlayedSlot>;
  /** 写入服务端 status / 手动 use 对账后的状态；entry 为 null 表示清空该类型。 */
  setCodingPlanQuotaResetUiEntry: (
    sourceKey: string,
    resetType: CodingPlanResetType,
    entry: CodingPlanQuotaResetUiEntry | null,
    authSessionSeq: number,
  ) => void;
  /** Composer 展示前申请临时 reservation；此阶段不写 played。 */
  reserveCodingPlanQuotaResetAutoPlay: (
    sourceKey: string,
    resetType: CodingPlanResetType,
    completedAt: number,
  ) => Promise<CodingPlanQuotaResetAutoPlayReservationAttempt>;
  /** 组件仍有效且即将展示时提交 reservation、played 与广播。 */
  commitCodingPlanQuotaResetAutoPlay: (
    reservation: CodingPlanQuotaResetAutoPlayReservation,
  ) => boolean;
  /** 组件失效时释放尚未 commit 的 reservation。 */
  releaseCodingPlanQuotaResetAutoPlay: (
    reservation: CodingPlanQuotaResetAutoPlayReservation,
  ) => Promise<void>;
}

// ============================================================================
// 需要广播的字段 —— 只有这些字段的变更会发送给其他窗口
// ============================================================================

const BROADCAST_FIELDS = new Set<string>(APPEARANCE_BROADCAST_FIELDS);

type BroadcastField = AppearanceBroadcastField;

/** 广播频道名前缀 */
const STATE_CHANNEL_PREFIX = "state:";

// ============================================================================
// Store 创建工厂
// ============================================================================

/**
 * 创建 Zustand store，连接广播服务实现跨窗口状态同步
 *
 * @param broadcastService - 广播服务。Desktop 走 RPC，Web 可传 no-op 实现
 */
export function createMesaCodeStore(broadcastService: IBroadcastService) {
  /** 标记：正在应用来自广播的更新，此时不再重复广播（防止循环） */
  let applyingBroadcast = false;
  let cleanupSystemThemeListener: (() => void) | null = null;
  let syncSystemThemeListener = (_theme: Theme) => {};

  const useStore = create<MesaCodeState>()((set, get) => ({
    ...createAppearanceSlice({
      readAccent: () => get().accent,
      readTheme: () => get().theme,
      isApplyingBroadcast: () => applyingBroadcast,
    }),
    // 外观切片负责写 storage 与文档根；这里补上它看不到的副作用：system 主题的媒体
    // 查询订阅、以及 accent 依赖解析后亮暗面的取色。两者都属于窗口生命周期状态。
    setTheme: (theme: Theme) => {
      const normalizedTheme = normalizeThemePreference(theme);
      writeSafeLocalStorage(THEME_STORAGE_KEY, normalizedTheme);
      syncSystemThemeListener(normalizedTheme);
      applyTheme(normalizedTheme);
      // The accent override lives in an inline style, so a theme change must repaint the
      // subtle tint for the new surface instead of leaving the previous one behind.
      applyAccent(get().accent, resolveTheme(normalizedTheme));
      set({ theme: normalizedTheme });
    },
    setAccent: (accent: Accent) => {
      const normalizedAccent = normalizeAccent(accent);
      writeStoredAccent(normalizedAccent);
      applyAccent(normalizedAccent, resolveTheme(get().theme));
      set({ accent: normalizedAccent });
    },
    setLocale: (locale: string) => {
      writeSafeLocalStorage(LOCALE_STORAGE_KEY, locale);
      set({ locale });
    },
    setUiFontSizePx: (fontSizePx: number) => {
      const normalizedFontSizePx = normalizeUiFontSizePx(fontSizePx);
      writeSafeLocalStorage(UI_FONT_SIZE_STORAGE_KEY, String(normalizedFontSizePx));
      applyUiFontSizePx(normalizedFontSizePx);
      set({ uiFontSizePx: normalizedFontSizePx });
    },

    codePreviewSettings: loadCodePreviewSettings(),
    setCodePreviewSettings: (patch: Partial<CodePreviewSettings>) =>
      set((state) => {
        const next = {
          ...state.codePreviewSettings,
          ...patch,
          lightTheme: normalizeCodeTheme(patch.lightTheme, state.codePreviewSettings.lightTheme),
          darkTheme: normalizeCodeTheme(patch.darkTheme, state.codePreviewSettings.darkTheme),
          fontSizePx:
            typeof patch.fontSizePx === "number"
              ? Math.min(20, Math.max(12, Math.round(patch.fontSizePx)))
              : state.codePreviewSettings.fontSizePx,
        };
        writeSafeLocalStorage(CODE_PREVIEW_SETTINGS_KEY, JSON.stringify(next));
        return { codePreviewSettings: next };
      }),

    performanceMode: loadPerformanceMode(),
    setPerformanceMode: (enabled: boolean) => {
      writeSafeLocalStorage(PERFORMANCE_MODE_STORAGE_KEY, enabled ? "true" : "false");
      set({ performanceMode: enabled });
    },

    notificationEnabled: isTaskNotificationEnabled(),
    setNotificationEnabled: (enabled: boolean) => {
      persistTaskNotificationEnabled(enabled);
      set({ notificationEnabled: enabled });
    },

    authSessionSeq: 0,
    notificationSoundEnabled: isTaskNotificationSoundPreferenceEnabled(),
    setNotificationSoundEnabled: (enabled: boolean) => {
      persistTaskNotificationSoundEnabled(enabled);
      set({ notificationSoundEnabled: enabled });
    },

    codingPlanQuotaResetUiBySource: {},
    codingPlanQuotaResetAutomaticObservationsBySource: {},
    codingPlanQuotaResetAutoPlayedBySource: {},
    ...createCodingPlanQuotaResetStoreActions({
      broadcastService,
      readState: get,
      writeState: (updater) => set((state) => updater(state)),
    }),
  }));

  syncSystemThemeListener = (theme: Theme) => {
    cleanupSystemThemeListener?.();
    cleanupSystemThemeListener = null;

    if (theme !== "system" || typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemThemeChange = () => {
      if (useStore.getState().theme !== "system") {
        return;
      }
      // system 模式需要持续订阅系统亮暗变化，不能只在切换到 system 的瞬间应用一次。
      // 否则用户后续切系统主题时，DOM 上的 dark class 不会同步更新，看起来就像“跟随系统失效”。
      applyTheme("system");
      applyAccent(useStore.getState().accent, resolveTheme("system"));
    };

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleSystemThemeChange);
      cleanupSystemThemeListener = () => {
        mediaQuery.removeEventListener("change", handleSystemThemeChange);
      };
      return;
    }

    // 某些 Electron / Chromium 组合仍然只支持旧版 MediaQueryList listener API。
    // 如果这里只调用 addEventListener，system 模式切系统主题时会完全收不到通知。
    mediaQuery.addListener(handleSystemThemeChange);
    cleanupSystemThemeListener = () => {
      mediaQuery.removeListener(handleSystemThemeChange);
    };
  };

  // Zustand v5 的 setState 在 replace=true/false 上使用了不同重载，
  // 之前直接包一层并透传 replace，会在严格类型下落到互不兼容的签名分支。
  // 这里改成订阅状态变化后再广播，只比较真正需要跨窗口同步的字段，逻辑更直观，也避免重载冲突。
  useStore.subscribe((state, prevState) => {
    if (applyingBroadcast) {
      return;
    }

    for (const field of BROADCAST_FIELDS as Set<BroadcastField>) {
      if (state[field] === prevState[field]) {
        continue;
      }

      broadcastService.send({
        channel: `${STATE_CHANNEL_PREFIX}${field}`,
        payload: state[field],
      });
    }
  });

  // 监听来自其他窗口的广播
  broadcastService.onMessage((msg: BroadcastMessage) => {
    // 自动完成"多窗口只播一次"。其他窗口广播已播 used_at 后，本窗口合并
    // played 记录并收起正在播放的同 used_at 提示；本地回声已在解析阶段被忽略。
    const autoPlayed = parseCodingPlanQuotaResetAutoPlayedBroadcastMessage(msg);
    if (autoPlayed) {
      useStore.setState((state) => applyCodingPlanQuotaResetAutoPlayedBroadcast(state, autoPlayed));
      return;
    }

    if (!msg.channel.startsWith(STATE_CHANNEL_PREFIX)) return;

    const field = msg.channel.slice(STATE_CHANNEL_PREFIX.length) as BroadcastField;
    if (!BROADCAST_FIELDS.has(field)) return;

    applyingBroadcast = true;
    try {
      // 调用对应的 setter，确保副作用（localStorage、DOM）也执行
      const state = useStore.getState();
      if (field === "theme" && typeof msg.payload === "string") {
        state.setTheme(msg.payload as Theme);
      } else if (field === "accent" && typeof msg.payload === "string") {
        state.setAccent(msg.payload as Accent);
      } else if (field === "locale" && typeof msg.payload === "string") {
        state.setLocale(msg.payload);
      } else if (field === "uiFontSizePx" && typeof msg.payload === "number") {
        state.setUiFontSizePx(msg.payload);
      }
    } finally {
      applyingBroadcast = false;
    }
  });

  syncSystemThemeListener(useStore.getState().theme);
  applyTheme(useStore.getState().theme);
  applyAccent(useStore.getState().accent, resolveTheme(useStore.getState().theme));
  applyUiFontSizePx(useStore.getState().uiFontSizePx);
  document.documentElement.classList.toggle(
    "dark",
    resolveTheme(useStore.getState().theme) === "dark",
  );

  return useStore;
}

export type MesaCodeStore = ReturnType<typeof createMesaCodeStore>;
