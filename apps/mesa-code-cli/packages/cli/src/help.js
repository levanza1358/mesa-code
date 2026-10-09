import { getMesaCodeCopy } from "@mesa-code/i18n";
export function formatCliHelp(version, locale, detectedLocale) {
    return getMesaCodeCopy(locale, detectedLocale).cli.help(version);
}
