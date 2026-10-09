// In-pane editable code surface for the side-pane code-viewer.
//
// The read-only viewer (`@pierre/diffs` `CodeViewer`) is a Shadow-DOM renderer that cannot
// accept input, and there is no rich code editor dependency in the UI. Editing therefore
// uses a plain monospace textarea (the same surface as the settings `.mesaCodeignore`
// editor) with a synced line-number gutter. Syntax highlighting is intentionally off while
// editing; wrapping is disabled during editing so the gutter stays aligned with the rows.

import { useLayoutEffect, useMemo, useRef } from "react";
import { Textarea } from "@/components/ui/textarea.js";
import { cn } from "@/components/lib/utils.js";

export interface EditableCodeContentProps {
  value: string;
  onChange: (next: string) => void;
  /** Forwarded to the textarea for keyboard shortcuts (e.g. Ctrl/Cmd+S). */
  onKeyDown?: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  /** Accessible label for the editor. */
  ariaLabel: string;
  readOnly?: boolean;
}

function countLines(value: string): number {
  if (value.length === 0) {
    return 1;
  }
  let lines = 1;
  for (let index = 0; index < value.length; index += 1) {
    if (value.charCodeAt(index) === 10) {
      lines += 1;
    }
  }
  return lines;
}

export function EditableCodeContent({
  value,
  onChange,
  onKeyDown,
  ariaLabel,
  readOnly = false,
}: EditableCodeContentProps) {
  const gutterRef = useRef<HTMLDivElement | null>(null);
  const lineCount = useMemo(() => countLines(value), [value]);
  const lineNumbers = useMemo(
    () => Array.from({ length: lineCount }, (_, index) => index + 1),
    [lineCount],
  );

  // Keep the gutter scrolled in lockstep with the textarea. Use a layout effect so the sync
  // happens before paint and the numbers never visibly drift from their rows.
  useLayoutEffect(() => {
    const gutter = gutterRef.current;
    const textarea = gutter?.nextElementSibling as HTMLTextAreaElement | null;
    if (!gutter || !textarea) {
      return;
    }

    const syncScroll = () => {
      gutter.scrollTop = textarea.scrollTop;
    };
    syncScroll();
    textarea.addEventListener("scroll", syncScroll);
    return () => textarea.removeEventListener("scroll", syncScroll);
  }, []);

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden font-mono text-ui-base">
      <div
        ref={gutterRef}
        aria-hidden="true"
        data-testid="code-viewer-inline-editor-gutter"
        className="shrink-0 select-none overflow-hidden border-r border-border bg-surface/30 px-2 py-2 text-right tabular-nums text-foreground-subtlest"
      >
        {lineNumbers.map((line) => (
          <div key={line} className="leading-5">
            {line}
          </div>
        ))}
      </div>
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        readOnly={readOnly}
        spellCheck={false}
        wrap="off"
        aria-label={ariaLabel}
        data-testid="code-viewer-inline-editor"
        className={cn(
          // Override the shared Textarea defaults: this surface fills its pane instead of
          // auto-sizing to content, and dropping the input chrome keeps it reading as code.
          "field-sizing-fixed h-full min-h-0 flex-1 resize-none rounded-none border-0 bg-transparent px-3 py-2",
          "font-mono text-ui-base leading-5 focus-visible:border-0 focus-visible:ring-0",
        )}
      />
    </div>
  );
}
