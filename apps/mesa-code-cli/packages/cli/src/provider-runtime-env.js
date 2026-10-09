import { existsSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { materializeMesaCodeBuiltinProviderConfig, NodeMesaCodeBuiltinProviderConfigSource, PERSONAL_PROVIDER_CONFIG_FILE_NAME, resolveMesaCodeBuiltinCachePaths, resolveMesaCodeBuiltinClientPlatform, MESA_CODE_BUILTIN_PROVIDER_BUNDLED_CONFIG_FILE_ENV, MESA_CODE_BUILTIN_PROVIDER_CONFIG_FILE_ENV, MESA_CODE_PERSONAL_PROVIDER_CONFIG_FILE_ENV, } from "@mesa-code/provider-node";
import { resolveRuntimeMesaCodeEndpointOrigin, MESA_CODE_VERSION } from "@mesa-code/shared";
export const SEA_MESA_CODE_BUILTIN_PROVIDER_CONFIG_ASSET_KEY = "mesa-code-provider/mesa-code-builtin.json";
export function createCliProviderRefreshReporter(stderr = process.stderr) {
    return {
        onBuiltinRefreshError(error) {
            stderr.write(`MesaCode Built-in 刷新失败: ${error instanceof Error ? error.message : "unknown error"}\n`);
        },
        onBuiltinRefreshResult(event) {
            // TTL 检查不是生产事件；成功更新才默认留痕，不能输出 CDN URL 查询参数或内容。
            if (event.result === "updated" || process.env.NODE_ENV !== "production") {
                stderr.write(`MesaCode Built-in ${event.result}${event.reason ? ` (${event.reason})` : ""}${event.revision === undefined ? "" : ` revision=${event.revision} source=CDN`}\n`);
            }
        },
    };
}
/** 为运行 Core 或写入模型选择的 CLI Entry 定位同一 Environment 的 Provider Config。 */
export async function prepareCliProviderRuntimeEnv(options) {
    if (!requiresProviderRuntime(options.argv))
        return {};
    const explicitMesaCodeBuiltin = options.env[MESA_CODE_BUILTIN_PROVIDER_CONFIG_FILE_ENV]?.trim();
    const explicitPersonal = options.env[MESA_CODE_PERSONAL_PROVIDER_CONFIG_FILE_ENV]?.trim();
    const dataBaseDir = options.dataBaseDir ?? options.env.MESA_CODE_DATA_BASE_DIR?.trim() ?? homedir();
    if (explicitMesaCodeBuiltin && explicitPersonal) {
        return {
            [MESA_CODE_BUILTIN_PROVIDER_CONFIG_FILE_ENV]: explicitMesaCodeBuiltin,
            [MESA_CODE_PERSONAL_PROVIDER_CONFIG_FILE_ENV]: explicitPersonal,
        };
    }
    const mesaCodeBuiltinFilePath = explicitMesaCodeBuiltin ??
        (await resolveBundledMesaCodeBuiltinProviderConfig({
            dataBaseDir,
            entrypoint: options.entrypoint ?? process.argv[1],
            sea: options.sea ?? getSeaProviderConfigAssets(),
        }));
    const personalFilePath = explicitPersonal ?? join(dataBaseDir, ".mesaCode", "v2", PERSONAL_PROVIDER_CONFIG_FILE_NAME);
    const appVersion = options.appVersion ?? MESA_CODE_VERSION;
    const platform = options.platform ?? resolveMesaCodeBuiltinClientPlatform();
    const mesaCodeEndpointOrigin = resolveRuntimeMesaCodeEndpointOrigin(options.env);
    const cachePaths = resolveMesaCodeBuiltinCachePaths({
        environmentConfigRoot: join(dataBaseDir, ".mesaCode", "v2"),
        platform,
        appVersion,
        mesaCodeEndpointOrigin,
    });
    const source = new NodeMesaCodeBuiltinProviderConfigSource({
        bundledFilePath: mesaCodeBuiltinFilePath,
        activeFilePath: cachePaths.activeFilePath,
        watch: false,
    });
    // 入口只准备资源和路径；下载由 Prompt/TUI 长生命周期 Runtime 持有并取消。
    try {
        await source.read();
    }
    finally {
        source.dispose();
    }
    return {
        [MESA_CODE_BUILTIN_PROVIDER_CONFIG_FILE_ENV]: cachePaths.activeFilePath,
        [MESA_CODE_BUILTIN_PROVIDER_BUNDLED_CONFIG_FILE_ENV]: mesaCodeBuiltinFilePath,
        [MESA_CODE_PERSONAL_PROVIDER_CONFIG_FILE_ENV]: personalFilePath,
    };
}
function requiresProviderRuntime(argv) {
    if (argv.some((arg) => arg === "--help" || arg === "-h" || arg === "--version" || arg === "-v")) {
        return false;
    }
    if (argv.some((arg) => arg === "--prompt" ||
        arg.startsWith("--prompt=") ||
        arg === "--target" ||
        arg.startsWith("--target="))) {
        return true;
    }
    const command = argv[0];
    if (command === undefined || command.startsWith("-"))
        return true;
    return (command === "tui" ||
        command === "app-server" ||
        command === "agent-server" ||
        command === "login" ||
        command === "logout");
}
async function resolveBundledMesaCodeBuiltinProviderConfig(input) {
    if (input.sea?.isSea()) {
        const content = input.sea.getAsset(SEA_MESA_CODE_BUILTIN_PROVIDER_CONFIG_ASSET_KEY, "utf8");
        return materializeMesaCodeBuiltinProviderConfig({
            environmentConfigRoot: join(input.dataBaseDir, ".mesaCode", "v2"),
            content,
        });
    }
    const entrypoint = input.entrypoint?.trim();
    if (!entrypoint)
        throw new Error("无法定位 CLI MesaCode Built-in Provider Config：缺少入口路径");
    // 全局 bin 可以是软链接，随包配置必须相对真实入口定位。
    const entryDirectory = dirname(realpathSync(resolve(entrypoint)));
    const candidates = [
        join(entryDirectory, "provider", "mesa-code-builtin.json"),
        resolve(entryDirectory, "../../../../../config/provider/mesa-code-builtin.json"),
    ];
    const candidate = candidates.find((filePath) => existsSync(filePath));
    if (candidate)
        return candidate;
    throw new Error(`无法定位 CLI MesaCode Built-in Provider Config：${candidates.join(", ")}`);
}
function getSeaProviderConfigAssets() {
    const getBuiltinModule = process.getBuiltinModule;
    return getBuiltinModule?.("node:sea");
}
