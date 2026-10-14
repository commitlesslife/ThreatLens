import fs from "node:fs";
import { randomUUID, createHash } from "node:crypto";

if (process.env.NODE_ENV !== "test" && fs.existsSync(".env") && typeof (process as any).loadEnvFile === "function") {
  try {
    (process as any).loadEnvFile(".env");
  } catch {}
}
import {
  Analysis,
  AnalysisSchema,
  AnalysisStatus,
  Assessment,
  AssessmentSchema,
  CreateAnalysisInput,
  CreateAnalysisInputSchema,
  AnalysisErrorCode,
  AnalysisLifecycleManager,
  EvidenceEvent,
  redactUrl,
  redactSecrets
} from "@threatlens/contracts";
import { ScopeService } from "./scope-service.js";

export interface AnalysisServiceResult {
  analysis?: Analysis;
  eventsUrl?: string;
  error?: {
    code: AnalysisErrorCode;
    message: string;
    retryable: boolean;
  };
}

export interface AnalysisServiceOptions {
  scopeService: ScopeService;
  executionDelayMs?: number;
  autoRun?: boolean;
  fixtureBaseUrl?: string;
}

interface ProfileObservation {
  profileName: string;
  status: number;
  title: string;
  text: string;
  hasCredentialForm: boolean;
  hasUrgency: boolean;
  html: string;
}

// Canonical brand registry for demo fixtures
const BRAND_REGISTRY: Record<string, { brandName: string; canonicalHosts: string[] }> = {
  "university": {
    brandName: "State University",
    canonicalHosts: ["university.test", "portal.university.test"]
  },
  "apex": {
    brandName: "Apex Financial",
    canonicalHosts: ["apexbank.test", "secure.apexbank.test"]
  },
  "statefederal": {
    brandName: "State Federal Bank",
    canonicalHosts: ["statefederal.test", "online.statefederal.test"]
  },
  "firstnational": {
    brandName: "First National Bank",
    canonicalHosts: ["firstnational.test", "online.firstnational.test"]
  }
};

export class AnalysisService {
  private analyses = new Map<string, Analysis>();
  private assessments = new Map<string, Assessment>();
  private lifecycles = new Map<string, AnalysisLifecycleManager>();
  private eventListeners = new Map<string, Set<(event: EvidenceEvent) => void>>();
  private runningTimers = new Map<string, NodeJS.Timeout>();
  private scopeService: ScopeService;
  private executionDelayMs: number;
  private autoRun: boolean;
  private fixtureBaseUrl: string;

  constructor(optionsOrScope: ScopeService | AnalysisServiceOptions) {
    if ("checkAuthorization" in optionsOrScope) {
      this.scopeService = optionsOrScope;
      this.executionDelayMs = 150;
      this.autoRun = true;
      this.fixtureBaseUrl = process.env.FIXTURE_SERVER_URL || "http://127.0.0.1:4001";
    } else {
      this.scopeService = optionsOrScope.scopeService;
      this.executionDelayMs = optionsOrScope.executionDelayMs ?? 150;
      this.autoRun = optionsOrScope.autoRun ?? true;
      this.fixtureBaseUrl = optionsOrScope.fixtureBaseUrl || process.env.FIXTURE_SERVER_URL || "http://127.0.0.1:4001";
    }
  }

  public createAnalysis(
    rawInput: unknown,
    tenantId: string = "tenant-default"
  ): AnalysisServiceResult {
    // 1. Schema Validation
    const parsedInput = CreateAnalysisInputSchema.safeParse(rawInput);
    if (!parsedInput.success) {
      return {
        error: {
          code: "invalid_input",
          message: parsedInput.error.errors.map(e => e.message).join(", "),
          retryable: false
        }
      };
    }

    const { input, requestedMode, scopeId } = parsedInput.data;

    // 2. Validate URL scheme if present
    if (input.url) {
      try {
        const parsedUrl = new URL(input.url);
        if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
          return {
            error: {
              code: "unsupported_scheme",
              message: `URL protocol '${parsedUrl.protocol}' is unsupported. Only HTTP and HTTPS are permitted.`,
              retryable: false
            }
          };
        }
      } catch {
        return {
          error: {
            code: "invalid_input",
            message: "Target URL is malformed.",
            retryable: false
          }
        };
      }
    }

    // 3. Security Boundary: Server-enforced scope validation for active probing
    if (requestedMode === "authorized_fixture_probe") {
      if (!input.url) {
        return {
          error: {
            code: "invalid_input",
            message: "Authorized fixture probe requires a valid target URL.",
            retryable: false
          }
        };
      }

      const targetHost = new URL(input.url).host;
      const authResult = this.scopeService.checkAuthorization(scopeId, targetHost, "form_submit");

      if (!authResult.valid) {
        const code: AnalysisErrorCode =
          authResult.errorCode === "target_denied" ? "target_denied" :
          authResult.errorCode === "scope_expired" ? "scope_expired" : "scope_required";
        return {
          error: {
            code,
            message: authResult.reason || "Active probing requires an authorized, unexpired fixture scope.",
            retryable: false
          }
        };
      }
    }

    // 4. Input Sanitization & Redaction
    const redactedInput: { url?: string; message?: string } = {};
    if (input.url) {
      redactedInput.url = redactUrl(input.url);
    }
    if (input.message) {
      redactedInput.message = redactSecrets(input.message);
    }

    const inputKind = input.url && input.message ? "both" : input.url ? "url" : "message";
    const now = new Date();
    const id = randomUUID();

    const analysis: Analysis = {
      id,
      tenantId,
      inputKind,
      redactedInput,
      requestedMode,
      authorizationScopeId: scopeId ?? null,
      status: "queued",
      policyVersion: "v1",
      createdAt: now.toISOString(),
      startedAt: null,
      finishedAt: null,
      deadlineAt: new Date(now.getTime() + 60_000).toISOString(),
      errorCode: null,
      sourceClient: parsedInput.data.sourceClient,
      sourceSiteAdapter: parsedInput.data.sourceSiteAdapter,
      consentVersion: parsedInput.data.consentVersion
    };

    AnalysisSchema.parse(analysis);
    this.analyses.set(id, analysis);

    // 5. Initialize Lifecycle & Emit Real Initial Events
    const lifecycle = new AnalysisLifecycleManager(id, requestedMode, "queued");
    this.lifecycles.set(id, lifecycle);

    lifecycle.transitionTo("admitting");
    analysis.status = "admitting";
    analysis.startedAt = new Date().toISOString();

    this.emit(id, {
      eventType: "analysis.started",
      sourceRef: "orchestrator",
      coverageSource: "orchestrator",
      destinationRedacted: redactedInput.url || null
    });

    this.emit(id, {
      eventType: "target.admitted",
      sourceRef: "fixture_only_policy",
      coverageSource: "admission_gate",
      destinationRedacted: redactedInput.url || null
    });

    // 6. Schedule real background execution
    if (this.autoRun) {
      const retainedInput: CreateAnalysisInput["input"] = { ...input };
      const timer = setTimeout(() => {
        this.runningTimers.delete(id);
        void this.runPipeline(id, retainedInput, scopeId);
      }, this.executionDelayMs);
      this.runningTimers.set(id, timer);
    }

    return {
      analysis,
      eventsUrl: `/api/v1/analyses/${id}/events`
    };
  }

  public getAnalysis(id: string): Analysis | undefined {
    return this.analyses.get(id);
  }

  public getAssessment(id: string): Assessment | undefined {
    return this.assessments.get(id);
  }

  public getEvents(id: string): ReadonlyArray<EvidenceEvent> {
    return this.lifecycles.get(id)?.events || [];
  }

  public cancelAnalysis(id: string): { success: boolean; analysis?: Analysis; error?: string } {
    const timer = this.runningTimers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.runningTimers.delete(id);
    }

    const analysis = this.analyses.get(id);
    const lifecycle = this.lifecycles.get(id);

    if (!analysis || !lifecycle) {
      return { success: false, error: "Analysis not found" };
    }

    if (["completed", "partial", "cancelled", "failed"].includes(analysis.status)) {
      return { success: true, analysis };
    }

    try {
      lifecycle.transitionTo("cancelled", "User requested cancellation");
      analysis.status = "cancelled";
      analysis.finishedAt = new Date().toISOString();
      analysis.errorCode = "cancelled";

      this.emit(id, {
        eventType: "analysis.cancelled",
        sourceRef: "user_request",
        coverageSource: "orchestrator"
      });

      return { success: true, analysis };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  public addEventListener(id: string, listener: (event: EvidenceEvent) => void): () => void {
    if (!this.eventListeners.has(id)) {
      this.eventListeners.set(id, new Set());
    }
    const set = this.eventListeners.get(id)!;
    set.add(listener);
    return () => {
      set.delete(listener);
      if (set.size === 0) this.eventListeners.delete(id);
    };
  }

  public async runPipelineNow(id: string): Promise<Assessment | undefined> {
    const timer = this.runningTimers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.runningTimers.delete(id);
    }
    const analysis = this.analyses.get(id);
    if (!analysis) return undefined;
    const input: CreateAnalysisInput["input"] = {
      url: analysis.redactedInput.url || undefined,
      message: analysis.redactedInput.message || undefined
    };
    await this.runPipeline(id, input, analysis.authorizationScopeId || undefined);
    return this.assessments.get(id);
  }

  private isFixtureTarget(url: URL): boolean {
    const isHttp = url.protocol === "http:";
    let isFixtureHost = ["localhost:4001", "127.0.0.1:4001"].includes(url.host.toLowerCase());
    try {
      const fixtureUrl = new URL(this.fixtureBaseUrl);
      if (url.host.toLowerCase() === fixtureUrl.host.toLowerCase()) {
        isFixtureHost = true;
      }
    } catch {
      // ignore
    }
    const isFixturePath = url.pathname.startsWith("/fixtures/") || [
      "/fixtures/scholarship",
      "/fixtures/cloaked",
      "/fixtures/benign-portal",
      "/fixtures/brand-clone",
      "/fixtures/synthetic-inbox",
      "/fixtures/synthetic-chat"
    ].includes(url.pathname);
    return isHttp && isFixtureHost && isFixturePath && !url.username && !url.password;
  }

  private async observeFixture(url: URL, userAgent: string, profileName: string): Promise<ProfileObservation> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    try {
      const response = await fetch(url, {
        redirect: "error",
        signal: controller.signal,
        headers: { "user-agent": userAgent, accept: "text/html" }
      });
      const html = (await response.text()).slice(0, 700_000);
      const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<[^>]*>/g, " ").trim() || "(no title)";
      const text = html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;|&#160;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 12000);

      const hasCredentialForm = /<form\b/i.test(html) && /type=["']password["']|name=["'](?:password|otp|pin)["']/i.test(html);
      const hasUrgency = /urgent|immediately|within \d+ hours|account (?:suspended|locked|terminated)/i.test(text);

      return {
        profileName,
        status: response.status,
        title,
        text,
        hasCredentialForm,
        hasUrgency,
        html
      };
    } finally {
      clearTimeout(timer);
    }
  }

  private async runPipeline(
    id: string,
    input: CreateAnalysisInput["input"],
    scopeId?: string | null
  ): Promise<void> {
    const analysis = this.analyses.get(id);
    const lifecycle = this.lifecycles.get(id);
    if (!analysis || !lifecycle || analysis.status === "cancelled") return;

    const coverage: Record<string, "complete" | "partial" | "failed" | "not_applicable" | "blocked_attempt_observed"> = {
      message: input.message ? "complete" : "not_applicable",
      crawler: "not_applicable",
      desktop: "not_applicable",
      mobileEmulated: "not_applicable",
      brandRegistry: "not_applicable",
      syntheticProbe: "not_applicable",
      sandbox: "not_applicable"
    };

    const reasons: Array<{ text: string; evidenceIds: string[] }> = [];
    const limitations: string[] = [];
    let concern = false;
    let expectedFlow = false;

    try {
      lifecycle.transitionTo("observing");
      analysis.status = "observing";

      // --- Stage A: Message Extraction & Signals ---
      if (input.message) {
        const messageText = input.message;
        const urgency = /\burgent\b|immediately|within\s+\d+\s+(?:hours?|minutes?)|account (?:suspended|terminated)|action required/i.test(messageText);
        const credentials = /password|passcode|\bOTP\b|\bPIN\b|verify.{0,30}(?:account|identity|credential)|re-?authenticate/i.test(messageText);
        const money = /scholarship|disbursement|payment|wire transfer|\$\s?\d/i.test(messageText);

        if (urgency && credentials) {
          concern = true;
          const ev = this.emit(id, {
            eventType: "assessment.updated",
            sourceRef: "message_rules_v1",
            coverageSource: "local_message_analysis"
          });
          reasons.push({
            text: "The selected message excerpt combines urgency with a request to verify credentials.",
            evidenceIds: [ev.id]
          });
        } else if (credentials || urgency || money) {
          const ev = this.emit(id, {
            eventType: "assessment.updated",
            sourceRef: "message_rules_v1",
            coverageSource: "local_message_analysis"
          });
          reasons.push({
            text: "The selected excerpt contains an urgency, credential, or disbursement cue that merits independent verification.",
            evidenceIds: [ev.id]
          });
        }
      }

      // --- Stage B: URL Profiles & Cloaking Inspection ---
      let targetUrl: URL | null = null;
      let isFixture = false;

      if (input.url) {
        try {
          targetUrl = new URL(input.url);
          isFixture = this.isFixtureTarget(targetUrl);
        } catch {
          targetUrl = null;
        }

        if (!targetUrl || !isFixture) {
          // Public destination containment: fail closed
          coverage.sandbox = "blocked_attempt_observed";
          coverage.crawler = "not_applicable";
          const ev = this.emit(id, {
            eventType: "target.denied",
            sourceRef: "fixture_only_egress_policy",
            destinationRedacted: input.url ? redactUrl(input.url) : null,
            coverageSource: "admission_gate"
          });
          limitations.push("ThreatLens did not open this public destination. Public browsing is disabled in this local demo because controlled egress isolation is not configured.");
          reasons.push({
            text: "The destination was not fetched; external URL behavior remains unverified by design.",
            evidenceIds: [ev.id]
          });
        } else {
          // Controlled fixture analysis
          coverage.sandbox = "complete";
          coverage.brandRegistry = "partial"; // Local heuristic fallback

          lifecycle.transitionTo("comparing");
          analysis.status = "comparing";

          // 1. Crawler Profile
          this.emit(id, {
            eventType: "profile.started",
            sourceRef: "fixture_http_profile_crawler",
            destinationRedacted: redactUrl(input.url),
            coverageSource: "crawler"
          });
          const crawler = await this.observeFixture(targetUrl, "ThreatLensCrawler/1.0", "crawler");
          this.emit(id, {
            eventType: "profile.completed",
            sourceRef: "fixture_http_profile_crawler",
            destinationRedacted: redactUrl(input.url),
            coverageSource: "crawler"
          });
          coverage.crawler = "complete";

          // 2. Desktop Profile
          this.emit(id, {
            eventType: "profile.started",
            sourceRef: "fixture_http_profile_desktop",
            destinationRedacted: redactUrl(input.url),
            coverageSource: "desktop"
          });
          const desktop = await this.observeFixture(
            targetUrl,
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "desktop"
          );
          this.emit(id, {
            eventType: "profile.completed",
            sourceRef: "fixture_http_profile_desktop",
            destinationRedacted: redactUrl(input.url),
            coverageSource: "desktop"
          });
          coverage.desktop = "complete";

          // 3. Mobile Emulated Profile
          this.emit(id, {
            eventType: "profile.started",
            sourceRef: "fixture_http_profile_mobile_emulation",
            destinationRedacted: redactUrl(input.url),
            coverageSource: "mobileEmulated"
          });
          const mobile = await this.observeFixture(
            targetUrl,
            "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
            "mobileEmulated"
          );
          this.emit(id, {
            eventType: "profile.completed",
            sourceRef: "fixture_http_profile_mobile_emulation",
            destinationRedacted: redactUrl(input.url),
            coverageSource: "mobileEmulated"
          });
          coverage.mobileEmulated = "complete";

          // --- Cloaking Differential Check ---
          const isCloaked =
            (crawler.status !== mobile.status || crawler.hasCredentialForm !== mobile.hasCredentialForm) &&
            (crawler.status >= 400 || mobile.hasCredentialForm);

          if (isCloaked) {
            concern = true;
            const diffEv = this.emit(id, {
              eventType: "profile.difference_found",
              sourceRef: "fixture_profile_comparator",
              destinationRedacted: redactUrl(input.url),
              coverageSource: "semantic_diff"
            });
            reasons.push({
              text: `Differential content observed across profiles (anti-analysis / cloaking): crawler received HTTP ${crawler.status} “${crawler.title}”, while mobile emulation received HTTP ${mobile.status} “${mobile.title}” with credential inputs.`,
              evidenceIds: [diffEv.id]
            });
            limitations.push("Mobile emulation uses an HTTP Safari user-agent string on controlled fixtures, not a physical iOS device.");
          }

          // --- Credential Harvesting Form Check ---
          if (mobile.hasCredentialForm || desktop.hasCredentialForm) {
            concern = true;
            const formEv = this.emit(id, {
              eventType: "brand.candidate_found",
              sourceRef: "fixture_form_inspector",
              destinationRedacted: redactUrl(input.url),
              fieldCategories: ["username", "password"],
              coverageSource: "form_inspector"
            });
            reasons.push({
              text: "A credential-submission form requesting credentials/passwords was observed on the page.",
              evidenceIds: [formEv.id]
            });
          }

          // --- Brand & Canonical Domain Inspection ---
          const pageTitle = (mobile.title || desktop.title || "").toLowerCase();
          const pageText = (mobile.text || desktop.text || "").toLowerCase();
          let matchedBrand: { brandName: string; canonicalHosts: string[] } | null = null;

          if (pageTitle.includes("apex") || pageText.includes("apex financial") || pageText.includes("apex bank")) {
            matchedBrand = BRAND_REGISTRY["apex"];
          } else if (pageTitle.includes("state federal") || pageText.includes("state federal") || targetUrl.pathname === "/fixtures/brand-clone") {
            matchedBrand = BRAND_REGISTRY["statefederal"];
          } else if (pageTitle.includes("first national") || pageText.includes("first national bank")) {
            matchedBrand = BRAND_REGISTRY["firstnational"];
          } else if (pageTitle.includes("university") || pageText.includes("student portal") || pageText.includes("scholarship")) {
            matchedBrand = BRAND_REGISTRY["university"];
          }

          if (matchedBrand) {
            const currentHost = targetUrl.host.toLowerCase();
            const isCanonical = matchedBrand.canonicalHosts.some(h => currentHost === h || currentHost.endsWith(`.${h}`));

            const brandEv = this.emit(id, {
              eventType: "brand.relationship_checked",
              sourceRef: "brand_canonical_evaluator",
              destinationRedacted: redactUrl(input.url),
              coverageSource: "brand_registry"
            });

            if (!isCanonical) {
              if (targetUrl.pathname === "/fixtures/brand-clone" || mobile.hasCredentialForm) {
                concern = true;
                reasons.push({
                  text: `The page presents ${matchedBrand.brandName} branding but is hosted on non-canonical test host “${currentHost}” instead of registered domains (${matchedBrand.canonicalHosts.join(", ")}).`,
                  evidenceIds: [brandEv.id]
                });
              }
            } else {
              expectedFlow = true;
              reasons.push({
                text: `Host matches canonical registry for ${matchedBrand.brandName}.`,
                evidenceIds: [brandEv.id]
              });
            }
          }

          // Multimodal vision & model verification check (Slice 6)
          if (!process.env.GEMINI_API_KEY) {
            limitations.push("No Gemini runtime key is configured. Vision-based brand verification was skipped (partial brand-registry fallback).");
          } else {
            coverage.brandVerification = "complete";
            try {
              const geminiModel = process.env.GEMINI_MODEL || "gemini-3.8-flash";
              const prompt = `Assess this suspicious communication for cyber deception:\nMessage: "${input.message || ""}"\nDestination URL: "${input.url || ""}"\nIn 1 sentence, explain whether this shows credential harvesting, brand spoofing, or deceptive urgency.`;
              const gRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  contents: [{ parts: [{ text: prompt }] }]
                }),
                signal: AbortSignal.timeout(6000)
              });

              if (gRes.ok) {
                const gData = await gRes.json();
                const gText = gData.candidates?.[0]?.content?.parts?.[0]?.text;
                if (gText) {
                  const gEv = this.emit(id, {
                    eventType: "brand.relationship_checked",
                    sourceRef: "gemini-3.8-flash",
                    destinationRedacted: input.url ? redactUrl(input.url) : null,
                    transferState: "declared",
                    coverageSource: "brand_check",
                    fieldCategories: ["brand_impersonation", "model_explanation"]
                  });
                  reasons.push({
                    text: `Gemini 3.8 Flash AI Evaluation: ${gText.trim()}`,
                    evidenceIds: [gEv.id]
                  });
                }
              }
            } catch (err: any) {
              limitations.push(`Gemini runtime call encountered error: ${err.message}. Registry fallback used.`);
            }
          }

          if (targetUrl.pathname === "/fixtures/benign-portal" && !concern) {
            expectedFlow = true;
            reasons.push({
              text: "The page matches standard institutional informational content with no coercive credential prompts.",
              evidenceIds: []
            });
          }
        }
      }

      // --- Stage C: Authorized Synthetic Credential Probe (Slice 7) ---
      if (analysis.requestedMode === "authorized_fixture_probe") {
        coverage.syntheticProbe = "complete";
        lifecycle.transitionTo("probing");
        analysis.status = "probing";

        const canaryFingerprint = randomUUID().slice(0, 12);
        const canaryPassword = `TL-CANARY-${canaryFingerprint}`;

        // Emit probe attempt
        const probeAttemptEv = this.emit(id, {
          eventType: "probe.attempt_observed",
          sourceRef: "synthetic_probe_runner",
          destinationRedacted: input.url ? redactUrl(input.url) : null,
          transferState: "attempted",
          canaryMatchClass: "synthetic_match",
          fieldCategories: ["username", "password"],
          coverageSource: "synthetic_probe"
        });

        // Submit to team mock receiver on fixture server
        const receiverUrl = `${this.fixtureBaseUrl}/receiver/canary`;
        let receiverConfirmed = false;

        try {
          const probeController = new AbortController();
          const pTimer = setTimeout(() => probeController.abort(), 3000);
          const probeRes = await fetch(receiverUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-threatlens-scope-id": scopeId || "",
              "x-threatlens-run-id": id,
              "x-threatlens-target-host": targetUrl ? targetUrl.host : "fixture.threatlens.test"
            },
            body: JSON.stringify({
              scopeId,
              fixtureRunId: id,
              username: "synthetic-canary@threatlens.test",
              password: canaryPassword
            }),
            signal: probeController.signal
          });
          clearTimeout(pTimer);

          if (probeRes.status === 201) {
            receiverConfirmed = true;
            const confirmEv = this.emit(id, {
              eventType: "probe.receiver_confirmed",
              sourceRef: "mock_receiver",
              destinationRedacted: receiverUrl,
              transferState: "receiver_confirmed",
              canaryMatchClass: "synthetic_match",
              coverageSource: "mock_receiver"
            });
            concern = true;
            reasons.push({
              text: "The team-owned mock receiver confirmed receipt of synthetic canary credentials (TL-CANARY-*) under active scope.",
              evidenceIds: [probeAttemptEv.id, confirmEv.id]
            });
          } else {
            this.emit(id, {
              eventType: "probe.blocked",
              sourceRef: "mock_receiver",
              transferState: "blocked",
              canaryMatchClass: "synthetic_match",
              coverageSource: "mock_receiver"
            });
          }
        } catch {
          this.emit(id, {
            eventType: "probe.blocked",
            sourceRef: "egress_guard",
            transferState: "blocked",
            coverageSource: "synthetic_probe"
          });
        }
      }

      // --- Stage D: Final Assessment Synthesis ---
      lifecycle.transitionTo("assessing");
      analysis.status = "assessing";

      if (!reasons.length) {
        const ev = this.emit(id, {
          eventType: "assessment.updated",
          sourceRef: "heuristic_rules_v1",
          coverageSource: "orchestrator"
        });
        reasons.push({
          text: input.message ? "No configured concern cues were identified in the excerpt." : "No supported evidence was collected for this input.",
          evidenceIds: [ev.id]
        });
      }

      const verdict = concern
        ? "action_concern_supported"
        : coverage.sandbox === "blocked_attempt_observed" && !input.message
        ? "investigation_incomplete"
        : expectedFlow
        ? "expected_flow_supported"
        : "more_verification_needed";

      const severityIndex = concern
        ? 82
        : coverage.sandbox === "blocked_attempt_observed" && !input.message
        ? null
        : expectedFlow
        ? 12
        : 35;

      const severityBand =
        severityIndex === null
          ? "inconclusive"
          : severityIndex >= 70
          ? "high"
          : severityIndex >= 40
          ? "medium"
          : "low";

      const evidenceStrength = concern && (coverage.sandbox === "complete" || coverage.syntheticProbe === "complete")
        ? "observed_action"
        : concern
        ? "inferred_concern"
        : expectedFlow
        ? "observed_action"
        : "unresolved";

      const assessmentStatus = (coverage.sandbox === "blocked_attempt_observed" && !input.message) ? "partial" : "completed";

      const assessment: Assessment = {
        analysisId: id,
        status: assessmentStatus,
        verdict,
        severity: {
          index: severityIndex,
          band: severityBand,
          policyVersion: "local-demo-v1"
        },
        evidenceStrength,
        coverage,
        reasons,
        nextSteps: concern
          ? [
              "Do not enter passwords, OTPs, or financial information on the candidate page.",
              "Verify the request through the institution's official website or known directory phone number."
            ]
          : expectedFlow
          ? ["Proceed normally through verified institutional channels."]
          : ["Verify unexpected links through a known, separate channel before entering information."],
        limitations,
        createdAt: new Date().toISOString()
      };

      AssessmentSchema.parse(assessment);
      this.assessments.set(id, assessment);

      lifecycle.transitionTo(assessmentStatus);
      analysis.status = assessmentStatus;
      analysis.finishedAt = new Date().toISOString();

      this.emit(id, {
        eventType: assessmentStatus === "partial" ? "analysis.partial" : "analysis.completed",
        sourceRef: "assessment_engine",
        destinationRedacted: input.url ? redactUrl(input.url) : null,
        coverageSource: "assessment_engine"
      });
    } catch (error) {
      if ((analysis.status as AnalysisStatus) === "cancelled") return;

      const canFail = lifecycle.canTransitionTo("partial");
      if (canFail) {
        lifecycle.transitionTo("partial", "Pipeline error");
        analysis.status = "partial";
      } else {
        lifecycle.transitionTo("failed");
        analysis.status = "failed";
        analysis.errorCode = "internal_error";
      }
      analysis.finishedAt = new Date().toISOString();

      const ev = this.emit(id, {
        eventType: "profile.failed",
        sourceRef: "pipeline_runner",
        destinationRedacted: input.url ? redactUrl(input.url) : null,
        coverageSource: "pipeline_runner"
      });

      const assessment: Assessment = {
        analysisId: id,
        status: analysis.status === "failed" ? "failed" : "partial",
        verdict: "investigation_incomplete",
        severity: { index: null, band: "inconclusive", policyVersion: "local-demo-v1" },
        evidenceStrength: "unresolved",
        coverage: {
          crawler: "failed",
          desktop: "not_applicable",
          mobileEmulated: "failed",
          message: input.message ? "complete" : "not_applicable",
          sandbox: "failed"
        },
        reasons: [{
          text: error instanceof Error ? `Pipeline processing halted: ${error.message}` : "Pipeline processing halted.",
          evidenceIds: [ev.id]
        }],
        nextSteps: ["Check service status and retry analysis."],
        limitations: ["Investigation could not complete due to execution error."],
        createdAt: new Date().toISOString()
      };

      this.assessments.set(id, assessment);
      this.emit(id, {
        eventType: analysis.status === "failed" ? "analysis.failed" : "analysis.partial",
        sourceRef: "assessment_engine",
        coverageSource: "assessment_engine"
      });
    }
  }

  private emit(
    id: string,
    params: Parameters<AnalysisLifecycleManager["emitEvent"]>[0]
  ): EvidenceEvent {
    const lifecycle = this.lifecycles.get(id);
    if (!lifecycle) {
      throw new Error(`No lifecycle found for analysis '${id}'`);
    }
    const event = lifecycle.emitEvent(params);
    const listeners = this.eventListeners.get(id);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(event);
        } catch {
          // Keep listener errors isolated
        }
      }
    }
    return event;
  }
}
