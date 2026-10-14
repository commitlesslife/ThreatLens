import { createFixtureApp } from "./server.js";

export * from "./manifest.js";
export * from "./receiver/mock-receiver.js";
export * from "./fixtures/pages.js";
export * from "./server.js";

const PORT = parseInt(process.env.FIXTURE_SERVER_PORT || "4001", 10);

if (process.env.NODE_ENV !== "test" && /packages[/\\]fixture-server/.test(process.argv[1] || "")) {
  const { app } = createFixtureApp();
  app.listen(PORT, () => {
    console.log(`[ThreatLens] Fixture Lab & Mock Receiver listening on http://localhost:${PORT}`);
    console.log(`[ThreatLens] Fixture manifest: http://localhost:${PORT}/fixtures/manifest`);
  });
}
