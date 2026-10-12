import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { checkNotificationPillRegressions } from "./notification-pill-regressions.mjs";
import {
  buildNotificationPillAnswersBundle,
  checkNotificationPillAnswerPanel,
} from "./notification-pill-answer-panel-e2e.mjs";

// Synthetic isolated Electron journey: no Host, Agent, settings, network or real permissions.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(root, "packages/desktop/package.json"));
const { _electron } = require("playwright-core");
const { build } = require("esbuild");
if (process.platform !== "win32") throw new Error("Windows overlay E2E requires Windows");
const output = join(root, ".quiet-studio-runtime", "notification-pill-e2e");
await mkdir(output, { recursive: true });
const run = await mkdtemp(join(output, "run-"));
const home = join(run, "home");
await mkdir(home);
const modulePath = join(root, "packages/desktop/src/main/notification-pill-overlay.ts");
await build({
  stdin: {
    contents: `
const { app, BrowserWindow, ipcMain, screen } = require('electron');
const { createNotificationPillOverlay } = require(${JSON.stringify(modulePath)});
app.setPath('userData', ${JSON.stringify(join(run, "electron"))});
app.setPath('sessionData', ${JSON.stringify(join(run, "session"))});
let owner;
app.whenReady().then(async () => {
  const source = new BrowserWindow({ width: 800, height: 600, webPreferences: { preload: ${JSON.stringify(join(run, "source.cjs"))}, contextIsolation: true, nodeIntegration: false } });
  owner = createNotificationPillOverlay({ platform: 'win32', ipcMain, screen,
    isMainRenderer: id => id === source.webContents.id,
    sourceWindow: event => BrowserWindow.fromWebContents(event.sender),
    isAppFocused: () => !source.isDestroyed() && source.isFocused(), warn: console.warn,
    createWindow: () => new BrowserWindow({ width: 520, height: 180, frame: false, transparent: true, show: false, alwaysOnTop: true, skipTaskbar: true, webPreferences: { preload: ${JSON.stringify(join(run, "notification-pill.cjs"))}, contextIsolation: true, nodeIntegration: false, sandbox: true } }),
    loadWindow: win => win.loadFile(${JSON.stringify(join(run, "notification-pill.html"))}),
    createPanelWindow: () => new BrowserWindow({ width: 520, height: 360, frame: false, transparent: true, show: false, alwaysOnTop: true, skipTaskbar: true, webPreferences: { preload: ${JSON.stringify(join(run, "notification-pill.cjs"))}, contextIsolation: true, nodeIntegration: false, sandbox: true } }),
    loadPanelWindow: win => win.loadFile(${JSON.stringify(join(run, "notification-pill-answers.html"))}) });
  app.on('browser-window-focus', (_event, win) => { if (win === source) owner.onAppFocus(); });
  await source.loadURL('data:text/html,<title>Synthetic source</title><h1>Synthetic source</h1>');
});
app.on('before-quit', () => owner?.dispose());
`,
    resolveDir: root,
  },
  bundle: true,
  platform: "node",
  format: "cjs",
  external: ["electron"],
  outfile: join(run, "main.cjs"),
});
await build({
  entryPoints: [join(root, "packages/desktop/src/preload/notification-pill.ts")],
  bundle: true,
  platform: "node",
  format: "cjs",
  external: ["electron"],
  outfile: join(run, "notification-pill.cjs"),
});
await build({
  entryPoints: [join(root, "packages/desktop/src/renderer/src/notification-pill.ts")],
  bundle: true,
  platform: "browser",
  format: "esm",
  outfile: join(run, "renderer.js"),
});
const html = await readFile(
  join(root, "packages/desktop/src/renderer/notification-pill.html"),
  "utf8",
);
await writeFile(
  join(run, "notification-pill.html"),
  html.replace("/src/notification-pill.ts", "./renderer.js"),
);
await buildNotificationPillAnswersBundle({ root, run, build, readFile, writeFile, join });
await writeFile(
  join(run, "source.cjs"),
  `const {contextBridge,ipcRenderer}=require('electron'); let replies=[]; ipcRenderer.on('mesaCode:notification-pill-reply',(_,value)=>replies.push(value)); ipcRenderer.on('mesaCode:task-notification-click',(_,value)=>replies.push({open:value})); contextBridge.exposeInMainWorld('testPill',{publish:value=>ipcRenderer.send('mesaCode:notification-pill-publish',value),replies:()=>replies,onAction:handler=>{const listener=(_,value)=>handler(value);ipcRenderer.on('mesaCode:notification-pill-reply',listener);return()=>ipcRenderer.removeListener('mesaCode:notification-pill-reply',listener);}});`,
);
// Mount the production interaction owner, hook, command factory and registry; stub only UI shell ports.
const stubs = {
  "@/ElicitationDialog.js": "export const ElicitationDialog = () => null;",
  "@/PermissionDialog.js": "export const PermissionDialog = () => null;",
  "@/v4/V4UserInputDialog.js": "export const V4UserInputDialog = () => null;",
  "@/hooks/useTaskNotifications.js":
    "export const usePendingInteractionTaskNotifications = () => {};",
  "@/hooks/usePlatform.js": "export const useOptionalPlatform = () => window.ownerPorts.platform;",
  "@/i18n/IntlProvider.js":
    "const intl = {formatMessage: ({id}) => id}; export const useMesaCodeIntl = () => ({intl});",
  "@/logger.js": "export const logger = {warn() {}, error() {}};",
  "@/store/StoreProvider.js":
    "export const useMesaCodeStoreWithDefault = selector => selector({notificationEnabled: window.ownerPorts.enabled});",
  "@/store/workspaceHookReviewStore.js":
    "const noop = () => {}; export const useWorkspaceHookReviewStore = selector => selector({connect: noop, disconnect: noop, upsert: noop, clear: noop});",
  "@/store/mesa-code-session-store.js":
    "export const useMesaCodeSessionStore = selector => selector({}); useMesaCodeSessionStore.getState = () => ({}); export const getWorkspaceState = () => ({}); export const getTaskUiState = () => ({elicitationFormDraftsByRequestId: {}});",
  "@/v4/pendingInteractionAdapter.js":
    "export const pendingPermissionToLegacyRequest = () => ({}); export const pendingUserInputToElicitationRequest = () => null; export const pendingUserInputToViewModel = () => ({});",
  "@/v4/V4ConversationContext.js":
    "export const useV4Conversation = () => window.ownerPorts.conversation;",
};
await build({
  stdin: {
    contents: `
import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {V4InteractionDialogs} from './src/v4/V4InteractionDialogs.tsx';
import {pendingCommandRegistry} from './src/v4/pendingCommandRegistry.ts';
const publications = [], calls = [], settled = [];
let actionHandler, lifecycleHandler, restartHandler, configure;
window.ownerPorts = {enabled: false, platform: {
  presentNotificationPill(value) {publications.push(value); window.testPill.publish(value);},
  onNotificationPillAction(handler) {actionHandler = handler; const off = window.testPill.onAction(handler); return () => {off(); actionHandler = undefined;};}
}, conversation: {
  sendCommand(envelope) {return new Promise(resolve => calls.push({envelope, recorded: pendingCommandRegistry.list(envelope.sessionId), resolve}));},
  onRuntimeLifecycle(handler) {lifecycleHandler = handler; return () => {lifecycleHandler = undefined;};},
  onRuntimeRestart(handler) {restartHandler = handler; return () => {restartHandler = undefined;};}
}};
const onCommandSettled = id => settled.push(id);
function Owner() {
  const [state, setState] = useState({enabled: false, snapshot: null});
  configure = next => setState(previous => ({...previous, ...next}));
  window.ownerPorts.enabled = state.enabled;
  return <V4InteractionDialogs sessionId="synthetic-session" workspacePath="C:/synthetic" workspaceIdentity="synthetic-remote" remoteSessionId="synthetic-attachment" snapshot={state.snapshot} onCommandSettled={onCommandSettled}/>;
}
window.ownerHarness = {
  configure: next => configure(next), publications: () => publications,
  calls: () => calls.map(({envelope, recorded}) => ({envelope, recorded})),
  answer: value => actionHandler?.(value), lifecycle: value => lifecycleHandler?.(value),
  restart: () => restartHandler?.(), settled: () => settled,
  registry: () => pendingCommandRegistry.list('synthetic-session'),
  ack: status => {const call = calls.at(-1); call.resolve({commandId: call.envelope.commandId, sessionId: call.envelope.sessionId, status});}
};
createRoot(document.getElementById('root')).render(<Owner/>);
`,
    resolveDir: join(root, "packages/ui"),
    loader: "tsx",
  },
  tsconfig: join(root, "packages/ui/tsconfig.json"),
  bundle: true,
  platform: "browser",
  format: "esm",
  outfile: join(run, "owner.js"),
  plugins: [
    {
      name: "synthetic-ui-ports",
      setup(plugin) {
        plugin.onResolve({ filter: /^@\// }, ({ path }) =>
          Object.hasOwn(stubs, path) ? { path, namespace: "synthetic-ui-ports" } : undefined,
        );
        plugin.onLoad({ filter: /.*/, namespace: "synthetic-ui-ports" }, ({ path }) => ({
          contents: stubs[path],
          loader: "js",
        }));
      },
    },
  ],
});
await writeFile(
  join(run, "owner.html"),
  '<!doctype html><title>Synthetic source</title><div id="root"></div><script type="module" src="./owner.js"></script>',
);
const env = { ...process.env };
for (const key of Object.keys(env)) if (/^(MESA_CODE_|MESA_|ELECTRON_)/.test(key)) delete env[key];
Object.assign(env, {
  HOME: home,
  USERPROFILE: home,
  MESA_CODE_DATA_BASE_DIR: home,
  MESA_CODE_DESKTOP_HOME_DIR: home,
  MESA_CODE_DISABLE_FIXED_REMOTE_DEBUGGING_PORT: "1",
});
const app = await _electron.launch({
  executablePath: require("electron"),
  args: [join(run, "main.cjs")],
  cwd: root,
  env,
  timeout: 60000,
});
const isSourceMinimized = () =>
  app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()
      .find((win) => win.getTitle() === "Synthetic source")
      .isMinimized(),
  );
try {
  const source = await app.firstWindow();
  await source.waitForFunction(() => Boolean(window.testPill));
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()
      .find((win) => win.getTitle() === "Synthetic source")
      .minimize(),
  );
  const value = {
    token: "first",
    kind: "permission",
    context: {
      taskId: "synthetic-session",
      requestId: "synthetic-request",
      workspacePath: "C:/synthetic",
      workspaceIdentity: "synthetic-remote",
      remoteSessionId: "synthetic-attachment",
      logEpoch: "epoch",
      revision: 1,
    },
    title: "Permission required",
    body: "Read synthetic fixture?",
    preview: "",
    openLabel: "Open app",
    error: "",
    busy: false,
    options: [
      { optionId: "original-once", kind: "allowOnce", label: "Allow once" },
      { optionId: "original-deny", kind: "deny", label: "Deny" },
    ],
    appearance: {
      background: "#18221c",
      foreground: "#fafafa",
      border: "#728878",
      accent: "#60bb88",
      fontSize: "14px",
    },
  };
  const publish = (value) => source.evaluate((value) => window.testPill.publish(value), value);
  const pillEvent = app.waitForEvent("window");
  await publish({ token: value.token, presentation: value });
  const pill = await pillEvent;
  await pill.getByRole("button", { name: "Allow once" }).waitFor();
  assert.equal(await isSourceMinimized(), true);
  await pill.getByRole("button", { name: "Allow once" }).focus();
  await pill.keyboard.press("Enter");
  await source.waitForFunction(() => window.testPill.replies().length === 1);
  assert.equal(await source.evaluate(() => window.testPill.replies()[0].optionId), "original-once");
  assert.equal(await pill.getByRole("button", { name: "Allow once" }).isDisabled(), true);
  assert.equal(await isSourceMinimized(), true, "Answer must not restore source");
  await publish({
    token: value.token,
    presentation: { ...value, error: "Could not send response. Try again." },
  });
  await pill.getByRole("alert").getByText("Could not send response. Try again.").waitFor();
  await pill.getByRole("button", { name: "Deny", exact: true }).click();
  await source.waitForFunction(() => window.testPill.replies().length === 2);
  assert.equal(await source.evaluate(() => window.testPill.replies()[1].optionId), "original-deny");
  await publish({ token: value.token });
  await app.evaluate(({ BrowserWindow }) => {
    const win = BrowserWindow.getAllWindows().find((win) => win.getTitle() === "Mesa Code");
    if (win.isVisible()) throw Error("Resolved pill still visible");
  });
  await publish({
    token: "status",
    presentation: {
      ...value,
      token: "status",
      kind: "status",
      options: [],
      title: "Task completed",
      preview: "Actual synthetic answer preview",
    },
  });
  await pill.getByText("Actual synthetic answer preview").waitFor();
  await pill.screenshot({ path: join(run, "pill.png") });
  await pill.getByRole("button", { name: "Open app" }).click();
  await source.waitForFunction(() =>
    window.testPill.replies().some((value) => value.open === "synthetic-session"),
  );
  assert.equal(await isSourceMinimized(), false);
  await checkNotificationPillAnswerPanel({ source, pill, app, publish, value });
  await source.goto(`file:///${join(run, "owner.html").replaceAll("\\", "/")}`);
  await source.waitForFunction(() => Boolean(window.ownerHarness));
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()
      .find((win) => win.getTitle() === "Synthetic source")
      .minimize(),
  );
  const snapshot = {
    sessionId: value.context.taskId,
    logEpoch: "owner-epoch",
    revision: 1,
    pendingInteractions: [
      {
        interactionId: "owner-request",
        kind: "permission",
        anchorRowId: null,
        createdAt: 1,
        payload: {
          kind: "permission",
          toolCallId: "fixture-call",
          toolName: "Read",
          summary: "Read synthetic owner fixture?",
          detail: null,
          options: [
            { optionId: "owner-once", label: "Allow once", kind: "allowOnce" },
            { optionId: "owner-deny", label: "Deny", kind: "deny" },
          ],
        },
      },
    ],
  };
  await source.evaluate(
    (snapshot) => window.ownerHarness.configure({ enabled: true, snapshot }),
    snapshot,
  );
  await pill.getByRole("button", { name: "notification.pill.allowOnce" }).waitFor();
  const presentation = await source.evaluate(
    () => window.ownerHarness.publications().findLast((value) => value.presentation).presentation,
  );
  const answer = {
    token: presentation.token,
    context: presentation.context,
    action: "answer",
    optionId: "owner-once",
  };
  await source.evaluate(
    (answer) =>
      window.ownerHarness.answer({
        ...answer,
        context: { ...answer.context, remoteSessionId: "wrong" },
      }),
    answer,
  );
  assert.equal(await source.evaluate(() => window.ownerHarness.calls().length), 0);
  await pill.getByRole("button", { name: "notification.pill.allowOnce" }).click();
  await source.waitForFunction(() => window.ownerHarness.calls().length === 1);
  let call = await source.evaluate(() => window.ownerHarness.calls()[0]);
  assert.equal(call.envelope.type, "resolveInteraction");
  assert.deepEqual(call.envelope.payload, {
    interactionId: "owner-request",
    answer: { optionId: "owner-once" },
  });
  assert.equal(call.recorded.length, 1, "registry records before transport");
  assert.equal(call.recorded[0].replay.kind, "sensitiveDigest");
  await source.evaluate((answer) => window.ownerHarness.answer(answer), answer);
  assert.equal(
    await source.evaluate(() => window.ownerHarness.calls().length),
    1,
    "in-flight answer serialized",
  );
  await source.evaluate(() => window.ownerHarness.ack("failed"));
  await pill.getByRole("alert").getByText("chat.permission.responseFailed").waitFor();
  assert.equal(
    await source.evaluate(() => window.ownerHarness.registry().length),
    0,
    "failed ACK settles sensitive digest",
  );
  await pill.getByRole("button", { name: "chat.permission.deny", exact: true }).click();
  await source.waitForFunction(() => window.ownerHarness.calls().length === 2);
  call = await source.evaluate(() => window.ownerHarness.calls()[1]);
  assert.equal(call.envelope.payload.answer.optionId, "owner-deny");
  await source.evaluate(() => window.ownerHarness.ack("accepted"));
  await source.waitForFunction(() => window.ownerHarness.settled().length === 2);
  assert.equal(await source.evaluate(() => window.ownerHarness.registry().length), 0);
  assert.equal(
    await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()
        .find((win) => win.getTitle() === "Mesa Code")
        .isVisible(),
    ),
    false,
    "Accepted ACK must clear pill",
  );
  assert.equal(await isSourceMinimized(), true, "ACK answer must not restore source");
  await source.evaluate(
    (snapshot) => window.ownerHarness.configure({ snapshot: { ...snapshot, revision: 2 } }),
    snapshot,
  );
  await source.waitForFunction(() =>
    window.ownerHarness.publications().some((value) => !value.presentation),
  );
  assert.equal(
    await source.evaluate(() =>
      window.ownerHarness
        .publications()
        .some((value) => value.presentation?.context.revision === 2),
    ),
    false,
    "accepted request cannot resurrect on revision",
  );
  const next = {
    ...snapshot,
    revision: 3,
    pendingInteractions: [{ ...snapshot.pendingInteractions[0], interactionId: "next-request" }],
  };
  await source.evaluate((snapshot) => window.ownerHarness.configure({ snapshot }), next);
  await pill.getByRole("button", { name: "notification.pill.allowOnce" }).waitFor();
  await source.evaluate(() => window.ownerHarness.configure({ enabled: false }));
  await source.waitForFunction(() => !window.ownerHarness.publications().at(-1).presentation);
  await source.evaluate(
    (snapshot) =>
      window.ownerHarness.configure({ enabled: true, snapshot: { ...snapshot, revision: 4 } }),
    next,
  );
  await pill.getByRole("button", { name: "notification.pill.allowOnce" }).waitFor();
  await checkNotificationPillRegressions({ source, pill, app, snapshot: { ...next, revision: 4 } });
  console.log(
    `Notification pill synthetic Electron interaction and V4 ACK checks passed. Evidence: ${run}`,
  );
} finally {
  await app.close();
}
