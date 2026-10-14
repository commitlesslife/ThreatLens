import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";
import { createFixtureApp } from "@threatlens/fixture-server";
import { SYNTHETIC_FIXTURE_ADAPTER, GMAIL_WEB_ADAPTER, WHATSAPP_WEB_ADAPTER, findAdapterForUrl } from "../packages/extension/src/adapters/index.js";
import { quickScanVisibleText } from "../packages/extension/src/scanner/quick-scanner.js";

describe("Extension Manifest & Adapter Architecture", () => {
  let fixtureServer: http.Server;
  let fixtureBaseUrl: string;

  beforeAll(async () => {
    const { app } = createFixtureApp();
    await new Promise<void>(resolve => {
      fixtureServer = app.listen(0, () => {
        const addr = fixtureServer.address() as any;
        fixtureBaseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      fixtureServer.close(err => (err ? reject(err) : resolve()));
    });
  });

  it("manifest.json is valid Manifest V3 and all referenced bundle files exist", () => {
    const manifestPath = path.resolve("packages/extension/manifest.json");
    expect(fs.existsSync(manifestPath)).toBe(true);

    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.permissions).toContain("sidePanel");
    expect(manifest.permissions).toContain("storage");
    expect(manifest.side_panel?.default_path).toBe("sidepanel.html");

    // Verify all referenced files in manifest actually exist on disk
    expect(fs.existsSync(path.resolve("packages/extension", manifest.side_panel.default_path))).toBe(true);
    expect(fs.existsSync(path.resolve("packages/extension", manifest.background.service_worker))).toBe(true);
    expect(fs.existsSync(path.resolve("packages/extension/dist/content.js"))).toBe(true);
    if (manifest.content_scripts) {
      for (const cs of manifest.content_scripts) {
        for (const jsFile of cs.js) {
          expect(fs.existsSync(path.resolve("packages/extension", jsFile))).toBe(true);
        }
      }
    } else {
      expect(manifest.optional_host_permissions).toContain("http://localhost:4001/*");
    }
  });

  it("identifies matching site adapters by URL", () => {
    expect(findAdapterForUrl("http://localhost:4001/fixtures/synthetic-inbox")?.id).toBe("synthetic-fixture");
    expect(findAdapterForUrl("http://localhost:4001/fixtures/synthetic-chat")?.id).toBe("synthetic-fixture");
    expect(findAdapterForUrl("https://mail.google.com/mail/u/0/#inbox")?.id).toBe("gmail-web");
    expect(findAdapterForUrl("https://web.whatsapp.com/")?.id).toBe("whatsapp-web");
    expect(findAdapterForUrl("https://random-unsupported-domain.com/")).toBeUndefined();
  });

  it("synthetic inbox fixture produces distinguishable, explainable benign and suspicious results", async () => {
    const res = await fetch(`${fixtureBaseUrl}/fixtures/synthetic-inbox`);
    expect(res.status).toBe(200);
    const html = await res.text();

    const dom = new JSDOM(html);
    const messages = SYNTHETIC_FIXTURE_ADAPTER.extractVisibleMessages(dom.window.document);

    expect(messages.length).toBe(3);

    // Message 1: Benign library notice
    const msg1 = messages.find(m => m.id === "msg-inbox-1")!;
    expect(msg1).toBeDefined();
    expect(msg1.sender).toContain("library-notices@university.test");
    expect(msg1.quickScanResult.verdict).toBe("benign");
    expect(msg1.quickScanResult.candidateLink).toBeNull();
    expect(msg1.quickScanResult.reasons.some(r => r.includes("Standard informational content"))).toBe(true);

    // Message 2: Suspicious scholarship lure
    const msg2 = messages.find(m => m.id === "msg-inbox-2")!;
    expect(msg2).toBeDefined();
    expect(msg2.sender).toContain("disbursement-urgent@scholarship-alert.test");
    expect(msg2.quickScanResult.verdict).toBe("concerning");
    expect(msg2.quickScanResult.candidateLink).toBe("http://localhost:4001/fixtures/scholarship");
    expect(msg2.quickScanResult.indicators).toContain("urgency_or_coercion");
    expect(msg2.quickScanResult.indicators).toContain("credential_request");
    expect(msg2.quickScanResult.indicators).toContain("credential_collection_link");
    expect(msg2.quickScanResult.recommendedNextStep).toContain("Do not click link or enter credentials");
    // Excerpt must be minimal, not the whole HTML
    expect(msg2.relevantExcerpt).toContain("scholarship disbursement");
    expect(msg2.relevantExcerpt.length).toBeLessThan(msg2.visibleText.length);

    // Message 3: Benign campus fest notice with legitimate portal link
    const msg3 = messages.find(m => m.id === "msg-inbox-3")!;
    expect(msg3).toBeDefined();
    expect(msg3.quickScanResult.verdict).toBe("benign");
    expect(msg3.quickScanResult.candidateLink).toBe("http://localhost:4001/fixtures/benign-portal");
  });

  it("synthetic chat fixture produces distinguishable, explainable chat bubble results", async () => {
    const res = await fetch(`${fixtureBaseUrl}/fixtures/synthetic-chat`);
    expect(res.status).toBe(200);
    const html = await res.text();

    const dom = new JSDOM(html);
    const messages = SYNTHETIC_FIXTURE_ADAPTER.extractVisibleMessages(dom.window.document);

    expect(messages.length).toBe(3);

    // Chat 1: Benign conversational bubble
    const chat1 = messages.find(m => m.id === "msg-chat-1")!;
    expect(chat1).toBeDefined();
    expect(chat1.sender).toBe("Alex Rivera");
    expect(chat1.quickScanResult.verdict).toBe("benign");
    expect(chat1.quickScanResult.candidateLink).toBeNull();

    // Chat 2: Suspicious security alert bubble
    const chat2 = messages.find(m => m.id === "msg-chat-2")!;
    expect(chat2).toBeDefined();
    expect(chat2.sender).toBe("IT Security Support");
    expect(chat2.quickScanResult.verdict).toBe("concerning");
    expect(chat2.quickScanResult.candidateLink).toBe("http://localhost:4001/fixtures/scholarship");
    expect(chat2.quickScanResult.indicators).toContain("urgency_or_coercion");
    expect(chat2.quickScanResult.indicators).toContain("credential_request");
  });

  it("quick-scanner differentiates coercion, credential prompts, and benign texts", () => {
    const benign = quickScanVisibleText("Hi team, meeting moved to room 302.", []);
    expect(benign.result.verdict).toBe("benign");
    expect(benign.result.indicators.length).toBe(0);

    const urgentCoercion = quickScanVisibleText(
      "Action required: Re-verify your account credentials immediately or your account will be suspended within 2 hours.",
      ["http://unverified-host.test/verify"]
    );
    expect(urgentCoercion.result.verdict).toBe("concerning");
    expect(urgentCoercion.result.indicators).toContain("urgency_or_coercion");
    expect(urgentCoercion.result.indicators).toContain("credential_request");
    expect(urgentCoercion.result.candidateLink).toBe("http://unverified-host.test/verify");
  });
});
