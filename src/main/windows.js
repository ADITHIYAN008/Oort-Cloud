// src/main/windows.js
const { BrowserWindow, BrowserView } = require("electron");
const path = require("path");
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

  // Load the login page only
  mainWindow.loadFile(path.join(__dirname, "../renderer/pages/login.html"));

  // Create BrowserView for later but DO NOT attach it yet
  const view = new BrowserView({
    webPreferences: {
      partition: "persist:mainview",
      preload: path.join(__dirname, "../renderer/preload.js"), // important
      contextIsolation: true,
      nodeIntegration: false,
      devTools: false,
    },
  });

  // store for later use by ipc
  mainWindow._examView = view;

  return { mainWindow, view };
}

module.exports = { createMainWindow };
