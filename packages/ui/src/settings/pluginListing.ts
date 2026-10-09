import type {
  MesaCodeAvailablePluginSummary,
  MesaCodeInstalledPluginSummary,
  MesaCodePluginInfo,
  MesaCodePluginStoreListing,
} from "@mesa-code/shared";
import { resolveLocalizedText, resolvePluginDisplayName } from "@mesa-code/shared";

export { resolveLocalizedText, resolvePluginDisplayName } from "@mesa-code/shared";

export { isTrustedImageUrl } from "@/lib/trustedImageUrl.js";

/**
 * 仅在名称唯一时允许从目录条目回退解析 listing。
 * 能力协议的旧 payload 可能没有 pluginId；同名插件并存时继续按裸名称 join
 * 会把第三方条目的品牌和图标误挂到另一个 marketplace，安全降级为 slug 更可靠。
 */
export function resolveUniquePluginListingByName(
  plugins: readonly Pick<MesaCodeAvailablePluginSummary, "name" | "listing">[],
  name: string,
): MesaCodePluginStoreListing | undefined {
  const normalizedName = name.trim().toLocaleLowerCase();
  let match: MesaCodePluginStoreListing | undefined;
  let count = 0;
  for (const plugin of plugins) {
    if (plugin.name.trim().toLocaleLowerCase() !== normalizedName) continue;
    count += 1;
    match = plugin.listing;
  }
  return count === 1 ? match : undefined;
}

/**
 * 插件展示条目：把目录条目（listing/安装态）、运行时插件信息（启用态/组件）
 * 与已安装记录（更新徽标/安装时间）按 id join 成 UI 单一视图模型。
 */
export interface ManagedPluginItem {
  id: string;
  name: string;
  marketplace: string;
  installed: boolean;
  /** 已卸载的内置插件（可恢复）。 */
  restorable: boolean;
  /** 已安装但原 marketplace 已移除；仍可运行和管理，但不能更新。 */
  orphaned: boolean;
  listing?: MesaCodePluginStoreListing;
  summary?: MesaCodeAvailablePluginSummary;
  /** 运行时信息（仅已发现的已安装插件有）：启用态、组件、manifest 回退字段。 */
  info?: MesaCodePluginInfo;
  installedMeta?: MesaCodeInstalledPluginSummary;
}

export type PluginUpdateStatus = NonNullable<MesaCodeInstalledPluginSummary["updateStatus"]>;

export function isPluginUpdatePending(
  updateStatus: PluginUpdateStatus | undefined,
): updateStatus is Exclude<PluginUpdateStatus, "none"> {
  return updateStatus === "update-available" || updateStatus === "version-changed";
}

/**
 * 孤立插件可能保留删除来源前的 updateStatus；若各入口只判断该缓存状态，
 * 详情页会在菜单已禁用更新时仍显示更新按钮。更新能力必须同时满足“来源存在”和“有更新”。
 */
export function canUpdatePluginItem(
  item: Pick<ManagedPluginItem, "installedMeta" | "orphaned"> | null | undefined,
): boolean {
  return Boolean(item && !item.orphaned && isPluginUpdatePending(item.installedMeta?.updateStatus));
}

export function resolveLocalizedList(
  locale: string,
  base: string[] | undefined,
  i18n: Record<string, string[]> | undefined,
): string[] | undefined {
  if (i18n) {
    const exact = i18n[locale];
    if (exact && exact.length > 0) return exact;
    const language = locale.split("-")[0];
    if (language) {
      const match = Object.entries(i18n).find(([key]) => key.split("-")[0] === language);
      if (match?.[1] && match[1].length > 0) return match[1];
    }
  }
  return base && base.length > 0 ? base : undefined;
}

export function resolveItemDisplayName(item: ManagedPluginItem, locale: string): string {
  return resolvePluginDisplayName(item, locale);
}

export function resolveItemDescription(
  item: ManagedPluginItem,
  locale: string,
): string | undefined {
  const base =
    item.summary?.description ?? item.info?.description ?? item.installedMeta?.description;
  return resolveLocalizedText(locale, base, item.listing?.descriptionI18n);
}

/** 管理列表复用完整 ID 关联的展示信息，避免英文 manifest 绕过本地化。 */
export function resolveManagedPluginDisplay(
  plugin: MesaCodePluginInfo,
  item: ManagedPluginItem | undefined,
  locale: string,
): { name: string; description: string | undefined } {
  const matchingItem = item?.id === plugin.id ? item : undefined;
  return {
    name: resolvePluginDisplayName(matchingItem ?? plugin, locale),
    description: matchingItem ? resolveItemDescription(matchingItem, locale) : plugin.description,
  };
}

/**
 * 把 overview 数据 join 成插件条目集合。
 * 条目宇宙 = availablePlugins ∪ 已安装记录 ∪ 运行时实际发现的插件包（覆盖 inline/孤儿插件）。
 */
export function buildManagedPluginItems(input: {
  availablePlugins: MesaCodeAvailablePluginSummary[];
  installedPlugins: MesaCodeInstalledPluginSummary[];
  plugins: MesaCodePluginInfo[];
}): ManagedPluginItem[] {
  const infoById = new Map(input.plugins.map((plugin) => [plugin.id, plugin]));
  const metaById = new Map(input.installedPlugins.map((item) => [item.id, item]));
  const items = new Map<string, ManagedPluginItem>();

  for (const summary of input.availablePlugins) {
    const info = infoById.get(summary.id);
    items.set(summary.id, {
      id: summary.id,
      name: summary.name,
      marketplace: summary.marketplace,
      installed:
        info?.packageStatus === "missing" ? false : summary.installed || info !== undefined,
      restorable: false,
      orphaned: false,
      ...(summary.listing ? { listing: summary.listing } : {}),
      summary,
      ...(info ? { info } : {}),
      ...(metaById.get(summary.id) ? { installedMeta: metaById.get(summary.id) } : {}),
    });
  }

  // 运行时发现、但不在任何目录里的插件（inline、内置）也要可见/可搜索。
  for (const info of input.plugins) {
    if (items.has(info.id)) continue;
    // 旧插件拆分/下架后，配置仍会生成缺包诊断；它不是可安装目录来源。
    if (info.packageStatus === "missing") continue;
    items.set(info.id, {
      id: info.id,
      name: info.name,
      marketplace: info.marketplace,
      installed: true,
      restorable: false,
      // official/inline 插件不能由目录缺失推导成孤立安装。
      orphaned: false,
      info,
      ...(metaById.get(info.id) ? { installedMeta: metaById.get(info.id) } : {}),
    });
  }
  return [...items.values()];
}
