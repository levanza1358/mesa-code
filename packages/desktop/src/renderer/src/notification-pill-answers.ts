import {
  notificationPillPresentationSchema,
  type NotificationPillAction,
  type NotificationPillAnswerPrompt,
} from "@mesa-code/shared";

declare global {
  interface Window {
    notificationPill: {
      onState(callback: (state: unknown) => void): () => void;
      onPanelState(callback: (state: unknown) => void): () => void;
      act(action: NotificationPillAction): void;
    };
  }
}

const questions = document.getElementById("questions")!;
const error = document.getElementById("error")!;
const actions = document.getElementById("actions")!;

let token = "";
let prompt: NotificationPillAnswerPrompt | undefined;
// Selections are keyed by question text so a same-token refresh (a busy/error round trip) keeps the
// user's picks instead of resetting the panel while the answer is in flight.
const selections = new Map<string, Set<string>>();
let submitting = false;

function selectionFor(question: string): Set<string> {
  let values = selections.get(question);
  if (!values) {
    values = new Set();
    selections.set(question, values);
  }
  return values;
}

function answeredCount(): number {
  if (!prompt) return 0;
  return prompt.questions.filter((question) => selectionFor(question.question).size > 0).length;
}

function allAnswered(): boolean {
  return Boolean(prompt) && answeredCount() === prompt!.questions.length;
}

function renderSubmit() {
  const button = actions.querySelector<HTMLButtonElement>("button[data-submit]");
  if (!button) return;
  button.disabled = submitting || !allAnswered();
}

function renderQuestions() {
  questions.replaceChildren();
  if (!prompt) return;
  for (const question of prompt.questions) {
    const fieldset = document.createElement("fieldset");
    const legend = document.createElement("legend");
    legend.textContent = question.header
      ? `${question.header} — ${question.question}`
      : question.question;
    fieldset.append(legend);
    const list = document.createElement("ul");
    for (const option of question.options) {
      const item = document.createElement("li");
      const label = document.createElement("label");
      const input = document.createElement("input");
      input.type = question.multiSelect ? "checkbox" : "radio";
      input.name = question.question;
      input.value = option.value;
      input.checked = selectionFor(question.question).has(option.value);
      input.addEventListener("change", () => {
        const values = selectionFor(question.question);
        if (question.multiSelect) {
          if (input.checked) values.add(option.value);
          else values.delete(option.value);
        } else {
          values.clear();
          if (input.checked) values.add(option.value);
        }
        renderSubmit();
      });
      const text = document.createElement("span");
      text.textContent = option.label;
      label.append(input, text);
      item.append(label);
      list.append(item);
    }
    fieldset.append(list);
    questions.append(fieldset);
  }
}

function renderActions() {
  actions.replaceChildren();
  if (!prompt) return;
  const submit = document.createElement("button");
  submit.type = "button";
  submit.dataset.submit = "";
  submit.dataset.primary = "";
  submit.textContent = prompt.submitLabel;
  submit.onclick = () => {
    if (!prompt || submitting || !allAnswered()) return;
    // Only fixed options are collected; a question with no pick stays unanswerable and the button
    // stays disabled, so the panel never submits an empty selection for a live question.
    const answers = prompt.questions
      .map((question) => ({
        question: question.question,
        values: [...selectionFor(question.question)],
      }))
      .filter((selection) => selection.values.length > 0);
    submitting = true;
    renderSubmit();
    window.notificationPill.act({ token, action: "answer", answers });
  };
  actions.append(submit);
  renderSubmit();
}

const unsubscribe = window.notificationPill.onPanelState((payload) => {
  const parsed = notificationPillPresentationSchema.safeParse(payload);
  if (!parsed.success) return;
  const state = parsed.data;
  // A fresh request token starts a new panel; selections from the previous request must not leak in.
  if (state.token !== token) {
    token = state.token;
    selections.clear();
    submitting = false;
  }
  prompt = state.answerPrompt;
  error.textContent = state.error;
  // A same-token refresh that is not a failed submit (busy false again) re-enables the panel.
  if (!state.busy) submitting = false;
  const root = document.documentElement.style;
  root.setProperty("--color-popover", state.appearance.background);
  root.setProperty("--color-foreground", state.appearance.foreground);
  root.setProperty("--color-border", state.appearance.border);
  root.setProperty("--color-brand", state.appearance.accent);
  root.setProperty("--ui-font-size", state.appearance.fontSize);
  document.documentElement.lang = "en";
  renderQuestions();
  renderActions();
  const submit = actions.querySelector<HTMLButtonElement>("button[data-submit]");
  if (submit) submit.disabled = submitting || state.busy || !allAnswered();
  if (error.textContent) {
    questions.querySelector<HTMLInputElement>("input")?.focus();
  } else {
    submit?.focus();
  }
});

window.addEventListener(
  "unload",
  () => {
    unsubscribe();
  },
  { once: true },
);
