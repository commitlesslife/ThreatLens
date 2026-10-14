import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { createApp, ScopeService, AnalysisService, CaseService } from "../packages/api/src/index.js";
import { createFixtureApp, MockReceiverStore } from "../packages/fixture-server/src/index.js";
import { app as webApp } from "../packages/web/src/server.js";

async function main() {
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
  const fixtureServer = fixtureApp.listen(4001);
  await new Promise<void>(res => fixtureServer.once("listening", res));
  console.log("  ✓ Fixture Server: http://localhost:4001\n");

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
  const apiServer = apiApp.listen(3001);
  await new Promise<void>(res => apiServer.once("listening", res));
  console.log("  ✓ ThreatLens API: http://localhost:3001\n");

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
  console.log("     1. Open chrome://extensions and enable 'Developer mode'");
  console.log("     2. Click 'Load unpacked' and choose: " + path.resolve("packages/extension"));
  console.log("     3. Open any fixture tab above and launch the ThreatLens side panel\n");
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
