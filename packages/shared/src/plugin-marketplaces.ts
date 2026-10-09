export interface DefaultPluginMarketplace {
  id: string;
  source: string;
  name: string;
  description: string;
  pluginCount: number;
  lastUpdated?: string;
}

export const MESA_CODE_OFFICIAL_PLUGIN_MARKETPLACE_ID = "mesa-code-plugins-official";

/** Settings 三类资源发现共用；Bootstrap 单测与官方 definition 的 defaultEnabled 机械对照。 */
export const DEFAULT_ENABLED_OFFICIAL_PLUGIN_IDS: ReadonlySet<string> = new Set([
  "browser-use@mesa-code-plugins-official",
  "image-search@mesa-code-plugins-official",
  "documents@mesa-code-plugins-official",
  "pdf@mesa-code-plugins-official",
  "presentations@mesa-code-plugins-official",
  "spreadsheets@mesa-code-plugins-official",
  // node_repl 宿主：不进市场、不对用户露出，也不贡献任何 skill/command/subagent，但必须
  // 始终可用 —— node_repl 的注册门禁是「Browser Use 或 Computer Use 任一启用」，宿主自己
  // 不参与那个判断。Browser Use 默认开着，宿主若默认关就等于它上来就没有宿主。
  "node-repl-host@mesa-code-plugins-official",
  "skill-creator@mesa-code-plugins-official",
  "plugin-creator@mesa-code-plugins-official",
  "mesa-code-guide@mesa-code-plugins-official",
  "development-toolkit@mesa-code-plugins-official",
  "frontend-toolkit@mesa-code-plugins-official",
  "quality-toolkit@mesa-code-plugins-official",
  "data-toolkit@mesa-code-plugins-official",
  "writing-toolkit@mesa-code-plugins-official",
  "project-toolkit@mesa-code-plugins-official",
  "testing-toolkit@mesa-code-plugins-official",
  "docs-toolkit@mesa-code-plugins-official",
  "database-toolkit@mesa-code-plugins-official",
  "mobile-toolkit@mesa-code-plugins-official",
  "cloud-ops-toolkit@mesa-code-plugins-official",
  "ai-engineering-toolkit@mesa-code-plugins-official",
  // 电脑控制回退为默认关闭，故 computer-use 不在此名单内。
  // 该集合必须与 official-plugin-definitions.ts 里标了 defaultEnabled 的插件逐一对应，
  // bootstrap 的「Settings 默认启用集合与 CLI 的官方插件声明一致」单测机械对照两者。
]);

export const DEFAULT_PLUGIN_MARKETPLACES: DefaultPluginMarketplace[] = [
  {
    // MesaCode 官方唯一市场：本地 seed 分片与 CDN 分片在 Agent storage 内合并。
    // CDN manifest 的 name 必须与该 canonical id 一致。
    id: MESA_CODE_OFFICIAL_PLUGIN_MARKETPLACE_ID,
    source: "https://cdn-mesa-code.z.ai/mesa-code/official-plugin/marketplace.json",
    name: MESA_CODE_OFFICIAL_PLUGIN_MARKETPLACE_ID,
    description:
      "Official MesaCode plugins marketplace: built-in and community plugins for MesaCode.",
    pluginCount: 0,
  },
];

// 商店「公开」分段只有一个 MesaCode 官方市场 id，内置与 CDN 不再拆分身份。
export const PUBLIC_STORE_MARKETPLACE_IDS = [MESA_CODE_OFFICIAL_PLUGIN_MARKETPLACE_ID] as const;

export function isPublicStoreMarketplaceId(id: string): boolean {
  return (PUBLIC_STORE_MARKETPLACE_IDS as readonly string[]).includes(id);
}
