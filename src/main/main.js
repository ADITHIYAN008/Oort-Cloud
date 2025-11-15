// src/main/main.js
const path = require("path");
const { app } = require("electron");

const windows = require("./windows");
const ipc = require("./ipc");
const shortcutBlocker = require("./security/shortcutBlocker");
const kiosk = require("./security/kiosk");

let mainWindow, view;

function init() {
  // create window + view
  ({ mainWindow, view } = windows.createMainWindow());

  // init IPC with view reference
  ipc.init({ mainWindow, view });

  // apply kiosk behavior & shortcut blocks
  kiosk.apply(mainWindow);
  shortcutBlocker.register();
}

app.whenReady().then(init);

app.on("window-all-closed", () => {
  app.quit();
});
