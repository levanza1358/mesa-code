import { materializeMesaCodeBuiltinProviderConfig } from "@mesa-code/services/node";

declare const __MESA_CODE_BUILTIN_PROVIDER_CONFIG_JSON__: string | undefined;

interface MaterializeBundledMesaCodeBuiltinProviderConfigOptions {
  readonly environmentConfigRoot: string;
  readonly content: string;
}

/** 返回构建时嵌入远端 Server 的 MesaCode Built-in Provider Config。 */
export function readBundledMesaCodeBuiltinProviderConfig(): string {
  if (typeof __MESA_CODE_BUILTIN_PROVIDER_CONFIG_JSON__ !== "string") {
    throw new Error("当前构建未嵌入 MesaCode Built-in Provider Config");
  }
  return __MESA_CODE_BUILTIN_PROVIDER_CONFIG_JSON__;
}

/**
 * 将 MesaCode Built-in Config 原子物化到所属环境的固定资源副本。
 * 升级前退出旧进程；不保留按内容 hash 增长的历史文件。
 */
export async function materializeBundledMesaCodeBuiltinProviderConfig(
  options: MaterializeBundledMesaCodeBuiltinProviderConfigOptions,
): Promise<string> {
  return materializeMesaCodeBuiltinProviderConfig(options);
}
