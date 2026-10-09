import type { UiLocale, SupportedLocale } from "@mesa-code/contracts";
import { enUS } from "./locales/en-US.js";
import { zhCN } from "./locales/zh-CN.js";
import {
  DEFAULT_LOCALE,
  detectLocale,
  isSupportedLocale,
  isUiLocale,
  resolveLocale,
  SUPPORTED_LOCALES,
} from "./locale.js";
import type { MesaCodeCopy } from "./types.js";

export {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  detectLocale,
  isSupportedLocale,
  isUiLocale,
  resolveLocale,
};
export type { LocaleDetectionInput } from "./locale.js";
export type { CliCopy, TuiCopy, UiLocale, SupportedLocale, MesaCodeCopy } from "./types.js";

const CATALOGS: Record<SupportedLocale, MesaCodeCopy> = {
  "en-US": enUS,
  "zh-CN": zhCN,
};

export function getMesaCodeCopy(locale?: UiLocale | string, detected?: string | null): MesaCodeCopy {
  return CATALOGS[resolveLocale(locale, detected)];
}
