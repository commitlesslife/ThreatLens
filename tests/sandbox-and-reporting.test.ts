import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "node:http";
import { createApp, ScopeService, AnalysisService, CaseService } from "@threatlens/api";
import { createFixtureApp, MockReceiverStore } from "@threatlens/fixture-server";
import { app as webApp } from "../packages/web/src/server.js";

describe("Sandbox, Profiles, Brand Analysis, Probes & Casebook", () => {
  let fixtureServer: http.Server;
  let fixtureBaseUrl: string;
  let mockStore: MockReceiverStore;

  let apiServer: http.Server;
  let apiBaseUrl: string;
  let scopeService: ScopeService;
  let analysisService: AnalysisService;
  let caseService: CaseService;

  let webServer: http.Server;
  let webBaseUrl: string;

  beforeAll(async () => {
    delete process.env.GEMINI_API_KEY;
    // 1. Fixture Server with Mock Receiver
    mockStore = new MockReceiverStore();
    const { app: fApp } = createFixtureApp({ mockStore });
    await new Promise<void>(resolve => {
      fixtureServer = fApp.listen(0, () => {
        const addr = fixtureServer.address() as any;
        fixtureBaseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });

    // 2. API Server
    scopeService = new ScopeService();
    analysisService = new AnalysisService({
      scopeService,
      executionDelayMs: 20,
      fixtureBaseUrl
    });
    caseService = new CaseService();

    const apiApp = createApp({ scopeService, analysisService, caseService });
    await new Promise<void>(resolve => {
      apiServer = apiApp.listen(0, () => {
        const addr = apiServer.address() as any;
        apiBaseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });

    // 3. Web App Server
    await new Promise<void>(resolve => {
      webServer = webApp.listen(0, () => {
        const addr = webServer.address() as any;
        webBaseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await Promise.all([
      new Promise<void>(res => fixtureServer.close(() => res())),
      new Promise<void>(res => apiServer.close(() => res())),
      new Promise<void>(res => webServer.close(() => res()))
    ]);
  });

  it("multi-profile sandbox detects cloaking on /fixtures/cloaked without public URL fetch", async () => {
    const res = await fetch(`${apiBaseUrl}/api/v1/analyses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: {
          url: `${fixtureBaseUrl}/fixtures/cloaked`,
          message: "Action required: verify account on mobile immediately"
        },
        requestedMode: "passive"
      })
    });

    expect(res.status).toBe(202);
    const { analysisId } = await res.json();

    // Await pipeline execution
    const assessment = await analysisService.runPipelineNow(analysisId);
    expect(assessment).toBeDefined();
    expect(assessment!.verdict).toBe("action_concern_supported");
    expect(assessment!.severity.band).toBe("high");
    expect(assessment!.coverage.crawler).toBe("complete");
    expect(assessment!.coverage.desktop).toBe("complete");
    expect(assessment!.coverage.mobileEmulated).toBe("complete");

    // Cloaking delta detected
    const events = analysisService.getEvents(analysisId);
    const diffEvent = events.find(e => e.eventType === "profile.difference_found");
    expect(diffEvent).toBeDefined();

    const reasons = assessment!.reasons.map(r => r.text);
    expect(reasons.some(r => r.includes("Differential content") || r.includes("cloaking"))).toBe(true);
  });

  it("multi-profile sandbox identifies credential form and urgency cues on /fixtures/scholarship", async () => {
    const res = await fetch(`${apiBaseUrl}/api/v1/analyses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: {
          url: `${fixtureBaseUrl}/fixtures/scholarship`,
          message: "URGENT: Your student scholarship disbursement of $2,500 is pending. Verify your institutional password within 2 hours."
        },
        requestedMode: "passive"
      })
    });

    const { analysisId } = await res.json();
    const assessment = await analysisService.runPipelineNow(analysisId);

    expect(assessment!.verdict).toBe("action_concern_supported");
    expect(assessment!.severity.index).toBeGreaterThanOrEqual(70);
    expect(assessment!.reasons.some(r => r.text.includes("credential"))).toBe(true);
    expect(assessment!.reasons.some(r => r.text.includes("urgency"))).toBe(true);
  });

  it("evaluates brand canonical domains and provides graceful vision fallback on missing key", async () => {
    const res = await fetch(`${apiBaseUrl}/api/v1/analyses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: {
          url: `${fixtureBaseUrl}/fixtures/brand-clone`,
          message: "Apex Financial: verify login"
        },
        requestedMode: "passive"
      })
    });

    const { analysisId } = await res.json();
    const assessment = await analysisService.runPipelineNow(analysisId);

    expect(assessment!.verdict).toBe("action_concern_supported");
    expect(assessment!.reasons.some(r => (r.text.includes("State Federal Bank") || r.text.includes("Apex Financial")) && r.text.includes("non-canonical"))).toBe(true);

    // Missing Gemini key produces explicit limitation and partial coverage
    expect(assessment!.limitations.some(l => l.includes("No Gemini runtime key") || l.includes("vision"))).toBe(true);
  });

  it("corroborates standard flow on benign institutional portal /fixtures/benign-portal", async () => {
    const res = await fetch(`${apiBaseUrl}/api/v1/analyses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: {
          url: `${fixtureBaseUrl}/fixtures/benign-portal`,
          message: "University Library: your book is ready for pickup"
        },
        requestedMode: "passive"
      })
    });

    const { analysisId } = await res.json();
    const assessment = await analysisService.runPipelineNow(analysisId);

    expect(assessment!.verdict).toBe("expected_flow_supported");
    expect(assessment!.severity.band).toBe("low");
    expect(assessment!.reasons.some(r => r.text.includes("standard institutional"))).toBe(true);
  });

  it("fails closed without fetching public destinations outside controlled fixtures", async () => {
    const res = await fetch(`${apiBaseUrl}/api/v1/analyses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: {
          url: "https://arbitrary-untrusted-public-domain.com/login"
        },
        requestedMode: "passive"
      })
    });

    const { analysisId } = await res.json();
    const assessment = await analysisService.runPipelineNow(analysisId);

    expect(assessment!.coverage.sandbox).toBe("blocked_attempt_observed");
    expect(assessment!.verdict).toBe("investigation_incomplete");
    expect(assessment!.limitations.some(l => l.includes("ThreatLens did not open this public destination"))).toBe(true);

    const events = analysisService.getEvents(analysisId);
    expect(events.some(e => e.eventType === "target.denied")).toBe(true);
  });

  it("executes authorized synthetic canary probe strictly under unexpired scope and records mock receiver receipt", async () => {
    const targetHost = new URL(fixtureBaseUrl).host;
    const scope = scopeService.createFixtureScope({
      allowedHosts: [targetHost, "127.0.0.1", "localhost"],
      allowedActions: ["form_submit", "fetch"],
      durationMinutes: 30
    });

    // Register scope with mockStore so receiver validates it
    mockStore.registerScope(scope);

    const res = await fetch(`${apiBaseUrl}/api/v1/analyses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: {
          url: `${fixtureBaseUrl}/fixtures/scholarship`
        },
        requestedMode: "authorized_fixture_probe",
        scopeId: scope.id
      })
    });

    expect(res.status).toBe(202);
    const { analysisId } = await res.json();

    const assessment = await analysisService.runPipelineNow(analysisId);
    expect(assessment!.coverage.syntheticProbe).toBe("complete");

    // Events verify separate attempt and confirmed delivery with synthetic canaries
    const events = analysisService.getEvents(analysisId);
    const attemptEvent = events.find(e => e.eventType === "probe.attempt_observed");
    const confirmEvent = events.find(e => e.eventType === "probe.receiver_confirmed");

    expect(attemptEvent).toBeDefined();
    expect(attemptEvent!.transferState).toBe("attempted");
    expect(attemptEvent!.canaryMatchClass).toBe("synthetic_match");

    expect(confirmEvent).toBeDefined();
    expect(confirmEvent!.transferState).toBe("receiver_confirmed");
    expect(confirmEvent!.canaryMatchClass).toBe("synthetic_match");

    // Receiver receipts queryable
    const receipts = mockStore.getReceipts(analysisId);
    expect(receipts.length).toBe(1);
    expect(receipts[0].canaryMatchClass).toBe("synthetic_match");
    expect(receipts[0].scopeId).toBe(scope.id);
  });

  it("provides full assessment access on GET /api/v1/analyses/:id and /report endpoint", async () => {
    const createRes = await fetch(`${apiBaseUrl}/api/v1/analyses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: {
          url: `${fixtureBaseUrl}/fixtures/scholarship`,
          message: "Claim scholarship grant immediately"
        },
        requestedMode: "passive"
      })
    });

    const { analysisId } = await createRes.json();
    await analysisService.runPipelineNow(analysisId);

    // GET /api/v1/analyses/:id
    const getRes = await fetch(`${apiBaseUrl}/api/v1/analyses/${analysisId}`);
    expect(getRes.status).toBe(200);
    const getBody = await getRes.json();
    expect(getBody.analysis.id).toBe(analysisId);
    expect(getBody.assessment).toBeDefined();
    expect(getBody.assessment.verdict).toBe("action_concern_supported");

    // GET /api/v1/analyses/:id/report
    const reportRes = await fetch(`${apiBaseUrl}/api/v1/analyses/${analysisId}/report`);
    expect(reportRes.status).toBe(200);
    const reportBody = await reportRes.json();
    expect(reportBody.analysis.id).toBe(analysisId);
    expect(reportBody.assessment).toBeDefined();
    expect(Array.isArray(reportBody.events)).toBe(true);
    expect(reportBody.events.length).toBeGreaterThan(0);
  });

  it("casebook API supports creating, listing, updating and deleting cases", async () => {
    // 1. Create Case
    const postRes = await fetch(`${apiBaseUrl}/api/v1/cases`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceAnalysisIds: ["123e4567-e89b-12d3-a456-426614174000"],
        disposition: "concern_supported",
        redactedSummary: "Test phishing lure case with scholarship pretext",
        retentionPreference: "standard_30_days"
      })
    });

    expect(postRes.status).toBe(201);
    const postBody = await postRes.json();
    const caseId = postBody.case.id;
    expect(postBody.case.disposition).toBe("concern_supported");
    expect(postBody.case.retentionPreference).toBe("standard_30_days");

    // 2. List Cases
    const listRes = await fetch(`${apiBaseUrl}/api/v1/cases`);
    const listBody = await listRes.json();
    expect(listBody.total).toBeGreaterThanOrEqual(1);

    // 3. Get Case
    const getRes = await fetch(`${apiBaseUrl}/api/v1/cases/${caseId}`);
    expect(getRes.status).toBe(200);
    const getBody = await getRes.json();
    expect(getBody.case.id).toBe(caseId);

    // 4. Update / Correct Case
    const patchRes = await fetch(`${apiBaseUrl}/api/v1/cases/${caseId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        disposition: "expected_flow_supported",
        reason: "Investigator confirmed legitimate campus testing program"
      })
    });
    expect(patchRes.status).toBe(200);
    const patchBody = await patchRes.json();
    expect(patchBody.case.disposition).toBe("expected_flow_supported");
    expect(patchBody.case.correctionHistory.length).toBe(1);
    expect(patchBody.case.correctionHistory[0].priorDisposition).toBe("concern_supported");

    // 5. Delete Case
    const delRes = await fetch(`${apiBaseUrl}/api/v1/cases/${caseId}`, { method: "DELETE" });
    expect(delRes.status).toBe(200);

    const getAfterDel = await fetch(`${apiBaseUrl}/api/v1/cases/${caseId}`);
    expect(getAfterDel.status).toBe(404);
  });

  it("serves the web application and static assets on port 3000", async () => {
    // GET / (index.html)
    const indexRes = await fetch(`${webBaseUrl}/`);
    expect(indexRes.status).toBe(200);
    const html = await indexRes.text();
    expect(html).toContain("ThreatLens");
    expect(html).toContain("New Investigation");
    expect(html).toContain("Casebook");

    // GET /dist/app.js
    const jsRes = await fetch(`${webBaseUrl}/dist/app.js`);
    expect(jsRes.status).toBe(200);
    expect(jsRes.headers.get("content-type")).toContain("javascript");

    // GET /src/app.css
    const cssRes = await fetch(`${webBaseUrl}/src/app.css`);
    expect(cssRes.status).toBe(200);
    expect(cssRes.headers.get("content-type")).toContain("css");
  });
});
