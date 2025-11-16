const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("secureAPI", {
  loadURL: (url) => ipcRenderer.send("load-url", url),
  navControl: (action) => ipcRenderer.send("nav-control", action),

  emergencyExit: () => ipcRenderer.send("emergency-exit"),

  adminUpdateWhitelist: (list) =>
    ipcRenderer.invoke("admin-update-whitelist", list),
  readWhitelist: () => ipcRenderer.invoke("admin-read-whitelist"),

  login: (userid, password) =>
    ipcRenderer.invoke("auth-login", { userid, password }),

  adminListUsers: () => ipcRenderer.invoke("admin-list-users"),
  adminReadUsers: () => ipcRenderer.invoke("admin-read-users"),
  adminUpdateUser: (payload) =>
    ipcRenderer.invoke("admin-update-user", payload),

  getCurrentUser: () => ipcRenderer.invoke("get-current-user"),
  userEmergencyExit: (id) => ipcRenderer.invoke("user-emergency-exit", id),
});

window.addEventListener("contextmenu", (e) => e.preventDefault());

window.addEventListener("DOMContentLoaded", () => {
  document.addEventListener("selectstart", (e) => e.preventDefault());
  document.addEventListener("dragstart", (e) => e.preventDefault());

  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey) {
      if (["c", "x", "v", "a"].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    }
  });

  let lastStatus = navigator.onLine;
  setInterval(() => {
    const now = navigator.onLine;
    if (now !== lastStatus) {
      if (!now) ipcRenderer.send("go-offline");
      else ipcRenderer.send("go-online");
    }
    lastStatus = now;
  }, 1200);
});
