import type { CSSProperties, ReactNode } from "react";
import type { CodeTheme } from "@/lib/codePreviewSettings.js";
import { resolveTheme, type Theme } from "@/useTheme.js";
import { getAccentOption, type Accent } from "@/accent.js";
import { CodeBlock } from "@/components/ai-elements/code-block.js";
import { Card, CardContent } from "@/components/ui/card.js";
import {
  CODE_PREVIEW_THEME_OPTIONS,
  getCodeThemeOptionsForMode,
  SETTINGS_PREVIEW_CODE,
} from "@/lib/codePreviewPreferences.js";
import { useMesaCodeIntl } from "@/i18n/IntlProvider.js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.js";
import { cn } from "@/components/lib/utils.js";

/**
 * Settings 与同级管理页在窗口框架内共享同一内容列。
 * Automations 曾在 shell 与页面内各自居中、加 padding，导致它与 Skills 等
 * Settings 功能的标题起点、顶部基线和内容宽度不一致。
 */
export const SETTINGS_FRAME_CONTENT_CLASSNAME =
  "mx-auto w-full max-w-4xl px-4 pb-8 pt-0 lg:px-8 lg:pb-10";

/**
 * 设置页分段切换胶囊。原先与插件商店列表视图共用一个实现，商店移除后
 * 迁到共享设置部件，避免 Usage 等仍在使用的调用方依赖已删除的模块。
 */
export function SegmentPill({
  active,
  label,
  testId,
  onClick,
}: {
  active: boolean;
  label: string;
  testId?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      data-testid={testId}
      className={cn(
        "h-7 rounded-full px-3 text-ui-sm transition-colors",
        active
          ? "bg-selected text-foreground"
          : "text-foreground-subtle hover:bg-hover hover:text-foreground",
      )}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

export function ThemeSelect({
  value,
  onValueChange,
  mode,
}: {
  value: CodeTheme;
  onValueChange: (value: CodeTheme) => void;
  mode: "light" | "dark";
}) {
  const { intl } = useMesaCodeIntl();
  return (
    <Select value={value} onValueChange={(nextValue) => onValueChange(nextValue as CodeTheme)}>
      <SelectTrigger
        size="lg"
        className="w-64 min-w-0 justify-between"
        data-testid={`code-theme-${mode}`}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={`mesa-code-${mode}`}>
          {intl.formatMessage({ id: "settings.codeTheme.followApp" })}
        </SelectItem>
        {getCodeThemeOptionsForMode(mode).map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function ThemePreviewCard({
  mode,
  title,
  themeName,
  theme,
  isActive,
  showLineNumbers,
  wrapLongLines,
  fontSizePx,
  appTheme,
  accent,
}: {
  mode: "light" | "dark";
  title: string;
  themeName: string;
  theme: CodeTheme;
  isActive: boolean;
  showLineNumbers: boolean;
  wrapLongLines: boolean;
  fontSizePx: number;
  appTheme: Theme;
  accent: Accent;
}) {
  const { intl } = useMesaCodeIntl();
  const adaptive = theme.startsWith("mesa-code-");
  const previewAppTheme =
    resolveTheme(appTheme) === mode && appTheme !== "system"
      ? appTheme
      : mode === "light"
        ? "zai-light"
        : "zai-dark";
  const accentOption = getAccentOption(accent);
  const previewAccentStyle = {
    "--color-brand": mode === "light" ? accentOption.strongLight : accentOption.strong,
  } as CSSProperties;
  const previewSurfaceClassName = mode === "light" ? "ring-1 ring-black/5" : "ring-1 ring-white/8";
  const previewThemeStyle = {
    "--color-background": mode === "light" ? "#f8f8f8" : "#161616",
    "--color-card": mode === "light" ? "#f8f8f8" : "#161616",
    "--color-foreground": mode === "light" ? "#0d0d0d" : "#ffffff",
  } as CSSProperties;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-card",
        adaptive && `theme-${previewAppTheme}`,
      )}
      data-code-palette={adaptive ? mode : undefined}
      data-testid={`code-preview-${mode}`}
      style={adaptive ? previewAccentStyle : undefined}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <div className="text-ui-base font-semibold text-foreground">{title}</div>
          <div className="text-ui-base text-foreground-subtle">
            {adaptive ? intl.formatMessage({ id: "settings.codeTheme.followApp" }) : themeName}
          </div>
        </div>
        <span
          className={`rounded-md px-2.5 py-1 text-ui-xs font-medium ${
            isActive ? "bg-selected text-foreground" : "bg-surface text-foreground-subtle"
          }`}
        >
          {intl.formatMessage({
            id: isActive ? "settings.previewBadge.active" : `settings.previewBadge.${mode}`,
          })}
        </span>
      </div>
      <div className="p-2">
        <CodeBlock
          code={SETTINGS_PREVIEW_CODE}
          language="typescript"
          theme={theme}
          showLineNumbers={showLineNumbers}
          wrapLongLines={wrapLongLines}
          fontSizePx={fontSizePx}
          // Light/Dark Preview 是预览目标主题，不应继承当前应用主题的 background token。
          // CodeBlock 内部会把 @pierre/diffs 背景映射到 card，这里同时固定 background/card。
          className={`overflow-hidden border-0 bg-background ${previewSurfaceClassName}`}
          style={adaptive ? undefined : previewThemeStyle}
        />
      </div>
    </div>
  );
}

export function SettingsRow({
  label,
  description,
  control,
  detail,
  controlLayout = "default",
  disabled = false,
}: {
  label: ReactNode;
  description?: ReactNode;
  control: ReactNode;
  detail?: ReactNode;
  controlLayout?: "default" | "wide";
  disabled?: boolean;
}) {
  return (
    <div
      data-settings-row
      className={cn(
        "border-t border-border/60 px-1 py-3.5 first:border-t-0",
        disabled && "opacity-50",
      )}
    >
      <div
        className={cn(
          "grid items-center gap-x-6 gap-y-3",
          controlLayout === "wide"
            ? "grid-cols-1 sm:grid-cols-[minmax(0,1fr)_280px]"
            : "grid-cols-1 sm:grid-cols-[minmax(0,1fr)_176px]",
        )}
      >
        <div className="min-w-0">
          <div className="text-ui-base font-medium text-foreground">{label}</div>
          {description ? (
            <div className="mt-0.5 text-ui-sm leading-5 text-foreground-subtle">{description}</div>
          ) : null}
        </div>
        <div className="flex w-full flex-nowrap items-center justify-end gap-2">
          {controlLayout === "wide" ? detail : null}
          {control}
        </div>
      </div>
      {detail && controlLayout !== "wide" ? <div className="mt-2.5">{detail}</div> : null}
    </div>
  );
}

/**
 * 极简设置分区：不再用卡片包裹，而是「小节标题 + 细分隔线行」的分组。
 * 编辑器 / 列表等重内容块仍使用 SettingsGroupCard。
 */
export function SettingsSection({
  title,
  description,
  children,
}: {
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col">
      {title ? (
        <div className="flex flex-col gap-0.5 pb-1">
          <h3 className="text-ui-sm font-semibold uppercase tracking-wide text-foreground-subtlest">
            {title}
          </h3>
          {description ? (
            <p className="text-ui-sm leading-5 text-foreground-subtle">{description}</p>
          ) : null}
        </div>
      ) : null}
      <div className="flex flex-col">{children}</div>
    </section>
  );
}

/** 一组相关设置行，用细分隔线连接，替代原先的卡片包裹。 */
export function SettingsList({ children }: { children: ReactNode }) {
  return <div className="flex flex-col">{children}</div>;
}

export function SettingsGroupCard({ children }: { children: ReactNode }) {
  return (
    <Card className="overflow-hidden rounded-xl border border-border bg-card py-0 shadow-none">
      <CardContent className="space-y-0 px-4">{children}</CardContent>
    </Card>
  );
}

export function SettingsBadge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-md bg-surface px-2.5 py-1 text-ui-base font-medium text-foreground-subtle">
      {children}
    </span>
  );
}

export function getThemeOptionLabel(value: CodeTheme): string {
  return CODE_PREVIEW_THEME_OPTIONS.find((option) => option.value === value)?.label ?? value;
}
