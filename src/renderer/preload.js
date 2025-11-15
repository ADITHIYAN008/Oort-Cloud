// src/renderer/preload.js
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("secureAPI", {
  loadURL: (url) => ipcRenderer.send("load-url", url),
  navControl: (action) => ipcRenderer.send("nav-control", action),
  emergencyExit: () => ipcRenderer.send("emergency-exit"),
  adminUpdateWhitelist: (list) =>
    ipcRenderer.invoke("admin-update-whitelist", list),
});
