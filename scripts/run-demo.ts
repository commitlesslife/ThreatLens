import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execSync, spawn } from "node:child_process";
import { createApp, ScopeService, AnalysisService, CaseService } from "../packages/api/src/index.js";
import { createFixtureApp, MockReceiverStore } from "../packages/fixture-server/src/index.js";
import { app as webApp } from "../packages/web/src/server.js";

function findChromiumPath(): { path: string; name: string } | null {
  const candidates: { path: string; name: string }[] = [];

  if (process.platform === "win32") {
    candidates.push(
      { path: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", name: "Google Chrome" },
      { path: "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe", name: "Google Chrome" },
      { path: path.join(process.env.LOCALAPPDATA || "", "Google\\Chrome\\Application\\chrome.exe"), name: "Google Chrome" },
      { path: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe", name: "Microsoft Edge" },
      { path: "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe", name: "Microsoft Edge" }
    );
  } else if (process.platform === "darwin") {
    candidates.push(
      { path: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", name: "Google Chrome" },
      { path: "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge", name: "Microsoft Edge" }
    );
  } else {
    candidates.push(
      { path: "/usr/bin/google-chrome", name: "Google Chrome" },
      { path: "/usr/bin/google-chrome-stable", name: "Google Chrome" },
      { path: "/usr/bin/chromium-browser", name: "Chromium" },
      { path: "/usr/bin/chromium", name: "Chromium" }
    );
  }

  for (const c of candidates) {
    if (c.path && fs.existsSync(c.path)) {
      return c;
    }
  }
  return null;
}

function launchBrowser(activeWebPort: number) {
  const extPath = path.resolve("packages/extension");
  const userDataDir = path.join(os.tmpdir(), "threatlens-chrome-demo-profile");
  const urls = [
    `http://localhost:${activeWebPort}`,
    "http://localhost:4001/fixtures/synthetic-inbox"
  ];

  const browser = findChromiumPath();

  if (browser) {
    console.log(`[Browser] Launching ${browser.name} with ThreatLens MV3 extension pre-loaded...`);
    const args = [
      `--load-extension=${extPath}`,
      `--user-data-dir=${userDataDir}`,
      "--no-first-run",
      "--no-default-browser-check",
      ...urls
    ];
    try {
      const child = spawn(browser.path, args, {
        detached: true,
        stdio: "ignore"
      });
      child.unref();
      console.log(`  ✓ ${browser.name} opened with:`);
      console.log(`     • ThreatLens Dashboard: http://localhost:${activeWebPort}`);
      console.log(`     • Synthetic Inbox:      http://localhost:4001/fixtures/synthetic-inbox`);
      console.log(`     • Pre-loaded Extension: ${extPath}\n`);
      return;
    } catch (err) {
      console.warn("  ⚠ Failed to spawn browser directly, falling back to default launcher:", err);
    }
  }

  console.log("[Browser] Opening default system browser to demo URLs...");
  try {
    if (process.platform === "win32") {
      execSync(`start http://localhost:${activeWebPort}`, { stdio: "ignore" });
      execSync("start http://localhost:4001/fixtures/synthetic-inbox", { stdio: "ignore" });
    } else if (process.platform === "darwin") {
      execSync(`open http://localhost:${activeWebPort}`);
      execSync("open http://localhost:4001/fixtures/synthetic-inbox");
    } else {
      execSync(`xdg-open http://localhost:${activeWebPort}`);
      execSync("xdg-open http://localhost:4001/fixtures/synthetic-inbox");
    }
  } catch (e) {
    console.warn("  ⚠ Could not open default browser automatically:", e);
  }
}

async function main() {
  const shouldOpenBrowser = process.argv.includes("--open-browser") || 
                            process.env.OPEN_BROWSER === "1" || 
                            process.env.OPEN_BROWSER === "true";

  console.clear();
  console.log("=======================================================================");
  console.log("             THREATLENS FULL STACK DEMO RUNNER                        ");
  console.log("=======================================================================\n");

  // Step 1: Ensure bundle files exist
  const extDist = path.resolve("packages/extension/dist/content.js");
  const webDist = path.resolve("packages/web/dist/app.js");

  if (!fs.existsSync(extDist) || !fs.existsSync(webDist)) {
    console.log("[1/4] Building Extension & Web client bundles...");
    try {
      execSync("npm run build:extension && npm run build:web", { stdio: "inherit" });
      console.log("  ✓ Bundles ready.\n");
    } catch (err) {
      console.error("Build failed:", err);
      process.exit(1);
    }
  } else {
    console.log("[1/4] Client bundles verified.\n");
  }

  // Step 2: Start Fixture Server (Port 4001)
  console.log("[2/4] Starting Fixture Server & Team Mock Receiver on port 4001...");
  const mockStore = new MockReceiverStore();
  const { app: fixtureApp } = createFixtureApp({ mockStore });
  let fixtureServer: http.Server;
  try {
    fixtureServer = fixtureApp.listen(4001);
    await new Promise<void>((res, rej) => {
      fixtureServer.once("listening", res);
      fixtureServer.once("error", rej);
    });
    console.log("  ✓ Fixture Server: http://localhost:4001\n");
  } catch (err: any) {
    console.error(`\n[Error] Could not start Fixture Server on port 4001: ${err.message}`);
    console.error("Please verify that port 4001 is not already occupied by another service.");
    process.exit(1);
  }

  // Step 3: Start API Server (Port 3001)
  console.log("[3/4] Starting ThreatLens REST & SSE API on port 3001...");
  const scopeService = new ScopeService();
  const analysisService = new AnalysisService({
    scopeService,
    executionDelayMs: 150,
    fixtureBaseUrl: "http://localhost:4001"
  });
  const caseService = new CaseService();
  const apiApp = createApp({ scopeService, analysisService, caseService });
  let apiServer: http.Server;
  try {
    apiServer = apiApp.listen(3001);
    await new Promise<void>((res, rej) => {
      apiServer.once("listening", res);
      apiServer.once("error", rej);
    });
    console.log("  ✓ ThreatLens API: http://localhost:3001\n");
  } catch (err: any) {
    console.error(`\n[Error] Could not start ThreatLens API on port 3001: ${err.message}`);
    console.error("Please verify that port 3001 is not already occupied by another service.");
    process.exit(1);
  }

  // Step 4: Start Web Application (Port 3000 or 3002)
  console.log("[4/4] Starting ThreatLens Web Application UI...");
  let activeWebPort = 3000;
  let webServer: http.Server;

  try {
    await new Promise<void>((resolve, reject) => {
      const server = webApp.listen(3000);
      server.once("listening", () => {
        webServer = server;
        resolve();
      });
      server.once("error", (err: any) => {
        if (err.code === "EADDRINUSE") {
          console.log("  ℹ Port 3000 is occupied by an external service. Falling back to port 3002...");
          activeWebPort = 3002;
          const altServer = webApp.listen(3002);
          altServer.once("listening", () => {
            webServer = altServer;
            resolve();
          });
          altServer.once("error", reject);
        } else {
          reject(err);
        }
      });
    });
    console.log(`  ✓ ThreatLens Web UI: http://localhost:${activeWebPort}\n`);
  } catch (err) {
    console.error("Could not start Web server:", err);
    process.exit(1);
  }

  // Ready Banner
  console.log("=======================================================================");
  console.log("              ALL THREATLENS SERVICES ACTIVE & READY                   ");
  console.log("=======================================================================\n");
  console.log("  🖥️  Web Application:       http://localhost:" + activeWebPort);
  console.log("  ⚙️  REST & SSE API:         http://localhost:3001");
  console.log("  🏥 API Health Live:        http://localhost:3001/health/live\n");
  console.log("  🧪 Controlled Test Fixtures:");
  console.log("     • Simulated Webmail:    http://localhost:4001/fixtures/synthetic-inbox");
  console.log("     • Simulated Chat:       http://localhost:4001/fixtures/synthetic-chat");
  console.log("     • Scholarship Lure:     http://localhost:4001/fixtures/scholarship");
  console.log("     • Anti-Crawl Cloaking:  http://localhost:4001/fixtures/cloaked");
  console.log("     • Brand Clone (Bank):   http://localhost:4001/fixtures/brand-clone");
  console.log("     • Benign Campus Portal: http://localhost:4001/fixtures/benign-portal");
  console.log("     • Mock Canary Receipts: http://localhost:4001/receiver/receipts\n");
  console.log("  🧩 Chrome Extension (MV3):");
  console.log("     1. Directory: " + path.resolve("packages/extension"));
  console.log("     2. Developer Mode: Unpacked MV3 Extension with Side Panel\n");

  if (shouldOpenBrowser) {
    launchBrowser(activeWebPort);
  } else {
    console.log("  💡 Tip: Double-click 'run.bat' or run 'npm run demo -- --open-browser'");
    console.log("     to automatically launch Chrome with the extension pre-loaded!\n");
  }

  console.log("  Press [Ctrl + C] to halt all services cleanly.\n");

  // Keep alive & handle graceful shutdown
  const shutdown = () => {
    console.log("\n[ThreatLens] Shutting down services...");
    fixtureServer.close(() => console.log("  ✓ Fixture server stopped."));
    apiServer.close(() => console.log("  ✓ API server stopped."));
    webServer.close(() => console.log("  ✓ Web server stopped."));
    setTimeout(() => process.exit(0), 500);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

void main();
