const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktopShell", {
  platform: process.platform,
  isElectron: true,
  switchToMini: (height) => ipcRenderer.send("switch-to-mini", { height }),
  switchToFull: (payload) => ipcRenderer.send("switch-to-full", payload || {}),
  resizeMini: (height) => ipcRenderer.send("resize-mini", { height }),
  onMiniPosition: (callback) => {
    if (typeof callback !== "function") {
      return () => {};
    }
    const handler = (_event, position) => callback(position);
    ipcRenderer.on("mini-position-updated", handler);
    return () => ipcRenderer.removeListener("mini-position-updated", handler);
  }
});
