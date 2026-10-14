import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "node:http";
import { createApp, ScopeService } from "@threatlens/api";
import { AnalysisLifecycleManager, EvidenceEventSchema } from "@threatlens/contracts";

describe("Analysis Lifecycle & Real Progress Events", () => {
  it("enforces legal state transitions and strictly monotonic sequence numbers", () => {
    const analysisId = "123e4567-e89b-12d3-a456-426614174000";
    const manager = new AnalysisLifecycleManager(analysisId, "authorized_fixture_probe", "queued");

    expect(manager.currentStatus).toBe("queued");
    expect(manager.sequence).toBe(0);

    // queued -> admitting
    manager.transitionTo("admitting");
    const ev1 = manager.emitEvent({
      eventType: "analysis.started",
      sourceRef: "orchestrator",
      coverageSource: "orchestrator"
    });
    expect(ev1.sequence).toBe(1);
    expect(EvidenceEventSchema.safeParse(ev1).success).toBe(true);

    // admitting -> observing
    manager.transitionTo("observing");
    const ev2 = manager.emitEvent({
      eventType: "profile.started",
      sourceRef: "crawler_profile",
      coverageSource: "crawler"
    });
    expect(ev2.sequence).toBe(2);

    // observing -> comparing
    manager.transitionTo("comparing");
    const ev3 = manager.emitEvent({
      eventType: "profile.difference_found",
      sourceRef: "profile_comparator",
      coverageSource: "semantic_diff"
    });
    expect(ev3.sequence).toBe(3);

    // comparing -> probing (authorized_fixture_probe mode)
    manager.transitionTo("probing");
    const ev4 = manager.emitEvent({
      eventType: "probe.attempt_observed",
      sourceRef: "synthetic_probe",
      coverageSource: "network_interceptor",
      transferState: "attempted",
      canaryMatchClass: "synthetic_match"
    });
    expect(ev4.sequence).toBe(4);

    // probing -> assessing
    manager.transitionTo("assessing");
    const ev5 = manager.emitEvent({
      eventType: "assessment.updated",
      sourceRef: "evidence_fusion",
      coverageSource: "fusion_engine"
    });
    expect(ev5.sequence).toBe(5);

    // assessing -> completed
    manager.transitionTo("completed");
    const ev6 = manager.emitEvent({
      eventType: "analysis.completed",
      sourceRef: "orchestrator",
      coverageSource: "orchestrator"
    });
    expect(ev6.sequence).toBe(6);

    // Terminal state cannot transition
    expect(manager.canTransitionTo("observing")).toBe(false);
    expect(() => manager.transitionTo("observing")).toThrow();
  });

  it("prohibits transition to probing when mode is passive", () => {
    const analysisId = "123e4567-e89b-12d3-a456-426614174000";
    const manager = new AnalysisLifecycleManager(analysisId, "passive", "queued");

    manager.transitionTo("admitting");
    manager.transitionTo("observing");
    manager.transitionTo("comparing");

    // Probing must be rejected in passive mode
    expect(() => manager.transitionTo("probing")).toThrow(/strictly reserved for authorized_fixture_probe/);
  });

  describe("API Lifecycle Integration", () => {
    let server: http.Server;
    let baseUrl: string;
    let scopeService: ScopeService;

    beforeAll(async () => {
      scopeService = new ScopeService();
      const app = createApp({ scopeService });
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

    it("creates an analysis job and emits initial real progress events", async () => {
      const res = await fetch(`${baseUrl}/api/v1/analyses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: { url: "https://fixture.threatlens.test/scholarship" },
          requestedMode: "passive"
        })
      });

      expect(res.status).toBe(202);
      const body = await res.json();
      expect(body.analysisId).toBeDefined();
      expect(body.status).toBe("admitting");
      expect(body.eventsUrl).toBe(`/api/v1/analyses/${body.analysisId}/events`);

      // Verify analysis can be retrieved
      const getRes = await fetch(`${baseUrl}/api/v1/analyses/${body.analysisId}`);
      expect(getRes.status).toBe(200);
      const getBody = await getRes.json();
      expect(getBody.analysis.id).toBe(body.analysisId);
      expect(getBody.analysis.status).toBe("admitting");

      // Verify real events were emitted
      const eventsRes = await fetch(`${baseUrl}/api/v1/analyses/${body.analysisId}/events`);
      expect(eventsRes.status).toBe(200);
      const eventsBody = await eventsRes.json();
      expect(eventsBody.total).toBe(2);
      expect(eventsBody.events[0].sequence).toBe(1);
      expect(eventsBody.events[0].eventType).toBe("analysis.started");
      expect(eventsBody.events[1].sequence).toBe(2);
      expect(eventsBody.events[1].eventType).toBe("target.admitted");
    });

    it("rejects authorized_fixture_probe without scope via API", async () => {
      const res = await fetch(`${baseUrl}/api/v1/analyses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: { url: "https://fixture.threatlens.test/scholarship" },
          requestedMode: "authorized_fixture_probe" // No scopeId!
        })
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error.code).toBe("scope_required");
    });

    it("accepts authorized_fixture_probe when valid scope is provided", async () => {
      const scope = scopeService.createFixtureScope({
        allowedHosts: ["fixture.threatlens.test"]
      });

      const res = await fetch(`${baseUrl}/api/v1/analyses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: { url: "https://fixture.threatlens.test/scholarship" },
          requestedMode: "authorized_fixture_probe",
          scopeId: scope.id
        })
      });

      expect(res.status).toBe(202);
      const body = await res.json();
      expect(body.analysisId).toBeDefined();
    });

    it("cancels an analysis and records cancellation event", async () => {
      const createRes = await fetch(`${baseUrl}/api/v1/analyses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: { message: "Suspicious text message needing verification" },
          requestedMode: "passive"
        })
      });
      const { analysisId } = await createRes.json();

      // Cancel
      const cancelRes = await fetch(`${baseUrl}/api/v1/analyses/${analysisId}/cancel`, {
        method: "POST"
      });
      expect(cancelRes.status).toBe(200);
      const cancelBody = await cancelRes.json();
      expect(cancelBody.cancelled).toBe(true);
      expect(cancelBody.status).toBe("cancelled");

      // Check events contain cancellation
      const eventsRes = await fetch(`${baseUrl}/api/v1/analyses/${analysisId}/events`);
      const eventsBody = await eventsRes.json();
      expect(eventsBody.events.some((e: any) => e.eventType === "analysis.cancelled")).toBe(true);
    });
  });
});
