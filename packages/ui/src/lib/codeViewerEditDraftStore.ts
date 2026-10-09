// codeViewerEditDraftStore —— side pane code-viewer 内联编辑草稿的模块级单例。
//
// 编辑草稿必须在组件重渲染、tab 失活/恢复、workspace/session 切换时继续存在，
// 否则用户输入会被静默丢弃。把草稿的所有权上移到这个模块级单例（symmetrical 于
// sidePaneTerminalSessionRegistry 的保活思路），组件只读写这个单例：
//   - key = code-viewer tab 已有的 sourceKey（同一 workspace 文件身份），一个 key 一份草稿；
//   - dirty = draft !== base，base 是进入编辑时从磁盘读到的内容；
//   - 非 dirty（draft 与 base 相同）不保留条目，因此 dirtyKeys 就是"有未保存修改"的集合。
//
// 脏草稿不会被任何关闭路径静默丢弃：关闭/收起前由 useAppPanels 汇总 dirtyKeys()
// 走 useConfirmDialog 确认；确认丢弃才 clear，取消则保留 tab 与草稿。
//
// 只保存内存草稿，不落盘、不持久化：跨 app 重启的草稿恢复不在范围内。

import { uiMemoryDiagnosticsRegistry } from "@/lib/memoryDiagnostics.js";

export interface CodeViewerEditDraftEntry {
  /** content read from disk when the draft was created/loaded. */
  base: string;
  /** current editor content. */
  draft: string;
}

const drafts = new Map<string, CodeViewerEditDraftEntry>();
uiMemoryDiagnosticsRegistry.register("codeViewerEditDrafts", () => ({ drafts: drafts.size }));

export const codeViewerEditDraftStore = {
  get(key: string): CodeViewerEditDraftEntry | undefined {
    return drafts.get(key);
  },

  /**
   * Record the current draft. Equivalent content drops the entry so only real (unsaved)
   * differences are retained; `dirtyKeys` then reads directly as the set of dirty files.
   */
  setDraft(key: string, base: string, draft: string): void {
    if (draft === base) {
      drafts.delete(key);
      return;
    }
    drafts.set(key, { base, draft });
  },

  isDirty(key: string): boolean {
    return drafts.has(key);
  },

  /** Keys of every file with unsaved edits, across workspaces and sessions. */
  dirtyKeys(): string[] {
    return Array.from(drafts.keys());
  },

  /** Discard the draft for one file (save, revert, or a confirmed close). */
  clear(key: string): void {
    drafts.delete(key);
  },

  /** Discard drafts for several files at once (confirmed close of multiple tabs). */
  clearMany(keys: Iterable<string>): void {
    for (const key of keys) {
      drafts.delete(key);
    }
  },

  /** Test-only: drop every draft. */
  clearForTest(): void {
    drafts.clear();
  },
};
