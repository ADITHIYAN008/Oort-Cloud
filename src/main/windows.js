const { BrowserWindow, BrowserView } = require("electron");
const path = require("path");
const TOPBAR_HEIGHT = 60;

function createMainWindow() {
  const mainWindow = new BrowserWindow({
    title: "Oort Cloud",
    width: 1366,
    height: 768,
    frame: false,
    fullscreen: true,
    kiosk: true,
    webPreferences: {
      preload: path.join(__dirname, "../renderer/preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.on("close", (e) => e.preventDefault());
  mainWindow.on("before-quit", (e) => e.preventDefault());
  mainWindow.on("session-end", (e) => e.preventDefault());
  mainWindow.on("minimize", (e) => e.preventDefault());
  mainWindow.on("hide", (e) => e.preventDefault());

  mainWindow.on("blur", () => {
    setTimeout(() => {
      try {
        if (mainWindow.isDestroyed()) return;

        mainWindow.show();
        mainWindow.focus();

        mainWindow.setAlwaysOnTop(true, "screen-saver");

        setTimeout(() => {
          try {
            if (!mainWindow.isDestroyed()) {
              mainWindow.setAlwaysOnTop(false);
            }
          } catch {}
        }, 50);
      } catch (e) {
        console.warn("Refocus error:", e);
      }
    }, 20);
  });

  mainWindow.loadFile(path.join(__dirname, "../renderer/pages/login.html"));

  const view = new BrowserView({
    webPreferences: {
      partition: "persist:mainview",
      preload: path.join(__dirname, "../renderer/preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      devTools: false,
    },
  });

  mainWindow._examView = view;

  return { mainWindow, view };
}

module.exports = { createMainWindow };
