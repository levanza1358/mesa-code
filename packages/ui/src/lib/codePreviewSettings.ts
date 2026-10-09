/**
 * 代码预览设置的类型与默认值。
 *
 * 独立的中立模块：若定义在 zustand store（@/store/index.ts）里，
 * 纯展示组件（ai-elements / ToolCallBlocks）为了拿类型和默认值就要依赖 store。
 * store 只做 re-export，展示组件改为 props 传入 + 本模块默认值兜底。
 */
import { bundledThemes, type BundledTheme } from "shiki";

export type CodeTheme = BundledTheme | "mesa-code-light" | "mesa-code-dark";

export function normalizeCodeTheme(value: unknown, fallback: CodeTheme): CodeTheme {
  return typeof value === "string" &&
    (value === "mesa-code-light" ||
      value === "mesa-code-dark" ||
      Object.hasOwn(bundledThemes, value))
    ? (value as CodeTheme)
    : fallback;
}

export interface CodePreviewSettings {
  lightTheme: CodeTheme;
  darkTheme: CodeTheme;
  showLineNumbers: boolean;
  wrapLongLines: boolean;
  fontSizePx: number;
}

export const DEFAULT_CODE_PREVIEW_SETTINGS: CodePreviewSettings = {
  lightTheme: "github-light",
  darkTheme: "github-dark",
  showLineNumbers: true,
  wrapLongLines: false,
  fontSizePx: 12,
};
