export const MESA_CODE_BUILTIN_PROVIDER_CONFIG_FILE_ENV = "MESA_CODE_BUILTIN_PROVIDER_CONFIG_FILE";
export const MESA_CODE_BUILTIN_PROVIDER_BUNDLED_CONFIG_FILE_ENV =
  "MESA_CODE_BUILTIN_PROVIDER_BUNDLED_CONFIG_FILE";
export const MESA_CODE_PERSONAL_PROVIDER_CONFIG_FILE_ENV = "MESA_CODE_PERSONAL_PROVIDER_CONFIG_FILE";
export const PERSONAL_PROVIDER_CONFIG_FILE_NAME = "provider_config.json";

export interface NodeProviderRuntimePaths {
  readonly mesaCodeBuiltinFilePath: string;
  readonly personalFilePath: string;
}

export function createNodeProviderRuntimePathEnv(
  paths: NodeProviderRuntimePaths,
): Record<string, string> {
  return {
    [MESA_CODE_BUILTIN_PROVIDER_CONFIG_FILE_ENV]: paths.mesaCodeBuiltinFilePath,
    [MESA_CODE_PERSONAL_PROVIDER_CONFIG_FILE_ENV]: paths.personalFilePath,
  };
}

export function resolveNodeProviderRuntimePaths(
  env: Readonly<Record<string, string | undefined>>,
): NodeProviderRuntimePaths | null {
  const mesaCodeBuiltinFilePath = env[MESA_CODE_BUILTIN_PROVIDER_CONFIG_FILE_ENV]?.trim();
  const personalFilePath = env[MESA_CODE_PERSONAL_PROVIDER_CONFIG_FILE_ENV]?.trim();
  if (!mesaCodeBuiltinFilePath && !personalFilePath) return null;
  if (!mesaCodeBuiltinFilePath || !personalFilePath) {
    throw new Error("MesaCode Built-in 与 Personal Provider Config 路径必须同时提供");
  }
  return Object.freeze({ mesaCodeBuiltinFilePath, personalFilePath });
}
