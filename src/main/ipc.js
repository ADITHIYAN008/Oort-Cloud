// src/main/ipc.js
const { ipcMain } = require("electron");
const path = require("path");

let _mainWindow = null;
let _view = null;

function init({ mainWindow, view }) {
  _mainWindow = mainWindow;
  _view = view;

  // Load URL (supports search fallback)
  ipcMain.on("load-url", (event, url) => {
    if (!_view) return;

    try {
      let target = String(url || "").trim();
      if (!target) return;

      // allow search fallback: example.com -> https://example.com, "youtube" -> google search
      if (!/^https?:\/\//i.test(target)) {
        if (target.includes(".")) {
          target = "https://" + target;
        } else {
          target =
            "https://www.google.com/search?q=" + encodeURIComponent(target);
        }
      }

      global.currentExamURL = target;
      _view.webContents.loadURL(target);
    } catch (e) {
      console.error("load-url error", e);
    }
  });

  // Offline / Online handlers
  ipcMain.on("go-offline", () => {
    if (_view) {
      _view.webContents.loadFile(
        path.join(__dirname, "../renderer/pages/offline.html")
      );
    }
  });

  ipcMain.on("go-online", () => {
    if (_view && global.currentExamURL) {
      _view.webContents.loadURL(global.currentExamURL);
    }
  });

  // Navigation
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

  // Emergency exit
  ipcMain.on("emergency-exit", () => {
    try {
      if (_mainWindow) _mainWindow.destroy();
    } catch {}
    process.exit(0);
  });

  // Admin save whitelist
  ipcMain.handle("admin-update-whitelist", async (event, newList) => {
    try {
      const fs = require("fs");
      const p = path.join(__dirname, "../../config/whitelist.json");
      fs.writeFileSync(p, JSON.stringify(newList, null, 2), "utf8");
      return true;
    } catch (e) {
      console.error("admin-update-whitelist failed", e);
      return false;
    }
  });
  ipcMain.handle("admin-read-whitelist", async () => {
    const fs = require("fs");
    const path = require("path");
    const file = path.join(__dirname, "../../config/whitelist.json");

    try {
      return JSON.parse(fs.readFileSync(file, "utf8"));
    } catch (e) {
      console.error("Failed to read whitelist.json", e);
      return [];
    }
  });

  // Auth login: attach BrowserView and attachToSession after success
  ipcMain.handle("auth-login", async (event, { userid, password }) => {
    const users = [
      { id: "user01", pass: "1234", role: "user" },
      { id: "user02", pass: "abcd", role: "user" },
      { id: "admin01", pass: "admin123", role: "admin" },
      { id: "supervisor", pass: "tcs2025", role: "admin" },
    ];

    const found = users.find((u) => u.id === userid && u.pass === password);

    if (!found) {
      return { success: false };
    }

    const role = found.role;

    if (_mainWindow && _view) {
      // attach view now
      _mainWindow.setBrowserView(_view);

      const TOPBAR_HEIGHT = role === "admin" ? 0 : 60;
      const resizeView = () => {
        const [width, height] = _mainWindow.getContentSize();
        _view.setBounds({
          x: 0,
          y: TOPBAR_HEIGHT,
          width,
          height: height - TOPBAR_HEIGHT,
        });
        _view.setAutoResize({ width: true, height: true });
      };

      resizeView();
      _mainWindow.on("resize", resizeView);

      // Attach session filter (whitelist)
      try {
        const { attachToSession } = require("./security/webRequest");
        attachToSession(_view.webContents.session);
      } catch (e) {
        console.error("Failed to attach session filter:", e);
      }
    }

    // load appropriate page
    if (role === "admin") {
      _view.webContents.loadFile(
        path.join(__dirname, "../renderer/pages/admin.html")
      );
    } else {
      global.currentExamURL = "about:blank";
      _view.webContents.loadURL("about:blank");
    }

    return { success: true, role };
  });
}

module.exports = { init };
