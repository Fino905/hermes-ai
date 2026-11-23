const { spawn, execSync } = require("child_process");
const http = require("http");
const path = require("path");
const fs = require("fs");

const PORT = 3000;
const URL = `http://localhost:${PORT}`;
const APP_DIR = path.join(__dirname, "hermes-ai");

// Check if port is already active
function checkServerReady() {
  return new Promise((resolve) => {
    const req = http.get(URL, (res) => {
      resolve(res.statusCode < 500);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

// Check if local LLM backend is online
function checkLlmReady() {
  return new Promise((resolve) => {
    const req = http.get(
      "http://127.0.0.1:18434/v1/models",
      { headers: { Authorization: "Bearer 6xcq5LFBTUHkN-8VjjTRb_XLX-GephFj" } },
      (res) => resolve(res.statusCode < 500)
    );
    req.on("error", () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

// Find Chrome or Edge executable
function findBrowserExe() {
  const possiblePaths = [
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    path.join(process.env.LOCALAPPDATA || "", "Microsoft\\Edge\\Application\\msedge.exe"),
    path.join(process.env.LOCALAPPDATA || "", "Google\\Chrome\\Application\\chrome.exe"),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

async function main() {
  console.log("Checking Fwinobox AI system status...");

  // 1. Ensure local LLM backend is running
  let isLlmOnline = await checkLlmReady();
  if (!isLlmOnline) {
    console.log("Starting local AI model backend in background...");
    try {
      execSync('start explorer.exe shell:AppsFolder\\NousResearchInc.HermesAgent_sznbd6dv1j3v4!HermesBundled');
    } catch {}

    // Give local model backend time to initialize (up to 15 seconds)
    let llmAttempts = 0;
    while (!isLlmOnline && llmAttempts < 25) {
      await new Promise((r) => setTimeout(r, 600));
      isLlmOnline = await checkLlmReady();
      llmAttempts++;
    }
    if (isLlmOnline) {
      console.log("Local AI model backend is online and ready!");
    } else {
      console.log("Local AI model backend is continuing startup in background.");
    }
  }

  // 2. Ensure web server is running
  let isReady = await checkServerReady();
  let serverProcess = null;

  if (!isReady) {
    console.log("Starting Fwinobox AI local server in background...");
    const nextBin = path.join(APP_DIR, "node_modules", "next", "dist", "bin", "next");

    serverProcess = spawn(process.execPath, [nextBin, "start", "-p", String(PORT)], {
      cwd: APP_DIR,
      stdio: "ignore",
      detached: false,
    });

    // Wait for server to become ready
    let attempts = 0;
    while (!isReady && attempts < 30) {
      await new Promise((r) => setTimeout(r, 500));
      isReady = await checkServerReady();
      attempts++;
    }
  }

  // 3. Launch desktop app window
  const browserPath = findBrowserExe();
  if (browserPath) {
    console.log(`Launching Fwinobox AI standalone app window using ${path.basename(browserPath)}...`);
    const browserProcess = spawn(
      browserPath,
      [`--app=${URL}`, "--window-size=1280,820", "--app-id=fwinobox-ai-app"],
      { stdio: "ignore" }
    );

    browserProcess.on("exit", () => {
      if (serverProcess) {
        try {
          process.kill(serverProcess.pid);
        } catch {}
      }
      process.exit(0);
    });
  } else {
    // Fallback: open default system browser
    execSync(`start ${URL}`, { shell: "cmd.exe" });
  }
}

main().catch(console.error);
