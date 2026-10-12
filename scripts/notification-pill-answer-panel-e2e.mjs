import assert from "node:assert/strict";

/**
 * Builds the synthetic answer-panel renderer bundle and its HTML entry beside the compact pill
 * artifacts the main E2E script already wrote. Kept separate so the E2E script stays under the
 * repository max-lines limit; the build is identical (esbuild browser bundle + script-src rewrite).
 */
export async function buildNotificationPillAnswersBundle({
  root,
  run,
  build,
  readFile,
  writeFile,
  join,
}) {
  await build({
    entryPoints: [join(root, "packages/desktop/src/renderer/src/notification-pill-answers.ts")],
    bundle: true,
    platform: "browser",
    format: "esm",
    outfile: join(run, "answers.js"),
  });
  const answersHtml = await readFile(
    join(root, "packages/desktop/src/renderer/notification-pill-answers.html"),
    "utf8",
  );
  await writeFile(
    join(run, "notification-pill-answers.html"),
    answersHtml.replace("/src/notification-pill-answers.ts", "./answers.js"),
  );
}

/**
 * AskUserQuestion pill: Show answer opens a separate answer window, and picking a fixed option
 * there relays the answer back to the owning renderer without restoring the app; clearing the
 * presentation then hides both the pill and the panel.
 */
export async function checkNotificationPillAnswerPanel({ source, pill, app, publish, value }) {
  const isSourceMinimized = () =>
    app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()
        .find((win) => win.getTitle() === "Synthetic source")
        .isMinimized(),
    );
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()
      .find((win) => win.getTitle() === "Synthetic source")
      .minimize(),
  );
  const userInput = {
    ...value,
    token: "question",
    title: "Your response is needed",
    body: "Which library?",
    options: [],
    answerPrompt: {
      showLabel: "Show answer",
      submitLabel: "Submit answer",
      questions: [
        {
          question: "Which library should we use?",
          header: "Library",
          multiSelect: false,
          options: [
            { value: "a", label: "Option A" },
            { value: "b", label: "Option B" },
          ],
        },
      ],
    },
  };
  const panelEvent = app.waitForEvent("window");
  await publish({ token: userInput.token, presentation: userInput });
  await pill.getByRole("button", { name: "Show answer" }).click();
  const panel = await panelEvent;
  await panel.getByRole("radio", { name: "Option B" }).waitFor();
  await panel.getByRole("radio", { name: "Option B" }).check();
  await panel.getByRole("button", { name: "Submit answer" }).click();
  await source.waitForFunction(() => window.testPill.replies().length === 4);
  const answered = await source.evaluate(() => window.testPill.replies()[3]);
  assert.equal(answered.action, "answer");
  assert.deepEqual(answered.answers, [{ question: "Which library should we use?", values: ["b"] }]);
  assert.equal(await isSourceMinimized(), true, "Panel answer must not restore source");
  await publish({ token: userInput.token });
  await app.evaluate(({ BrowserWindow }) => {
    for (const win of BrowserWindow.getAllWindows()) {
      if (["Mesa Code", "Mesa Code Answer"].includes(win.getTitle()) && win.isVisible())
        throw Error(`Resolved userInput still visible: ${win.getTitle()}`);
    }
  });
}
