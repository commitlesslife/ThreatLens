import { createApp } from "./app.js";

export * from "./app.js";
export * from "./services/scope-service.js";
export * from "./services/analysis-service.js";
export * from "./services/case-service.js";

const PORT = parseInt(process.env.API_PORT || "3001", 10);

if (process.env.NODE_ENV !== "test" && /packages[/\\]api/.test(process.argv[1] || "")) {
  const app = createApp();
  app.listen(PORT, () => {
    console.log(`[ThreatLens] API server listening on http://localhost:${PORT}`);
    console.log(`[ThreatLens] Health check: http://localhost:${PORT}/health/live`);
  });
}
