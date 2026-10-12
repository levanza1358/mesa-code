import { readSafeLocalStorage, writeSafeLocalStorage } from "@/lib/browserEnvironment.js";

export const LIQUID_TRANSPARENCY_STORAGE_KEY = "mesa-code-liquid-transparency";
export const DEFAULT_LIQUID_TRANSPARENCY = 55;
export const MIN_LIQUID_TRANSPARENCY = 0;
export const MAX_LIQUID_TRANSPARENCY = 100;

/** Coerce any persisted value to a whole number in [0, 100]; unknown input falls back. */
export function normalizeLiquidTransparency(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(MAX_LIQUID_TRANSPARENCY, Math.max(MIN_LIQUID_TRANSPARENCY, Math.round(value)))
    : DEFAULT_LIQUID_TRANSPARENCY;
}

export function loadLiquidTransparency(): number {
  const rawValue = readSafeLocalStorage(LIQUID_TRANSPARENCY_STORAGE_KEY);
  const storedValue = rawValue === null ? Number.NaN : Number(rawValue);
  return normalizeLiquidTransparency(Number.isFinite(storedValue) ? storedValue : undefined);
}

export function writeLiquidTransparency(value: number): void {
  writeSafeLocalStorage(LIQUID_TRANSPARENCY_STORAGE_KEY, String(normalizeLiquidTransparency(value)));
}

/**
 * Paint the Liquid theme's glass strength on the document root as `--liquid-opacity`.
 *
 * The `.theme-liquid` block (styles.css) uses this one variable in every surface
 * token, so the slider controls how strongly translucent the glass is: the setting is
 * *transparency* (0 = opaque glass, 100 = fully see-through), so the colour amount is
 * its inverse. The variable is set even when another theme is active — it is inert
 * there — so the store never has to know which theme is applied.
 */
export function applyLiquidTransparency(transparency: number): void {
  if (typeof document === "undefined") return;
  const opacity = 100 - normalizeLiquidTransparency(transparency);
  document.documentElement.style.setProperty("--liquid-opacity", `${opacity}%`);
}
