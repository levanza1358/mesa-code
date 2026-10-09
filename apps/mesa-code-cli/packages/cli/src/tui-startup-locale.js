import { createConfig } from "@mesa-code/adapters/config";
import { resolveLocale } from "@mesa-code/i18n";
const localeCliOverrides = (locale) => locale
    ? {
        ui: {
            locale,
        },
    }
    : undefined;
export function resolveTuiStartupLocale({ deps, options, workingDirectory, }) {
    const configResult = createConfig({
        cliOverrides: localeCliOverrides(options.locale),
        env: deps.env ?? process.env,
        projectConfigPath: deps.projectConfigPath,
        skipUserConfig: deps.skipUserConfig,
        userConfigPath: deps.userConfigPath,
        workingDirectory,
    });
    // login-required startup renders local TUI panels before MesaCodeApp
    // exists, so the CLI boundary must resolve persisted ui.locale itself.
    return resolveLocale(configResult.config.ui.locale, options.detectedLocale);
}
