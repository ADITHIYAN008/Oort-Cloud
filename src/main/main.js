const { app, globalShortcut } = require("electron");
const path = require("path");

const windows = require("./windows");
const ipc = require("./ipc");
const shortcutBlocker = require("./security/shortcutBlocker");
const kiosk = require("./security/kiosk");

let mainWindow, view;

function disableShortcuts() {
  const blocked = [
    "CommandOrControl+R",
    "CommandOrControl+Shift+R",
    "CommandOrControl+N",
    "CommandOrControl+T",
    "CommandOrControl+W",
    "CommandOrControl+Shift+I",
    "F12",
    "F11",
    "Alt+Tab",
  ];

  blocked.forEach((shortcut) => {
    globalShortcut.register(shortcut, () => {});
  });
}

function init() {
  ({ mainWindow, view } = windows.createMainWindow());

  kiosk.apply(mainWindow);
  shortcutBlocker.register();
  ipc.init({ mainWindow, view });

  disableShortcuts();
}

app.whenReady().then(init);

app.on("window-all-closed", () => {
  app.quit();
});
