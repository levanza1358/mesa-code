import assert from "node:assert/strict";
import { access, mkdir, mkdtemp } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const desktop = join(root, "packages", "desktop");
const require = createRequire(join(desktop, "package.json"));
const { _electron } = require("playwright-core");
assert.equal(process.platform, "win32", "Notification pill requires Windows");
for (const file of [
  "out/main/index.js",
  "out/host/index.js",
  "out/preload/index.cjs",
  "out/preload/notification-pill.cjs",
  "out/.main-build-ready",
  "out/.host-build-ready",
  "out/.preload-build-ready",
])
  await access(join(desktop, file));
const rendererUrl = "http://127.0.0.1:5174";
const response = await fetch(`${rendererUrl}/notification-pill.html`, {
  signal: AbortSignal.timeout(5_000),
});
assert.equal(response.ok, true, "Current desktop Vite overlay entry must be ready");
assert.match(await response.text(), /notification-pill\.ts/, "Expected desktop overlay entry");

const output = join(root, ".quiet-studio-runtime", "notification-pill-e2e");
await mkdir(output, { recursive: true });
const runtime = await mkdtemp(join(output, "run-"));
const home = join(runtime, "home");
const roaming = join(runtime, "appdata");
const local = join(runtime, "localappdata");
for (const directory of [home, roaming, local]) await mkdir(directory, { recursive: true });
// Allowlist OS launch variables instead of inheriting provider credentials or runtime overrides.
const env = {};
for (const [key, value] of Object.entries(process.env)) {
  if (/^(PATH|PATHEXT|SYSTEMROOT|WINDIR|COMSPEC|SYSTEMDRIVE|TEMP|TMP)$/i.test(key))
    env[key] = value;
}
Object.assign(env, {
  HOME: home,
  USERPROFILE: home,
  APPDATA: roaming,
  LOCALAPPDATA: local,
  MESA_CODE_DATA_BASE_DIR: home,
  MESA_CODE_DESKTOP_HOME_DIR: home,
  MESA_CODE_DESKTOP_USER_DATA_DIR: join(runtime, "electron"),
  MESA_CODE_DESKTOP_SESSION_DATA_DIR: join(runtime, "electron", "session"),
  MESA_CODE_DESKTOP_USE_ELECTRON_DEFAULT_USER_DATA: "0",
  MESA_CODE_DISABLE_FIXED_REMOTE_DEBUGGING_PORT: "1",
  MESA_CODE_ENV: "production",
  MESA_CODE_E2E_RUN_ID: `notification-pill-${Date.now()}`,
  ELECTRON_RENDERER_URL: rendererUrl,
});

async function until(check, message) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (await check()) return;
    await delay(50);
  }
  assert.fail(message);
}

const app = await _electron.launch({
  executablePath: require("electron"),
  args: [desktop],
  cwd: desktop,
  env,
  timeout: 90_000,
});
try {
  const page = await app.firstWindow();
  page.setDefaultTimeout(30_000);
  await page.getByTestId("sidebar").waitFor({ state: "visible" });
  await page.waitForFunction(() => typeof window.mesaCode?.presentNotificationPill === "function");
  const sourceId = await (await app.browserWindow(page)).evaluate((window) => window.id);
  assert.equal(await app.evaluate(({ app }) => app.getPath("userData")), join(runtime, "electron"));
  await app.evaluate(({ ipcMain }) => {
    globalThis.__pillE2E = { publish: 0, action: 0 };
    // Observe real IPC after production listeners; counters provide deterministic negative checks.
    ipcMain.on("mesaCode:notification-pill-publish", () => globalThis.__pillE2E.publish++);
    ipcMain.on("mesaCode:notification-pill-action", () => globalThis.__pillE2E.action++);
  });
  await page.evaluate(() => {
    window.__pillReplies = [];
    window.mesaCode.onNotificationPillAction((reply) => window.__pillReplies.push(reply));
  });
  const windowState = () =>
    app.evaluate(({ BrowserWindow }, id) => {
      const window = BrowserWindow.fromId(id);
      return { minimized: window.isMinimized(), focused: window.isFocused() };
    }, sourceId);
  const visiblePill = () =>
    app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows().some(
        (window) =>
          window.webContents.getURL().includes("notification-pill.html") && window.isVisible(),
      ),
    );
  const publish = async (payload) => {
    const before = await app.evaluate(() => globalThis.__pillE2E.publish);
    await page.evaluate((payload) => window.mesaCode.presentNotificationPill(payload), payload);
    // ElectronApplication.evaluate supplies Electron before the caller's argument.
    await until(
      () => app.evaluate((_electron, before) => globalThis.__pillE2E.publish > before, before),
      "Publication IPC not received",
    );
  };
  const context = {
    taskId: "synthetic-pill-task",
    workspacePath: home,
    workspaceIdentity: "synthetic-pill-workspace",
    requestId: "synthetic-permission",
    logEpoch: "synthetic-epoch",
    revision: 1,
  };
  const presentation = (token, kind = "status") => ({
    token,
    context,
    kind,
    title: "Synthetic task completed",
    body: "Synthetic notification only; no tool execution",
    preview: "Synthetic bounded answer preview",
    openLabel: "Open",
    error: "",
    busy: false,
    options:
      kind === "permission"
        ? [
            { optionId: "synthetic-allow", kind: "allowOnce", label: "Allow" },
            { optionId: "synthetic-deny", kind: "deny", label: "Deny" },
          ]
        : [],
    appearance: {
      background: "#18211e",
      foreground: "#ffffff",
      border: "#66776e",
      accent: "#9ce6bb",
      fontSize: "14px",
    },
  });
  await app.evaluate(({ BrowserWindow }, id) => {
    const window = BrowserWindow.fromId(id);
    window.show();
    window.focus();
  }, sourceId);
  await until(async () => (await windowState()).focused, "Source did not focus");
  await publish({ token: "focused-status", presentation: presentation("focused-status") });
  assert.equal(await visiblePill(), false, "Focused app must suppress pill");

  const minimize = async () => {
    await app.evaluate(({ BrowserWindow }, id) => BrowserWindow.fromId(id).minimize(), sourceId);
    await until(
      async () => (await windowState()).minimized && !(await windowState()).focused,
      "Source did not minimize",
    );
  };
  await minimize();
  await publish({ token: "minimized-status", presentation: presentation("minimized-status") });
  await until(visiblePill, "Minimized status pill not visible");
  const pill = app.windows().find((window) => window.url().includes("notification-pill.html"));
  assert.ok(pill, "Actual overlay renderer must exist");
  await pill.locator("#preview").waitFor({ state: "visible" });
  assert.equal(await pill.locator("#title").innerText(), "Synthetic task completed");
  assert.equal(await pill.locator("#preview").innerText(), "Synthetic bounded answer preview");
  assert.equal(
    await pill.evaluate(() => typeof window.mesaCode),
    "undefined",
    "Overlay must not load main app bridge",
  );
  await pill.getByRole("button", { name: "Open", exact: true }).click();
  await until(
    async () =>
      !(await windowState()).minimized && (await windowState()).focused && !(await visiblePill()),
    "Open did not restore exact source and hide pill",
  );

  await minimize();
  await publish({ token: "permission", presentation: presentation("permission", "permission") });
  await until(visiblePill, "Permission pill not visible");
  await pill.getByRole("button", { name: "Allow", exact: true }).waitFor({ state: "visible" });
  const invalidAction = async (action) => {
    const before = await app.evaluate(() => globalThis.__pillE2E.action);
    await pill.evaluate((action) => window.notificationPill.act(action), action);
    await until(
      () => app.evaluate((_electron, before) => globalThis.__pillE2E.action > before, before),
      "Action IPC not received",
    );
    assert.equal(
      await page.evaluate(() => window.__pillReplies.length),
      0,
      "Invalid action must not relay",
    );
    assert.equal((await windowState()).minimized, true, "Invalid action must not restore source");
  };
  await invalidAction({ token: "stale-token", action: "answer", optionId: "synthetic-allow" });
  await invalidAction({ token: "permission", action: "answer", optionId: "unknown-option" });
  await invalidAction({
    token: "permission",
    action: "answer",
    optionId: "synthetic-allow",
    unexpected: true,
  });
  await publish({
    token: "malformed",
    presentation: { ...presentation("malformed"), preview: "x".repeat(121) },
  });
  assert.equal(
    await pill.getByRole("button", { name: "Allow", exact: true }).count(),
    1,
    "Malformed publication must not replace permission",
  );

  await pill.getByRole("button", { name: "Allow", exact: true }).click();
  await page.waitForFunction(() => window.__pillReplies.length === 1);
  assert.deepEqual(await page.evaluate(() => window.__pillReplies[0]), {
    token: "permission",
    action: "answer",
    optionId: "synthetic-allow",
    context,
  });
  assert.equal((await windowState()).minimized, true, "Permission answer must not restore source");
  await pill.getByRole("button", { name: "Allow", exact: true }).waitFor({ state: "visible" });
  assert.equal(
    await pill.getByRole("button", { name: "Allow", exact: true }).isDisabled(),
    true,
    "Answer must serialize while waiting for resolution",
  );
  await publish({ token: "stale-clear" });
  assert.equal(await visiblePill(), true, "Stale clear must not hide current permission");
  await publish({ token: "permission" });
  await until(async () => !(await visiblePill()), "Explicit resolution clear did not hide pill");
  await publish({
    token: "permission-deny",
    presentation: presentation("permission-deny", "permission"),
  });
  await until(visiblePill, "Second permission pill not visible");
  await pill.getByRole("button", { name: "Deny", exact: true }).click();
  await page.waitForFunction(() => window.__pillReplies.length === 2);
  assert.deepEqual(await page.evaluate(() => window.__pillReplies[1]), {
    token: "permission-deny",
    action: "answer",
    optionId: "synthetic-deny",
    context,
  });
  assert.equal((await windowState()).minimized, true, "Deny must not restore source");
  await publish({ token: "permission-deny" });
  await until(async () => !(await visiblePill()), "Deny resolution clear did not hide pill");
  console.info(
    "PASS: real Electron focus suppression, minimized preview/Open, permission click/context, invalid actions/publication and clear.",
  );
  console.info(
    "V4 resolution not covered: synthetic reply observer only; no provider/service commands executed.",
  );
  console.info(`Isolated runtime: ${runtime}`);
} finally {
  await app.close();
}
