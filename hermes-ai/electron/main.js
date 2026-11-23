const { app, BrowserWindow } = require("electron");
const path = require("path");
const http = require("http");
const { spawn } = require("child_process");

let mainWindow = null;
let serverProcess = null;
const PORT = 3000;
const URL = `http://localhost:${PORT}`;

function checkServerReady() {
  return new Promise((resolve) => {
    const req = http.get(URL, (res) => resolve(res.statusCode < 500));
    req.on("error", () => resolve(false));
    req.setTimeout(800, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function startServer() {
  const isReady = await checkServerReady();
  if (isReady) return;

  const nextBin = path.join(__dirname, "../node_modules/next/dist/bin/next");
  serverProcess = spawn(process.execPath, [nextBin, "start", "-p", String(PORT)], {
    cwd: path.join(__dirname, ".."),
    stdio: "ignore",
    detached: false,
  });

  let attempts = 0;
  while (attempts < 30) {
    await new Promise((r) => setTimeout(r, 400));
    if (await checkServerReady()) break;
    attempts++;
  }
}

async function createWindow() {
  await startServer();

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 800,
    minHeight: 600,
    title: "Hermes AI",
    backgroundColor: "#09090b",
    autoHideMenuBar: true,
    icon: path.join(__dirname, "../app/favicon.ico"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadURL(URL);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (serverProcess) {
    try {
      process.kill(serverProcess.pid);
    } catch {}
  }
  if (process.platform !== "darwin") {
    app.quit();
  }
});

