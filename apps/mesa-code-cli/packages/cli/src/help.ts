import { getMesaCodeCopy, type SupportedLocale, type UiLocale } from "@mesa-code/i18n";

export function formatCliHelp(
  version: string,
  locale?: UiLocale,
  detectedLocale?: SupportedLocale,
): string {
  return getMesaCodeCopy(locale, detectedLocale).cli.help(version);
}
