import {
  Monitor,
  Moon,
  Settings,
  Settings2,
  Package,
  Bot,
  Palette,
  Sun,
  BarChart3,
  AlarmClock,
  Anchor,
  Brain,
  Blocks,
  Circle,
  Keyboard,
  HardDrive,
  Heart,
  Cloud,
  Trees,
  Gem,
  Flower2,
  Flame,
  Waves,
  Droplet,
  Network,
  Bell,
  Volume2,
} from "lucide-react";
import { isSettingsSectionEnabled, type SettingsSectionId } from "@/lib/settingsNavigation.js";
import type { Theme } from "@/useTheme.js";

export const THEME_MODES: Array<{
  mode: Theme;
  icon: typeof Sun;
}> = [
  { mode: "system", icon: Monitor },
  { mode: "zai-dark", icon: Moon },
  { mode: "zai-light", icon: Sun },
  { mode: "black", icon: Circle },
  { mode: "midnight", icon: Cloud },
  { mode: "ocean", icon: Waves },
  { mode: "forest", icon: Trees },
  { mode: "purple", icon: Gem },
  { mode: "rose", icon: Flower2 },
  { mode: "amber", icon: Flame },
  { mode: "liquid", icon: Droplet },
];

type SettingsSectionGroupId = "general" | "agent" | "data";

interface SettingsSectionDefinition {
  id: SettingsSectionId;
  icon: typeof Settings;
  titleId: string;
  contentTitleId?: string;
  titleBadgeId?: string;
  groupId: SettingsSectionGroupId;
}

const BASE_SETTINGS_SECTION_GROUPS: Array<{
  id: SettingsSectionGroupId;
  titleId: string;
}> = [
  { id: "general", titleId: "settings.sidebar.group.general" },
  { id: "agent", titleId: "settings.sidebar.group.agent" },
  { id: "data", titleId: "settings.sidebar.group.data" },
];

const BASE_SETTINGS_SECTIONS: SettingsSectionDefinition[] = [
  {
    id: "general",
    icon: Settings2,
    titleId: "settings.systemTitle",
    groupId: "general",
  },
  {
    id: "appearance",
    icon: Palette,
    titleId: "settings.appearanceTitle",
    groupId: "general",
  },
  {
    id: "notifications",
    icon: Bell,
    titleId: "settings.notifications.title",
    groupId: "general",
  },
  {
    id: "sound",
    icon: Volume2,
    titleId: "settings.sound.title",
    groupId: "general",
  },
  {
    id: "shortcuts",
    icon: Keyboard,
    titleId: "settings.shortcuts.title",
    groupId: "general",
  },
  {
    id: "modelProvider",
    icon: Package,
    titleId: "settings.modelProviderTitle",
    groupId: "agent",
  },
  {
    id: "memory",
    icon: Brain,
    titleId: "settings.memory",
    groupId: "agent",
  },
  {
    id: "soul",
    icon: Heart,
    titleId: "settings.soul.title",
    groupId: "agent",
  },
  {
    id: "subagents",
    icon: Bot,
    titleId: "settings.subagents.title",
    groupId: "agent",
  },
  // 插件 / MCP / 技能 / 命令同属「扩展 Agent 能力」，合并为一个 Extensions 分区，
  // 内部以子 tab 切换，减少侧栏噪音。
  {
    id: "extensions",
    icon: Blocks,
    titleId: "settings.extensions.title",
    groupId: "agent",
  },
  {
    id: "hooks",
    icon: Anchor,
    titleId: "settings.hooks.title",
    groupId: "agent",
  },
  {
    id: "automations",
    icon: AlarmClock,
    titleId: "settings.automations.title",
    titleBadgeId: "settings.automations.betaBadge",
    groupId: "agent",
  },
  {
    id: "usage",
    icon: BarChart3,
    titleId: "settings.usageTitle",
    groupId: "data",
  },
  {
    id: "dataLocation",
    icon: HardDrive,
    titleId: "settings.dataLocation.title",
    groupId: "data",
  },
  {
    // Desktop-only: the LAN listener runs in the desktop window host.
    id: "network",
    icon: Network,
    titleId: "settings.network.title",
    groupId: "data",
  },
];

// Web view: the network section is desktop-only, so the platform-free default
// config never lists it.
const WEB_HIDDEN_SETTINGS_SECTIONS = new Set<SettingsSectionId>(["network"]);

// 兼容既有只读消费者：默认配置代表不带桌面平台能力的 Web 视图。
export const SETTINGS_SECTIONS = BASE_SETTINGS_SECTIONS.filter(
  (section) =>
    isSettingsSectionEnabled(section.id) && !WEB_HIDDEN_SETTINGS_SECTIONS.has(section.id),
);

interface SettingsPageConfigOptions {
  isDesktop?: boolean;
  isMacDesktop?: boolean;
  isWindowsDesktop?: boolean;
}

export function createSettingsPageConfig(options: SettingsPageConfigOptions = {}) {
  const settingsSections = BASE_SETTINGS_SECTIONS.filter(
    (section) =>
      isSettingsSectionEnabled(section.id) &&
      (options.isDesktop || !WEB_HIDDEN_SETTINGS_SECTIONS.has(section.id)),
  );
  const settingsSectionGroups = BASE_SETTINGS_SECTION_GROUPS.map((group) => ({
    ...group,
    sections: settingsSections.filter((section) => section.groupId === group.id),
  })).filter((group) => group.sections.length > 0);

  return { settingsSectionGroups, settingsSections };
}

export function resolveSettingsSectionForPlatform(
  section: SettingsSectionId,
  visibleSections: ReadonlyArray<Pick<SettingsSectionDefinition, "id">>,
  fallbackSection: SettingsSectionId = "general",
): SettingsSectionId {
  if (visibleSections.some((candidate) => candidate.id === section)) return section;
  if (visibleSections.some((candidate) => candidate.id === fallbackSection)) {
    return fallbackSection;
  }
  return visibleSections[0]?.id ?? "general";
}

export type { SettingsSectionId };
