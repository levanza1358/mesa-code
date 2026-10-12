import { contextBridge, ipcRenderer } from "electron";
// Keep sandboxed preload independent of packages with Node-dependent exports.
const channels = {
  state: "mesaCode:notification-pill-state",
  panelState: "mesaCode:notification-pill-panel-state",
  action: "mesaCode:notification-pill-action",
};
contextBridge.exposeInMainWorld("notificationPill", {
  onState: (callback: (state: unknown) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, state: unknown) => callback(state);
    ipcRenderer.on(channels.state, listener);
    return () => ipcRenderer.removeListener(channels.state, listener);
  },
  // The answer panel window receives the same presentation shape on its own channel.
  onPanelState: (callback: (state: unknown) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, state: unknown) => callback(state);
    ipcRenderer.on(channels.panelState, listener);
    return () => ipcRenderer.removeListener(channels.panelState, listener);
  },
  act: (action: unknown) => ipcRenderer.send(channels.action, action),
});
