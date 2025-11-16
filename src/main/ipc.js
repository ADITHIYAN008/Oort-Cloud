// src/main/ipc.js
const { ipcMain, webContents } = require("electron");
const path = require("path");
const fs = require("fs");

let _mainWindow = null;
let _view = null;

// config files
const USERS_FILE = path.join(__dirname, "../../config/users.json");
const WHITELIST_FILE = path.join(__dirname, "../../config/whitelist.json");
const LOG_FILE = path.join(__dirname, "../../logs/activity.log");

function safeReadJSON(file, fallback) {
  try {
    const raw = fs.readFileSync(file, "utf8").trim();
    return JSON.parse(raw);
  } catch (e) {
    console.warn(`safeReadJSON failed for ${file}:`, e.message || e);
    return fallback;
  }
}
function safeWriteJSON(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
    return true;
  } catch (e) {
    console.error("safeWriteJSON failed:", e);
    return false;
  }
}
function appendLogLine(line) {
  try {
    const ts = new Date().toISOString();
    const out = `${ts} ${line}\n`;
    fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
    fs.appendFileSync(LOG_FILE, out, "utf8");
  } catch (e) {
    console.warn("appendLogLine failed:", e);
  }
}

// Helpers for users
function readUsers() {
  return safeReadJSON(USERS_FILE, []);
}
function writeUsers(users) {
  return safeWriteJSON(USERS_FILE, users);
}

function loadWhitelist() {
  return safeReadJSON(WHITELIST_FILE, []);
}

function init({ mainWindow, view }) {
  _mainWindow = mainWindow;
  _view = view;

  // Load URL (supports search fallback)
  ipcMain.on("load-url", (event, url) => {
    if (!_view) return;
    try {
      let target = String(url || "").trim();
      if (!target) return;

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
      appendLogLine(`ADMIN_OPENURL (from admin/ctrl) ${target}`);
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
      appendLogLine("SYSTEM_OFFLINE_VIEW");
    }
  });

  ipcMain.on("go-online", () => {
    if (_view && global.currentExamURL) {
      _view.webContents.loadURL(global.currentExamURL);
      appendLogLine("SYSTEM_ONLINE_VIEW");
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

  // Emergency exit (admin quick exit of whole app)
  ipcMain.on("emergency-exit", () => {
    try {
      appendLogLine("SYSTEM_EMERGENCY_EXIT_BY_ADMIN");
      if (_mainWindow) _mainWindow.destroy();
    } catch {}
    process.exit(0);
  });

  // admin whitelist handlers (same as before)
  ipcMain.handle("admin-update-whitelist", async (event, newList) => {
    try {
      fs.writeFileSync(
        WHITELIST_FILE,
        JSON.stringify(newList, null, 2),
        "utf8"
      );
      appendLogLine(`WHITELIST_UPDATED (admin)`);
      return true;
    } catch (e) {
      console.error("admin-update-whitelist failed", e);
      return false;
    }
  });
  ipcMain.handle("admin-read-whitelist", async () => {
    return loadWhitelist();
  });

  /* -------------------------
     Users & auth
     - read/write users.json
     - auth-login uses users.json
     - maintain global.currentUser on success
     - admin APIs to list/update users
     - user-emergency-exit: lock user and log
     ------------------------- */

  ipcMain.handle("admin-list-users", async () => {
    return readUsers();
  });

  // update a single user object (by id). Partial updates allowed.
  ipcMain.handle("admin-update-user", async (event, { id, updates }) => {
    try {
      const users = readUsers();
      const idx = users.findIndex((u) => u.id === id);
      if (idx === -1) return { ok: false, error: "not-found" };
      users[idx] = { ...users[idx], ...updates };
      writeUsers(users);
      appendLogLine(`ADMIN_UPDATE_USER ${id} ${JSON.stringify(updates)}`);
      return { ok: true, user: users[idx] };
    } catch (e) {
      console.error("admin-update-user failed:", e);
      return { ok: false, error: e.message || String(e) };
    }
  });

  ipcMain.handle("admin-read-users", async () => {
    return readUsers();
  });

  // expose current logged-in user id (string) or null
  ipcMain.handle("get-current-user", async () => {
    return global.currentUser || null;
  });

  // user emergency exit: lock this user and log. Accept optional id, else use global.currentUser
  ipcMain.handle("user-emergency-exit", async (event, maybeId) => {
    try {
      const id = maybeId || global.currentUser;
      if (!id) {
        appendLogLine("USER_EMERGENCY_EXIT_FAILED no-current-user");
        return { ok: false, error: "no-current-user" };
      }

      const users = readUsers();
      const idx = users.findIndex((u) => u.id === id);
      if (idx === -1) return { ok: false, error: "not-found" };

      users[idx].locked = true;
      users[idx].enabled = false; // also disable to be safe
      users[idx].lastExit = new Date().toISOString();
      writeUsers(users);

      appendLogLine(`USER_EMERGENCY_EXIT ${id} locked=true`);

      // Optionally: force close main window / session for kiosk
      try {
        if (_mainWindow) _mainWindow.destroy();
      } catch {}

      process.exit(0);
      // never reached
      // return after exit in case of testing
      return { ok: true };
    } catch (e) {
      console.error("user-emergency-exit failed:", e);
      return { ok: false, error: e.message || String(e) };
    }
  });

  // Auth login: use config users
  ipcMain.handle("auth-login", async (event, { userid, password }) => {
    try {
      const users = readUsers();
      const found = users.find(
        (u) => u.id === userid && u.password === password
      );
      if (!found) {
        appendLogLine(`LOGIN_FAILED ${userid} (invalid-credentials)`);
        return { success: false, reason: "invalid" };
      }

      // blocked or disabled
      if (found.locked) {
        appendLogLine(`LOGIN_REFUSED ${userid} (locked)`);
        return { success: false, reason: "locked" };
      }
      if (found.enabled === false) {
        appendLogLine(`LOGIN_REFUSED ${userid} (disabled)`);
        return { success: false, reason: "disabled" };
      }

      // success: update lastLogin
      const now = new Date().toISOString();
      const idx = users.findIndex((u) => u.id === userid);
      if (idx !== -1) {
        users[idx].lastLogin = now;
        writeUsers(users);
      }

      // set global current user for this kiosk instance
      global.currentUser = userid;
      global.currentUserRole = found.role || "user";

      appendLogLine(`LOGIN_SUCCESS ${userid} role=${global.currentUserRole}`);

      // attach view and session filter (caller expects role)
      // Attach BrowserView only for normal users, NOT admin
      if (found.role !== "admin") {
        if (_mainWindow && _view) {
          _mainWindow.setBrowserView(_view);

          const TOPBAR_HEIGHT = 60;
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

          try {
            const { attachToSession } = require("./security/webRequest");
            attachToSession(_view.webContents.session);
          } catch (e) {
            console.error("Failed to attach session filter:", e);
          }
        }
      } else {
        // ADMIN MODE — REMOVE BrowserView if already attached
        try {
          _mainWindow.setBrowserView(null);
        } catch {}
      }

      // return success + role + id so front-end can store
      return { success: true, role: found.role || "user", id: found.id };
    } catch (e) {
      console.error("auth-login error:", e);
      return { success: false, reason: "error" };
    }
  });
}

module.exports = { init };
