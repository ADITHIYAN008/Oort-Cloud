// src/main/security/shortcutBlocker.js
const { globalShortcut } = require("electron");

function register() {
  try {
    // Block app-level shortcuts (some OS-level cannot be blocked)
    globalShortcut.register("CommandOrControl+R", () => {});
    globalShortcut.register("CommandOrControl+W", () => {});
    globalShortcut.register("Alt+F4", () => {});
    globalShortcut.register("CommandOrControl+Q", () => {});
    // emergency developer quit
    globalShortcut.register("CommandOrControl+Shift+Q", () => {
      process.exit(0);
    });
  } catch (e) {
    console.warn("shortcut register failed", e);
  }
}

module.exports = { register };
