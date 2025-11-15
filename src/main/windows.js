// src/main/windows.js
const { BrowserWindow, BrowserView } = require("electron");
const path = require("path");
const { attachToSession } = require("./security/webRequest");

const TOPBAR_HEIGHT = 60;

function createMainWindow() {
  const mainWindow = new BrowserWindow({
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

  mainWindow.loadFile(path.join(__dirname, "../renderer/pages/index.html"));

  // BrowserView for actual web browsing
  const view = new BrowserView({
    webPreferences: {
      partition: "persist:mainview",
      contextIsolation: false,
      nodeIntegration: false,
      // webSecurity: false,
      // allowRunningInsecureContent: true,
    },
  });

  mainWindow.setBrowserView(view);

  const resizeView = () => {
    const [width, height] = mainWindow.getContentSize();
    view.setBounds({
      x: 0,
      y: TOPBAR_HEIGHT,
      width,
      height: height - TOPBAR_HEIGHT,
    });
    view.setAutoResize({ width: true, height: true });
  };

  mainWindow.on("resize", resizeView);
  mainWindow.on("ready-to-show", resizeView);

  // Apply webRequest rules BEFORE loading any URL
  attachToSession(view.webContents.session);

  view.webContents.loadURL("about:blank");

  return { mainWindow, view };
}

module.exports = { createMainWindow };
