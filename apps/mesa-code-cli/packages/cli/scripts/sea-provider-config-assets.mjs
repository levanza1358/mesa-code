import { loadBuiltinProviderConfig } from "../../../../../scripts/builtin-provider-config.mjs";

export const SEA_MESA_CODE_BUILTIN_PROVIDER_CONFIG_ASSET_KEY = "mesa-code-provider/mesa-code-builtin.json";

export const collectSeaProviderConfigAssets = async ({ root, env = process.env }) => {
  const { sourcePath } = await loadBuiltinProviderConfig({ root, env });
  return {
    [SEA_MESA_CODE_BUILTIN_PROVIDER_CONFIG_ASSET_KEY]: sourcePath,
  };
};
