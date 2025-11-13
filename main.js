const {
  app,
  BrowserWindow,
  BrowserView,
  ipcMain,
  globalShortcut,
} = require("electron");
const path = require("path");

const allowedDomains = ["google.com", "tcs.com", "w3schools.com"];
let mainWindow, view;

function createWindow() {
  mainWindow = new BrowserWindow({
    fullscreen: true,
    frame: false,
    alwaysOnTop: true,
    kiosk: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile("index.html");

  view = new BrowserView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.setBrowserView(view);
  resizeView();

  view.webContents.loadURL("about:blank");

  mainWindow.on("resize", resizeView);

  view.webContents.on("will-navigate", (event, url) => {
    if (!isAllowed(url)) {
      event.preventDefault();
      view.webContents.loadURL(
        "data:text/html,<h1 style='color:red;text-align:center;margin-top:40vh;'>❌ Access Blocked</h1>"
      );
    }
  });

  ipcMain.on("navigate", (e, url) => {
    if (!url.startsWith("http")) url = "https://" + url;
    if (isAllowed(url)) {
      view.webContents.loadURL(url);
    } else {
      view.webContents.loadURL(
        "data:text/html,<h1 style='color:red;text-align:center;margin-top:40vh;'>❌ Access Blocked</h1>"
      );
    }
  });

  ipcMain.on("nav-control", (e, action) => {
    switch (action) {
      case "back":
        if (view.webContents.canGoBack()) view.webContents.goBack();
        break;
      case "forward":
        if (view.webContents.canGoForward()) view.webContents.goForward();
        break;
      case "reload":
        view.webContents.reload();
        break;
    }
  });

  ipcMain.on("emergency-exit", () => app.quit());
  globalShortcut.register("CommandOrControl+Shift+Q", () => app.quit());
}

function resizeView() {
  const [width, height] = mainWindow.getContentSize();
  view.setBounds({ x: 0, y: 60, width, height: height - 60 });
  view.setAutoResize({ width: true, height: true });
}

function isAllowed(url) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    return allowedDomains.some(
      (domain) => hostname === domain || hostname.endsWith("." + domain)
    );
  } catch {
    return false;
  }
}

app.whenReady().then(createWindow);
app.on("window-all-closed", () => app.quit());
