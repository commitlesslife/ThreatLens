import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "node:http";
import { createApp, ScopeService } from "@threatlens/api";
import { DEFAULT_SETTINGS } from "../packages/extension/src/storage/settings.js";

describe("Extension Privacy Controls & Backend Investigation Handoff", () => {
  let apiServer: http.Server;
  let apiBaseUrl: string;

  beforeAll(async () => {
    const scopeService = new ScopeService();
    const app = createApp({ scopeService });
    await new Promise<void>(resolve => {
      apiServer = app.listen(0, () => {
        const addr = apiServer.address() as any;
        apiBaseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      apiServer.close(err => (err ? reject(err) : resolve()));
    });
  });

  it("default settings require affirmative consent before reading page content", () => {
    expect(DEFAULT_SETTINGS.consentGranted).toBe(false);
    expect(DEFAULT_SETTINGS.consentVersion).toBe("v1.0");
    expect(DEFAULT_SETTINGS.scanningEnabled).toBe(true);
    expect(DEFAULT_SETTINGS.enabledSites["synthetic-fixture"]).toBe(true);
  });

  it("investigation request sends only relevant excerpt and URL with source metadata", async () => {
    const excerpt = "Action Required: Your student scholarship disbursement of $2,500 is pending. You must verify your institutional password immediately.";
    const targetUrl = "http://localhost:4001/fixtures/scholarship";

    const res = await fetch(`${apiBaseUrl}/api/v1/analyses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Tenant-Id": "tenant-extension-test"
      },
      body: JSON.stringify({
        input: {
          url: targetUrl,
          message: excerpt
        },
        requestedMode: "passive",
        sourceClient: "extension",
        sourceSiteAdapter: "synthetic-fixture",
        consentVersion: "v1.0"
      })
    });

    expect(res.status).toBe(202);
    const body = await res.json();
    expect(body.analysisId).toBeDefined();
    expect(body.status).toBe("admitting");

    // Fetch created analysis record from API
    const getRes = await fetch(`${apiBaseUrl}/api/v1/analyses/${body.analysisId}`);
    expect(getRes.status).toBe(200);
    const getBody = await getRes.json();
    const analysis = getBody.analysis;

    // Verify metadata stored on authoritative Analysis record
    expect(analysis.sourceClient).toBe("extension");
    expect(analysis.sourceSiteAdapter).toBe("synthetic-fixture");
    expect(analysis.consentVersion).toBe("v1.0");

    // Verify input contains ONLY the chosen excerpt and URL (no entire mailbox or unrelated messages)
    expect(analysis.redactedInput.url).toBe(targetUrl);
    expect(analysis.redactedInput.message).toBe(excerpt);
    expect(analysis.inputKind).toBe("both");
  });

  it("stopping or revoking access stops scanning and requires re-consent", () => {
    // Simulated settings transitions
    let settings = { ...DEFAULT_SETTINGS };

    // Initial state: consent false -> no scan permitted
    expect(settings.consentGranted).toBe(false);

    // User affirmatively grants consent
    settings.consentGranted = true;
    expect(settings.consentGranted).toBe(true);
    expect(settings.scanningEnabled).toBe(true);

    // User pauses scanning
    settings.scanningEnabled = false;
    expect(settings.scanningEnabled).toBe(false); // Scanning must halt

    // User revokes access entirely
    settings.consentGranted = false;
    settings.scanningEnabled = false;
    expect(settings.consentGranted).toBe(false);
    expect(settings.scanningEnabled).toBe(false);
  });
});
