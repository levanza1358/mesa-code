import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

export async function checkNotificationPillRegressions({ source, pill, app, snapshot }) {
  const allow = pill.getByRole("button", { name: "notification.pill.allowOnce" });
  const configure = (value) =>
    source.evaluate((snapshot) => window.ownerHarness.configure({ snapshot }), value);
  const last = () => source.evaluate(() => window.ownerHarness.publications().at(-1));
  const hidden = () =>
    app.evaluate(
      ({ BrowserWindow }) =>
        !BrowserWindow.getAllWindows()
          .find((win) => win.getTitle() === "Mesa Code")
          .isVisible(),
    );
  for (const event of ["disconnect", "restart"]) {
    await source.evaluate(
      (event) =>
        event === "restart"
          ? window.ownerHarness.restart()
          : window.ownerHarness.lifecycle("unavailable"),
      event,
    );
    await source.waitForFunction(() => !window.ownerHarness.publications().at(-1).presentation);
    const before = await source.evaluate(() => window.ownerHarness.publications().length);
    await source.evaluate(() => window.ownerHarness.lifecycle("available"));
    // Wait for React commit without advancing the projection or using timing guesses.
    await source.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
    );
    assert.equal(
      await source.evaluate(() => window.ownerHarness.publications().length),
      before,
      "spawn cannot revive stale projection",
    );
    assert.equal(await hidden(), true);
    await configure({ ...snapshot });
    await allow.waitFor();
    assert.equal(
      (await last()).presentation.context.revision,
      snapshot.revision,
      "fresh same epoch/revision recovers",
    );
  }
  await source.evaluate(() => window.ownerHarness.lifecycle("unavailable"));
  await source.waitForFunction(() => !window.ownerHarness.publications().at(-1).presentation);
  await configure({ ...snapshot });
  await source.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
  assert.equal(await hidden(), true, "projection before availability stays hidden");
  await source.evaluate(() => window.ownerHarness.lifecycle("available"));
  await allow.waitFor();

  // Request B replaces A while A's transport promise remains pending.
  const beforeCalls = await source.evaluate(() => window.ownerHarness.calls().length);
  await allow.click();
  await source.waitForFunction(
    (count) => window.ownerHarness.calls().length === count + 1,
    beforeCalls,
  );
  const replacement = {
    ...snapshot,
    revision: 6,
    pendingInteractions: [{ ...snapshot.pendingInteractions[0], interactionId: "replacement-B" }],
  };
  await configure(replacement);
  await source.waitForFunction(
    () =>
      window.ownerHarness.publications().at(-1).presentation?.context.requestId === "replacement-B",
  );
  assert.equal(await allow.isDisabled(), true, "B busy while A waits");
  const b = (await last()).presentation;
  await source.evaluate(
    (b) =>
      window.ownerHarness.answer({
        token: b.token,
        context: b.context,
        action: "answer",
        optionId: "owner-once",
      }),
    b,
  );
  assert.equal(
    await source.evaluate(() => window.ownerHarness.calls().length),
    beforeCalls + 1,
    "B raced click not sent",
  );
  await source.evaluate(() => window.ownerHarness.ack("accepted"));
  await source.waitForFunction(
    () => window.ownerHarness.publications().at(-1).presentation?.busy === false,
  );
  assert.equal(await allow.isEnabled(), true, "A settlement unlocks B");
  await allow.click();
  await source.waitForFunction(
    (count) => window.ownerHarness.calls().length === count + 2,
    beforeCalls,
  );
  assert.equal(
    await source.evaluate(() => window.ownerHarness.calls().at(-1).envelope.payload.interactionId),
    "replacement-B",
  );
  await source.evaluate(() => window.ownerHarness.ack("failed"));
  await pill.getByRole("alert").getByText("chat.permission.responseFailed").waitFor();

  // Rendered overflow, not merely the 512-character payload ceiling, gates approval.
  const long = {
    ...replacement,
    revision: 7,
    pendingInteractions: [
      {
        ...replacement.pendingInteractions[0],
        payload: {
          ...replacement.pendingInteractions[0].payload,
          summary: "Review this safe-length summary ".repeat(12),
        },
      },
    ],
  };
  await configure(long);
  await source.waitForFunction(
    () => window.ownerHarness.publications().at(-1).presentation?.context.revision === 7,
  );
  await pill.waitForFunction(
    () => document.querySelector("[data-answer]").style.visibility === "hidden",
  );
  assert.equal(
    await pill.getByRole("button", { name: "notification.pill.open" }).isVisible(),
    true,
  );
  await configure({ ...replacement, revision: 8 });
  await allow.waitFor();
  await pill.evaluate(() => document.documentElement.style.setProperty("--ui-font-size", "48px"));
  await pill.waitForFunction(
    () => document.querySelector("[data-answer]").style.visibility === "hidden",
  );
  await pill.evaluate(() => document.documentElement.style.setProperty("--ui-font-size", "14px"));
  await allow.waitFor();
  await app.evaluate(({ BrowserWindow }) => {
    const window = BrowserWindow.getAllWindows().find((win) => win.getTitle() === "Mesa Code");
    window.setResizable(true);
    window.setSize(140, 180);
  });
  await pill.waitForFunction(
    () => document.querySelector("[data-answer]").style.visibility === "hidden",
  );
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()
      .find((win) => win.getTitle() === "Mesa Code")
      .setBounds({ width: 520, height: 180 }),
  );
  await allow.waitFor();
  await configure({ ...replacement, revision: 9, pendingInteractions: [] });
  await source.waitForFunction(() => !window.ownerHarness.publications().at(-1).presentation);

  // Execute the production quit-parent selection expression with a focused/origin pill.
  const main = await readFile(
    new URL("../packages/desktop/src/main/index.ts", import.meta.url),
    "utf8",
  );
  const selection = main.slice(
    main.indexOf("  const applicationWindows = getApplicationWindowsExcludingCuaIndicator();"),
    main.indexOf(
      "  const dialogOptions =",
      main.indexOf("  const applicationWindows = getApplicationWindowsExcludingCuaIndicator();"),
    ),
  );
  const select = new Function(
    "originWindow",
    "BrowserWindow",
    "getApplicationWindowsExcludingCuaIndicator",
    `${selection}; return targetWindow;`,
  );
  const application = {},
    overlay = {};
  assert.equal(
    select(overlay, { getFocusedWindow: () => overlay }, () => [application]),
    application,
  );
  assert.equal(
    select(null, { getFocusedWindow: () => overlay }, () => []),
    null,
  );
  assert.equal(
    select(application, { getFocusedWindow: () => overlay }, () => [application]),
    application,
  );
}
