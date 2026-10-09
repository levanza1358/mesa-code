import { contextBridge, ipcRenderer } from "electron";
// Keep sandboxed preload independent of packages with Node-dependent exports.
const channels = {
  state: "mesaCode:notification-pill-state",
  action: "mesaCode:notification-pill-action",
};
contextBridge.exposeInMainWorld("notificationPill", {
  onState: (callback: (state: unknown) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, state: unknown) => callback(state);
    ipcRenderer.on(channels.state, listener);
    return () => ipcRenderer.removeListener(channels.state, listener);
  },
  act: (action: unknown) => ipcRenderer.send(channels.action, action),
});
