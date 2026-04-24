const path = require("path");
const { app, BrowserWindow, Menu, ipcMain, screen, shell } = require("electron");

const isMac = process.platform === "darwin";
const FULL_BOUNDS = { width: 900, height: 640 };
const MINI_WIDTH = 220;
const MINI_MIN_HEIGHT = 200;
let mainWindow = null;
let lastFullBounds = null;
let lastMiniPosition = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    ...FULL_BOUNDS,
    minWidth: 760,
    minHeight: 520,
    backgroundColor: "#f8efe3",
    autoHideMenuBar: true,
    title: "Desktop Sticky Note",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, "index.html"));

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("moved", () => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      return;
    }
    const bounds = mainWindow.getBounds();
    lastMiniPosition = { x: bounds.x, y: bounds.y };
    mainWindow.webContents.send("mini-position-updated", lastMiniPosition);
  });
}

function getDefaultMiniBounds(height) {
  const display = screen.getPrimaryDisplay().workArea;
  const nextHeight = clamp(height || 500, MINI_MIN_HEIGHT, display.height - 80);
  return {
    x: display.x + display.width - MINI_WIDTH - 24,
    y: display.y + Math.max(24, Math.round((display.height - nextHeight) / 2)),
    width: MINI_WIDTH,
    height: nextHeight
  };
}

function switchToMini(height) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }
  lastFullBounds = mainWindow.getBounds();
  const defaultBounds = getDefaultMiniBounds(height);
  const nextBounds = lastMiniPosition
    ? { ...defaultBounds, x: lastMiniPosition.x, y: lastMiniPosition.y }
    : defaultBounds;

  mainWindow.setResizable(false);
  mainWindow.setMaximizable(false);
  mainWindow.setAlwaysOnTop(true, "floating");
  mainWindow.setBounds(nextBounds, true);
}

function switchToFull(payload = {}) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }
  const bounds = payload.fullWindowBounds || lastFullBounds || FULL_BOUNDS;
  mainWindow.setAlwaysOnTop(false);
  mainWindow.setResizable(true);
  mainWindow.setMaximizable(true);
  const nextBounds = {
    width: bounds.width || FULL_BOUNDS.width,
    height: bounds.height || FULL_BOUNDS.height
  };
  if (Number.isFinite(bounds.x) && Number.isFinite(bounds.y)) {
    nextBounds.x = bounds.x;
    nextBounds.y = bounds.y;
  }
  mainWindow.setBounds(nextBounds, true);
  if (!Number.isFinite(bounds.x) || !Number.isFinite(bounds.y)) {
    mainWindow.center();
  }
}

function resizeMini(height) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }
  const bounds = mainWindow.getBounds();
  const workArea = screen.getDisplayMatching(bounds).workArea;
  const nextHeight = clamp(height || bounds.height, MINI_MIN_HEIGHT, workArea.height - 80);
  mainWindow.setSize(MINI_WIDTH, nextHeight, true);
}

function buildMenu() {
  const template = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: "about" },
              { type: "separator" },
              { role: "services" },
              { type: "separator" },
              { role: "hide" },
              { role: "hideOthers" },
              { role: "unhide" },
              { type: "separator" },
              { role: "quit" }
            ]
          }
        ]
      : []),
    {
      label: "\u6587\u4ef6",
      submenu: [
        {
          label: "\u65b0\u5efa\u7a97\u53e3",
          accelerator: "CmdOrCtrl+Shift+N",
          click: () => createWindow()
        },
        { type: "separator" },
        isMac ? { role: "close" } : { role: "quit" }
      ]
    },
    {
      label: "\u7f16\u8f91",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" }
      ]
    },
    {
      label: "\u89c6\u56fe",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" }
      ]
    },
    {
      label: "\u7a97\u53e3",
      submenu: [
        { role: "minimize" },
        { role: "zoom" },
        ...(isMac ? [{ type: "separator" }, { role: "front" }] : [{ role: "close" }])
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

ipcMain.on("switch-to-mini", (_event, payload = {}) => {
  switchToMini(payload.height);
});

ipcMain.on("switch-to-full", (_event, payload = {}) => {
  switchToFull(payload);
});

ipcMain.on("resize-mini", (_event, payload = {}) => {
  resizeMini(payload.height);
});

app.whenReady().then(() => {
  buildMenu();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (!isMac) {
    app.quit();
  }
});
