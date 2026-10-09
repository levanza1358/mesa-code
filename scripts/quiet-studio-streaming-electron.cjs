const { app, BrowserWindow, session } = require("electron");
const { join } = require("node:path");
const runtime = process.env.QUIET_STUDIO_FIXTURE_RUNTIME;
if (!runtime) throw new Error("Missing isolated fixture runtime");
app.setPath("userData", join(runtime, "electron"));
app.setPath("sessionData", join(runtime, "electron", "session"));
app.whenReady().then(() => {
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    const allowed = /^(https?:\/\/127\.0\.0\.1:|ws:\/\/127\.0\.0\.1:|data:|blob:)/u.test(
      details.url,
    );
    callback({ cancel: !allowed });
  });
  const window = new BrowserWindow({
    width: 1100,
    height: 800,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });
  window.loadURL(process.env.QUIET_STUDIO_FIXTURE_URL);
});
app.on("window-all-closed", () => app.quit());
