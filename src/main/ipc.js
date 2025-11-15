// src/main/ipc.js
const { ipcMain } = require("electron");

let _mainWindow = null;
let _view = null;

function init({ mainWindow, view }) {
  _mainWindow = mainWindow;
  _view = view;

  ipcMain.on("load-url", (event, url) => {
    if (!_view) return;
    try {
      let target = String(url || "").trim();
      if (!target) return;
      if (!/^https?:\/\//i.test(target)) {
        if (target.includes(".")) target = "https://" + target;
        else
          target =
            "https://www.google.com/search?q=" + encodeURIComponent(target);
      }
      _view.webContents.loadURL(target);
    } catch (e) {
      console.error("load-url error", e);
    }
  });

  ipcMain.on("nav-control", (event, action) => {
    if (!_view) return;
    switch (action) {
      case "back":
        if (_view.webContents.canGoBack()) _view.webContents.goBack();
        break;
      case "forward":
        if (_view.webContents.canGoForward()) _view.webContents.goForward();
        break;
      case "reload":
        _view.webContents.reload();
        break;
    }
  });

  ipcMain.on("emergency-exit", () => {
    try {
      if (_mainWindow) _mainWindow.destroy();
    } catch {}
    process.exit(0);
  });

  // Admin update whitelist
  ipcMain.handle("admin-update-whitelist", async (event, newList) => {
    try {
      const fs = require("fs");
      const path = require("path");
      const p = path.join(__dirname, "../../config/whitelist.json");
      fs.writeFileSync(p, JSON.stringify(newList, null, 2), "utf8");
      return true;
    } catch (e) {
      console.error("admin-update-whitelist failed", e);
      return false;
    }
  });
}

module.exports = { init };
