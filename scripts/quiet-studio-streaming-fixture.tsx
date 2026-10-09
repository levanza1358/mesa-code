import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import type { ConversationRow } from "@mesa-code/shared/mesa-code-protocol-v4";
import { ConversationTimeline } from "../packages/ui/src/v4/ConversationTimeline.js";
import { MesaCodeIntlProvider } from "../packages/ui/src/i18n/IntlProvider.js";
import { StoreProvider } from "../packages/ui/src/store/StoreProvider.js";
import { TooltipProvider } from "../packages/ui/src/components/ui/tooltip.js";
import { DEFAULT_CODE_PREVIEW_SETTINGS } from "../packages/ui/src/lib/codePreviewSettings.js";
import "../packages/ui/src/styles.css";
import "../packages/ui/src/quiet-studio.css";

const broadcast = { send: async () => {}, onMessage: () => () => {} };
const context = {
  workspacePath: "synthetic-workspace",
  theme: "zai-dark" as const,
  codePreviewSettings: DEFAULT_CODE_PREVIEW_SETTINGS,
};
function row(rowId: number, turnId: string, state = "complete"): ConversationRow {
  return {
    kind: "assistantText",
    rowId,
    turnId,
    text: `Generated response ${rowId}.\n\n` + "Historical text. ".repeat(40),
    state,
    createdAt: rowId,
    createdAtSeq: rowId,
  } as ConversationRow;
}

function Fixture() {
  const [rows, setRows] = useState(() => [
    ...Array.from({ length: 100 }, (_, index) => row(index + 1, `history-${index}`)),
    row(101, "live", "streaming"),
  ]);
  const [phase, setPhase] = useState<"running" | "completedSuccess">("running");
  const [frame, setFrame] = useState(0);
  const [draft, setDraft] = useState("");
  const advance = (count: number) => {
    setRows((current) =>
      current.map((item) =>
        item.rowId === 101 && item.kind === "assistantText"
          ? { ...item, text: item.text + "\n\nStreamed paragraph. ".repeat(count) }
          : item,
      ),
    );
    setFrame((value) => value + count);
  };
  return (
    <MesaCodeIntlProvider initialLocale="en-US">
      <StoreProvider broadcastService={broadcast}>
        <TooltipProvider>
          <main
            className="dark h-screen bg-background text-foreground"
            style={{ display: "flex", flexDirection: "column" }}
          >
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => advance(1)} data-testid="advance">
                Advance
              </button>
              <button
                data-testid="start"
                onClick={() => {
                  let remaining = 100;
                  const timer = setInterval(() => {
                    advance(1);
                    if (--remaining === 0) clearInterval(timer);
                  }, 30);
                }}
              >
                Stream
              </button>
              <button
                data-testid="prepend"
                onClick={() => setRows((current) => [row(0, "older"), ...current])}
              >
                Prepend
              </button>
              <button
                data-testid="complete"
                onClick={() => {
                  setRows((current) =>
                    current.map((item) =>
                      item.kind === "assistantText" && item.rowId === 101
                        ? { ...item, state: "complete" }
                        : item,
                    ),
                  );
                  setPhase("completedSuccess");
                }}
              >
                Complete
              </button>
              <output data-testid="frame">{frame}</output>
            </div>
            <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
              <ConversationTimeline
                rows={rows}
                totalCount={rows.length}
                sessionKey="synthetic-stream"
                rowContext={context}
                sessionPhase={phase}
                hideTurnNavigator
              />
            </div>
            <textarea
              aria-label="Synthetic draft"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
          </main>
        </TooltipProvider>
      </StoreProvider>
    </MesaCodeIntlProvider>
  );
}

createRoot(document.getElementById("root")!).render(<Fixture />);
