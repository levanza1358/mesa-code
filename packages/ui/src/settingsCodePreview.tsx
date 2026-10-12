import type { Theme } from "@/useTheme.js";
import { ACCENT_OPTIONS, type Accent } from "@/accent.js";
import { useState } from "react";
import { resolveTheme } from "@/useTheme.js";
import { Card, CardContent } from "@/components/ui/card.js";
import { Input } from "@/components/ui/input.js";
import { Switch } from "@/components/ui/switch.js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.js";
import {
  getThemeOptionLabel,
  SettingsRow,
  ThemePreviewCard,
  ThemeSelect,
} from "@/settings/SettingsPageParts.js";
import { getCodePreviewTheme } from "@/lib/codePreviewPreferences.js";
import { useMesaCodeIntl } from "@/i18n/IntlProvider.js";
import type { CodePreviewSettings } from "@/store/index.js";
import { THEME_MODES } from "@/settings/settingsPageConfig.js";
import { MAX_UI_FONT_SIZE_PX, MIN_UI_FONT_SIZE_PX } from "@/lib/uiFontSize.js";
import {
  MAX_LIQUID_TRANSPARENCY,
  MIN_LIQUID_TRANSPARENCY,
} from "@/lib/liquidTransparency.js";
import type { Density } from "@/store/appearanceState.js";

function FontSizeInput({
  value,
  min,
  max,
  ariaLabel,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  ariaLabel: string;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));

  const commit = () => {
    const parsed = draft.trim() === "" ? Number.NaN : Number(draft);
    const nextValue = Number.isFinite(parsed)
      ? Math.min(max, Math.max(min, Math.round(parsed)))
      : value;
    setDraft(String(nextValue));
    if (nextValue !== value) {
      onChange(nextValue);
    }
  };

  return (
    <div className="relative w-28">
      <Input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={1}
        value={draft}
        aria-label={ariaLabel}
        onChange={(event) => setDraft(event.currentTarget.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          } else if (event.key === "Escape") {
            event.preventDefault();
            setDraft(String(value));
          }
        }}
        className="pr-8 text-right tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-ui-lg text-foreground-subtle">
        px
      </span>
    </div>
  );
}

export function AppearanceSectionContent({
  codePreviewSettings,
  setCodePreviewSettings,
  theme,
  setTheme,
  accent,
  setAccent,
  density,
  setDensity,
  uiFontSizePx,
  setUiFontSizePx,
  liquidTransparency,
  setLiquidTransparency,
}: {
  codePreviewSettings: CodePreviewSettings;
  setCodePreviewSettings: (settings: Partial<CodePreviewSettings>) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  accent: Accent;
  setAccent: (accent: Accent) => void;
  density: Density;
  setDensity: (density: Density) => void;
  uiFontSizePx: number;
  setUiFontSizePx: (fontSizePx: number) => void;
  liquidTransparency: number;
  setLiquidTransparency: (transparency: number) => void;
}) {
  const { intl } = useMesaCodeIntl();
  const activePreviewMode = resolveTheme(theme);

  return (
    <>
      <div className="quiet-studio-appearance min-w-0 space-y-4 @container/appearance">
        <div>
          <h3 className="text-ui-lg font-semibold text-foreground">
            {intl.formatMessage({ id: "settings.appearance.interfaceTitle" })}
          </h3>
          <p className="mt-1 text-ui-base leading-6 text-foreground-subtle">
            {intl.formatMessage({
              id: "settings.appearance.interfaceDescription",
            })}
          </p>
        </div>
        <div
          className="quiet-studio-preview flex min-h-24 overflow-hidden rounded-xl border border-border bg-background"
          aria-hidden="true"
        >
          <div className="flex w-24 shrink-0 flex-col gap-2 border-r border-border bg-sidebar p-3">
            <span className="h-2 w-12 rounded bg-foreground-subtle/30" />
            <span className="h-5 rounded bg-accent" />
            <span className="h-2 w-14 rounded bg-foreground-subtle/20" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
            <span className="h-2 w-1/3 rounded bg-foreground-subtle/30" />
            <span className="h-2 w-2/3 rounded bg-foreground-subtle/20" />
            <span className="mt-auto h-6 rounded-md border border-input-border bg-input" />
          </div>
        </div>
        <Card className="rounded-xl border border-border bg-card py-1 shadow-none">
          <CardContent className="space-y-0 px-4 sm:px-5">
            <SettingsRow
              label={intl.formatMessage({ id: "settings.themeMode" })}
              description={intl.formatMessage({
                id: "settings.themeModeDescription",
              })}
              control={
                <Select value={theme} onValueChange={(value) => setTheme(value as Theme)}>
                  <SelectTrigger
                    size="lg"
                    className="w-full min-w-0 justify-between"
                    aria-label={intl.formatMessage({ id: "settings.themeMode" })}
                    data-testid="appearance-theme-select"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {THEME_MODES.map(({ mode, icon: Icon }) => (
                      <SelectItem key={mode} value={mode}>
                        <div className="flex items-center gap-2">
                          <Icon className="size-4" />
                          {intl.formatMessage({
                            id: `settings.themeMode.${mode}`,
                          })}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              }
            />
            <SettingsRow
              label={intl.formatMessage({ id: "settings.accent" })}
              description={intl.formatMessage({
                id: "settings.accentDescription",
              })}
              control={
                <Select value={accent} onValueChange={(value) => setAccent(value as Accent)}>
                  <SelectTrigger
                    size="lg"
                    className="w-full min-w-0 justify-between"
                    aria-label={intl.formatMessage({ id: "settings.accent" })}
                    data-testid="appearance-accent-select"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCENT_OPTIONS.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        <div className="flex items-center gap-2">
                          <span
                            aria-hidden
                            className="size-3 rounded-full border border-border"
                            style={{ backgroundColor: option.swatch }}
                          />
                          {intl.formatMessage({ id: `settings.accent.${option.id}` })}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              }
            />
            <SettingsRow
              label={intl.formatMessage({ id: "settings.uiFontSize" })}
              description={intl.formatMessage({
                id: "settings.uiFontSizeDescription",
              })}
              control={
                <FontSizeInput
                  key={uiFontSizePx}
                  min={MIN_UI_FONT_SIZE_PX}
                  max={MAX_UI_FONT_SIZE_PX}
                  value={uiFontSizePx}
                  onChange={setUiFontSizePx}
                  ariaLabel={intl.formatMessage({ id: "settings.uiFontSize" })}
                />
              }
            />
            {theme === "liquid" ? (
              <SettingsRow
                label={intl.formatMessage({ id: "settings.liquidTransparency" })}
                description={intl.formatMessage({
                  id: "settings.liquidTransparencyDescription",
                })}
                control={
                  <div className="flex w-full min-w-0 items-center gap-3">
                    <input
                      type="range"
                      min={MIN_LIQUID_TRANSPARENCY}
                      max={MAX_LIQUID_TRANSPARENCY}
                      step={1}
                      value={liquidTransparency}
                      aria-label={intl.formatMessage({ id: "settings.liquidTransparency" })}
                      data-testid="appearance-liquid-transparency"
                      onChange={(event) => setLiquidTransparency(Number(event.currentTarget.value))}
                      className="h-1.5 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-border accent-[var(--color-brand)]"
                    />
                    <span className="w-10 shrink-0 text-right text-ui-base tabular-nums text-foreground-subtle">
                      {liquidTransparency}%
                    </span>
                  </div>
                }
              />
            ) : null}
            <SettingsRow
              label={intl.formatMessage({ id: "settings.density" })}
              description={intl.formatMessage({
                id: "settings.densityDescription",
              })}
              control={
                <Select value={density} onValueChange={(value) => setDensity(value as Density)}>
                  <SelectTrigger size="lg" className="w-full min-w-0 justify-between">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="comfortable">
                      {intl.formatMessage({ id: "settings.density.comfortable" })}
                    </SelectItem>
                    <SelectItem value="compact">
                      {intl.formatMessage({ id: "settings.density.compact" })}
                    </SelectItem>
                  </SelectContent>
                </Select>
              }
            />
          </CardContent>
        </Card>
      </div>

      <div className="quiet-studio-appearance space-y-6 @container/appearance">
        <div className="min-w-0 space-y-3">
          <div>
            <h3 className="text-ui-lg font-semibold text-foreground">
              {intl.formatMessage({ id: "settings.appearance.codeTitle" })}
            </h3>
            <p className="mt-1 text-ui-base leading-6 text-foreground-subtle">
              {intl.formatMessage({
                id: "settings.appearance.codeDescription",
              })}
            </p>
          </div>
          <Card className="rounded-xl border border-border bg-card py-1 shadow-none">
            <CardContent className="space-y-0 px-4 sm:px-5">
              <SettingsRow
                label={intl.formatMessage({ id: "settings.lightTheme" })}
                description={intl.formatMessage({
                  id: "settings.lightThemeDescription",
                })}
                control={
                  <ThemeSelect
                    mode="light"
                    value={codePreviewSettings.lightTheme}
                    onValueChange={(value) => setCodePreviewSettings({ lightTheme: value })}
                  />
                }
              />
              <SettingsRow
                label={intl.formatMessage({ id: "settings.darkTheme" })}
                description={intl.formatMessage({
                  id: "settings.darkThemeDescription",
                })}
                control={
                  <ThemeSelect
                    mode="dark"
                    value={codePreviewSettings.darkTheme}
                    onValueChange={(value) => setCodePreviewSettings({ darkTheme: value })}
                  />
                }
              />
              <SettingsRow
                label={intl.formatMessage({ id: "settings.showLineNumbers" })}
                description={intl.formatMessage({
                  id: "settings.showLineNumbersDescription",
                })}
                control={
                  <Switch
                    checked={codePreviewSettings.showLineNumbers}
                    onCheckedChange={(checked) =>
                      setCodePreviewSettings({ showLineNumbers: checked })
                    }
                  />
                }
              />
              <SettingsRow
                label={intl.formatMessage({ id: "settings.wrapLongLines" })}
                description={intl.formatMessage({
                  id: "settings.wrapLongLinesDescription",
                })}
                control={
                  <Switch
                    checked={codePreviewSettings.wrapLongLines}
                    onCheckedChange={(checked) =>
                      setCodePreviewSettings({ wrapLongLines: checked })
                    }
                  />
                }
              />
              <SettingsRow
                label={intl.formatMessage({ id: "settings.fontSize" })}
                description={intl.formatMessage({
                  id: "settings.fontSizeDescription",
                })}
                control={
                  <FontSizeInput
                    key={codePreviewSettings.fontSizePx}
                    min={12}
                    max={20}
                    value={codePreviewSettings.fontSizePx}
                    onChange={(fontSizePx) => setCodePreviewSettings({ fontSizePx })}
                    ariaLabel={intl.formatMessage({ id: "settings.fontSize" })}
                  />
                }
              />
            </CardContent>
          </Card>
        </div>

        <div className="min-w-0 space-y-4">
          <div>
            <h3 className="text-ui-base font-semibold text-foreground">
              {intl.formatMessage({ id: "settings.previewSectionTitle" })}
            </h3>
            <p className="mt-1 text-ui-base leading-6 text-foreground-subtle">
              {intl.formatMessage({ id: "settings.previewDescription" })}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <ThemePreviewCard
              mode="light"
              title={intl.formatMessage({ id: "settings.previewLight" })}
              themeName={getThemeOptionLabel(codePreviewSettings.lightTheme)}
              theme={getCodePreviewTheme("light", codePreviewSettings)}
              isActive={activePreviewMode === "light"}
              showLineNumbers={codePreviewSettings.showLineNumbers}
              wrapLongLines={codePreviewSettings.wrapLongLines}
              fontSizePx={codePreviewSettings.fontSizePx}
              appTheme={theme}
              accent={accent}
            />
            <ThemePreviewCard
              mode="dark"
              title={intl.formatMessage({ id: "settings.previewDark" })}
              themeName={getThemeOptionLabel(codePreviewSettings.darkTheme)}
              theme={getCodePreviewTheme("dark", codePreviewSettings)}
              isActive={activePreviewMode === "dark"}
              showLineNumbers={codePreviewSettings.showLineNumbers}
              wrapLongLines={codePreviewSettings.wrapLongLines}
              fontSizePx={codePreviewSettings.fontSizePx}
              appTheme={theme}
              accent={accent}
            />
          </div>
        </div>
      </div>
    </>
  );
}
