import express, { Express, Request, Response } from "express";
import cors from "cors";
import { FIXTURE_MANIFEST } from "./manifest.js";
import { createFixturePagesRouter } from "./fixtures/pages.js";
import { createMockReceiverRouter, MockReceiverStore } from "./receiver/mock-receiver.js";

export interface FixtureServerOptions {
  allowedHosts?: string[];
  mockStore?: MockReceiverStore;
}

export function createFixtureApp(options: FixtureServerOptions = {}): {
  app: Express;
  receiverStore: MockReceiverStore;
} {
  const app = express();
  const receiverStore = options.mockStore || new MockReceiverStore();

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Operational health checks
  app.get("/health/live", (_req: Request, res: Response) => {
    res.json({ status: "live", service: "threatlens-fixture-server" });
  });

  app.get("/health/ready", (_req: Request, res: Response) => {
    res.json({ status: "ready", fixturesCount: FIXTURE_MANIFEST.length });
  });

  // Manifest endpoint
  app.get(["/fixtures/manifest", "/api/fixtures/manifest"], (_req: Request, res: Response) => {
    res.json({
      timestamp: new Date().toISOString(),
      fixtures: FIXTURE_MANIFEST
    });
  });

  // Mount fixture pages
  app.use("/fixtures", createFixturePagesRouter());

  // Mount mock receiver
  const receiverRouter = createMockReceiverRouter({
    store: receiverStore,
    allowedHosts: options.allowedHosts
  });
  app.use("/receiver", receiverRouter);
  app.use("/api/receiver", receiverRouter);

  return { app, receiverStore };
}
