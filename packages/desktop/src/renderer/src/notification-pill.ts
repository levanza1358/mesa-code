import { notificationPillPresentationSchema, type NotificationPillAction } from "@mesa-code/shared";

declare global {
  interface Window {
    notificationPill: {
      onState(callback: (state: unknown) => void): () => void;
      onPanelState(callback: (state: unknown) => void): () => void;
      act(action: NotificationPillAction): void;
    };
  }
}
const body = document.getElementById("body")!;
const actions = document.getElementById("actions")!;
let permission = false;
function summaryFits() {
  const bounds = body.getBoundingClientRect();
  return (
    body.scrollWidth <= body.clientWidth &&
    body.scrollHeight <= body.clientHeight &&
    bounds.left >= 0 &&
    bounds.right <= innerWidth &&
    bounds.top >= 0 &&
    bounds.bottom <= innerHeight &&
    actions.getBoundingClientRect().bottom <= innerHeight
  );
}
function checkSummary() {
  // Payload bounds do not prove review text is visible after font or viewport changes.
  const safe = !permission || summaryFits();
  for (const button of actions.querySelectorAll<HTMLButtonElement>("[data-answer]")) {
    button.style.visibility = safe ? "" : "hidden";
    button.setAttribute("aria-hidden", String(!safe));
    if (!safe && document.activeElement === button)
      actions.querySelector<HTMLButtonElement>('[data-action-key="open"]')?.focus();
  }
}
const observer = new ResizeObserver(checkSummary);
observer.observe(body);
observer.observe(actions);
window.addEventListener("resize", checkSummary);
document.fonts.addEventListener("loadingdone", checkSummary);
void document.fonts.ready.then(checkSummary);
const unsubscribe = window.notificationPill.onState((payload) => {
  const parsed = notificationPillPresentationSchema.safeParse(payload);
  if (!parsed.success) return;
  const state = parsed.data;
  permission = state.kind === "permission";
  for (const name of ["title", "body", "preview", "error"] as const)
    document.getElementById(name)!.textContent = state[name];
  const root = document.documentElement.style;
  root.setProperty("--color-popover", state.appearance.background);
  root.setProperty("--color-foreground", state.appearance.foreground);
  root.setProperty("--color-border", state.appearance.border);
  root.setProperty("--color-brand", state.appearance.accent);
  root.setProperty("--ui-font-size", state.appearance.fontSize);
  const focused =
    document.activeElement instanceof HTMLButtonElement
      ? document.activeElement.dataset.actionKey
      : undefined;
  actions.replaceChildren();
  const add = (label: string, action: "open" | "answer" | "reveal", optionId?: string) => {
    const button = document.createElement("button");
    button.textContent = label;
    button.dataset.actionKey = optionId ?? action;
    if (action === "answer") button.dataset.answer = "";
    button.disabled = state.busy && action === "answer";
    button.onclick = () => {
      checkSummary();
      if (action === "answer" && permission && !summaryFits()) return;
      window.notificationPill.act({
        token: state.token,
        action,
        ...(optionId ? { optionId } : {}),
      });
    };
    actions.append(button);
  };
  add(state.openLabel, "open");
  // A userInput pill stays compact: Show answer opens the taller answer panel rather than expanding
  // answer controls inside the pill itself.
  if (state.answerPrompt) add(state.answerPrompt.showLabel, "reveal");
  for (const option of state.options) add(option.label, "answer", option.optionId);
  checkSummary();
  if (focused) {
    const buttons = Array.from(actions.querySelectorAll("button")).filter(
      (button) => !button.disabled && button.style.visibility !== "hidden",
    );
    (buttons.find((button) => button.dataset.actionKey === focused) ?? buttons[0])?.focus();
  }
});
window.addEventListener(
  "unload",
  () => {
    unsubscribe();
    observer.disconnect();
    window.removeEventListener("resize", checkSummary);
    document.fonts.removeEventListener("loadingdone", checkSummary);
  },
  { once: true },
);
