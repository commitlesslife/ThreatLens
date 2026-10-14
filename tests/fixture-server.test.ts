import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "node:http";
import { createFixtureApp, MockReceiverStore } from "@threatlens/fixture-server";
import { AuthorizationScope } from "@threatlens/contracts";

describe("Fixture Server & Team-Owned Mock Receiver", () => {
  let server: http.Server;
  let baseUrl: string;
  let store: MockReceiverStore;

  const validScope: AuthorizationScope = {
    id: "987e6543-e89b-12d3-a456-426614174999",
    tenantId: "tenant-fixture-local",
    purpose: "fixture_probe_verification",
    allowedHosts: ["localhost", "127.0.0.1", "fixture.threatlens.test", "receiver.threatlens.test"],
    allowedActions: ["form_submit", "fetch"],
    allowedReceivers: ["http://localhost:4002/receiver/canary", "http://receiver.threatlens.test/receiver/canary"],
    fixtureTenant: "tenant-fixture-local",
    ownerReference: "fixture-admin-lab",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 600000).toISOString(),
    revokedAt: null
  };

  beforeAll(async () => {
    store = new MockReceiverStore();
    store.registerScope(validScope);

    const { app } = createFixtureApp({ mockStore: store });
    await new Promise<void>(resolve => {
      server = app.listen(0, () => {
        const address = server.address() as any;
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close(err => (err ? reject(err) : resolve()));
    });
  });

  it("can be reached and serves health and manifest endpoints", async () => {
    const healthRes = await fetch(`${baseUrl}/health/live`);
    expect(healthRes.status).toBe(200);
    const healthJson = await healthRes.json();
    expect(healthJson.status).toBe("live");

    const manifestRes = await fetch(`${baseUrl}/fixtures/manifest`);
    expect(manifestRes.status).toBe(200);
    const manifestJson = await manifestRes.json();
    expect(manifestJson.fixtures.length).toBeGreaterThanOrEqual(4);
    expect(manifestJson.fixtures.some((f: any) => f.id === "scholarship-phish")).toBe(true);
  });

  it("serves the scholarship phish fixture with credential form", async () => {
    const res = await fetch(`${baseUrl}/fixtures/scholarship`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("State University Scholarship Portal");
    expect(html).toContain("action=\"/receiver/canary\"");
  });

  it("cloaked fixture serves 403 to crawlers and credential form to mobile", async () => {
    // 1. Crawler User-Agent
    const crawlerRes = await fetch(`${baseUrl}/fixtures/cloaked`, {
      headers: { "User-Agent": "ThreatLensCrawler/1.0" }
    });
    expect(crawlerRes.status).toBe(403);
    const crawlerHtml = await crawlerRes.text();
    expect(crawlerHtml).toContain("Automated scanning and crawler tools are prohibited");

    // 2. Mobile User-Agent
    const mobileRes = await fetch(`${baseUrl}/fixtures/cloaked`, {
      headers: { "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) Mobile" }
    });
    expect(mobileRes.status).toBe(200);
    const mobileHtml = await mobileRes.text();
    expect(mobileHtml).toContain("Urgent Student Alert - Mobile Verification");
    expect(mobileHtml).toContain("name=\"otp\"");

    // 3. Desktop User-Agent (benign maintenance)
    const desktopRes = await fetch(`${baseUrl}/fixtures/cloaked`, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0" }
    });
    expect(desktopRes.status).toBe(200);
    const desktopHtml = await desktopRes.text();
    expect(desktopHtml).toContain("Portal Under Maintenance");
  });

  it("mock receiver records permitted synthetic canary submission", async () => {
    const fixtureRunId = "run-fixture-001";
    const syntheticCanary = "TL-CANARY-ALPHA-98214";

    const res = await fetch(`${baseUrl}/receiver/canary`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-ThreatLens-Scope-Id": validScope.id,
        "Host": "localhost"
      },
      body: JSON.stringify({
        fixtureRunId,
        username: "synthetic-student@test.local",
        password: syntheticCanary
      })
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.fixtureRunId).toBe(fixtureRunId);
    expect(body.canaryMatchClass).toBe("synthetic_match");
    expect(body.canaryFingerprint).toBeDefined();

    // Verify receipt in store
    const receipts = store.getReceipts(fixtureRunId);
    expect(receipts.length).toBe(1);
    expect(receipts[0].canaryMatchClass).toBe("synthetic_match");
    expect(receipts[0].canaryFingerprint).toBe(body.canaryFingerprint);
  });

  it("mock receiver rejects non-synthetic traffic", async () => {
    const res = await fetch(`${baseUrl}/receiver/canary`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-ThreatLens-Scope-Id": validScope.id,
        "Host": "localhost"
      },
      body: JSON.stringify({
        username: "victim@example.com",
        password: "RealPassword123!" // Not a synthetic canary!
      })
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("non_synthetic_traffic_rejected");
  });

  it("mock receiver rejects traffic with missing scope", async () => {
    const res = await fetch(`${baseUrl}/receiver/canary`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Host": "localhost"
      },
      body: JSON.stringify({
        password: "TL-CANARY-TEST-000"
      })
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("scope_required");
  });

  it("mock receiver rejects traffic with out-of-scope host", async () => {
    const res = await fetch(`${baseUrl}/receiver/canary`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-ThreatLens-Scope-Id": validScope.id,
        "X-ThreatLens-Target-Host": "evil-external-phish.com" // Out-of-scope host!
      },
      body: JSON.stringify({
        password: "TL-CANARY-TEST-000"
      })
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("target_denied");
  });

  it("protected fixture run has zero receiver receipts", () => {
    const protectedRunId = "run-protected-002";
    // A protected test blocks egress before reaching the receiver
    expect(store.count(protectedRunId)).toBe(0);
  });
});
