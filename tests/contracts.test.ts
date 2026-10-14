import { describe, it, expect } from "vitest";
import {
  AnalysisSchema,
  ProfileRunSchema,
  EvidenceEventSchema,
  FindingSchema,
  AssessmentSchema,
  CaseSchema,
  AuthorizationScopeSchema,
  ReusableSignalSchema,
  ProtectionRuleSchema,
  CreateAnalysisInputSchema
} from "@threatlens/contracts";

describe("Contract Schema Validation", () => {
  const validUuid = "123e4567-e89b-12d3-a456-426614174000";
  const nowIso = new Date().toISOString();

  it("accepts valid Analysis records and rejects malformed records", () => {
    const valid = {
      id: validUuid,
      tenantId: "tenant-1",
      inputKind: "url",
      redactedInput: { url: "https://fixture.threatlens.test/scholarship" },
      requestedMode: "passive",
      authorizationScopeId: null,
      status: "queued",
      policyVersion: "v1",
      createdAt: nowIso,
      startedAt: null,
      finishedAt: null,
      deadlineAt: nowIso,
      errorCode: null
    };

    expect(AnalysisSchema.safeParse(valid).success).toBe(true);

    // Malformed status
    const invalidStatus = { ...valid, status: "unknown_status" };
    expect(AnalysisSchema.safeParse(invalidStatus).success).toBe(false);

    // Missing input
    const invalidInput = { ...valid, redactedInput: {} };
    expect(AnalysisSchema.safeParse(invalidInput).success).toBe(false);

    // Invalid UUID
    const invalidUuidObj = { ...valid, id: "not-a-uuid" };
    expect(AnalysisSchema.safeParse(invalidUuidObj).success).toBe(false);
  });

  it("accepts valid ProfileRun records and rejects malformed records", () => {
    const valid = {
      id: validUuid,
      analysisId: validUuid,
      profileKind: "mobile_emulated",
      engine: "Chromium",
      engineVersion: "120.0.0",
      userAgentClass: "Mobile Safari Emulation",
      viewport: { width: 390, height: 844, deviceScaleFactor: 3 },
      locale: "en-US",
      timezone: "America/New_York",
      egressContext: "fixture-direct",
      instrumentationFlags: ["network_interception"],
      status: "completed",
      startedAt: nowIso,
      finishedAt: nowIso,
      coverage: "complete",
      artifactIds: []
    };

    expect(ProfileRunSchema.safeParse(valid).success).toBe(true);

    // Malformed profileKind
    const invalidKind = { ...valid, profileKind: "real_iphone" };
    expect(ProfileRunSchema.safeParse(invalidKind).success).toBe(false);
  });

  it("accepts valid EvidenceEvent records and rejects malformed records", () => {
    const valid = {
      id: validUuid,
      analysisId: validUuid,
      profileRunId: validUuid,
      sequence: 1,
      eventType: "probe.attempt_observed",
      sourceRef: "mobile_profile",
      destinationRedacted: "https://receiver.threatlens.test/receiver/canary",
      method: "POST",
      fieldCategories: ["username", "password"],
      canaryMatchClass: "synthetic_match",
      transferState: "attempted",
      observedAt: nowIso,
      coverageSource: "playwright_route",
      artifactId: null,
      contentHash: null,
      schemaVersion: "v1"
    };

    expect(EvidenceEventSchema.safeParse(valid).success).toBe(true);

    // Invalid transfer state
    const invalidTransfer = { ...valid, transferState: "leaked_to_attacker" };
    expect(EvidenceEventSchema.safeParse(invalidTransfer).success).toBe(false);

    // Sequence <= 0
    const invalidSeq = { ...valid, sequence: 0 };
    expect(EvidenceEventSchema.safeParse(invalidSeq).success).toBe(false);
  });

  it("accepts valid Finding records and requires supporting event citations", () => {
    const valid = {
      id: validUuid,
      analysisId: validUuid,
      category: "credential_harvesting",
      interpretation: "Form submitted credentials to unverified receiver endpoint.",
      evidenceClass: "observed_action",
      supportingEventIds: [validUuid],
      authorizationSourceIds: [],
      limitations: ["Emulated mobile browser used"],
      createdAt: nowIso
    };

    expect(FindingSchema.safeParse(valid).success).toBe(true);

    // Finding without supporting evidence events must fail
    const invalidNoEvidence = { ...valid, supportingEventIds: [] };
    expect(FindingSchema.safeParse(invalidNoEvidence).success).toBe(false);
  });

  it("accepts valid Assessment records and enforces valid verdicts", () => {
    const valid = {
      analysisId: validUuid,
      status: "completed",
      verdict: "action_concern_supported",
      severity: { index: 70, band: "high", policyVersion: "v1" },
      evidenceStrength: "observed_action",
      coverage: {
        crawler: "complete",
        desktop: "complete",
        mobileEmulated: "complete",
        syntheticProbe: "blocked_attempt_observed"
      },
      reasons: [
        { text: "Mobile profile encountered a credential form attempting exfiltration.", evidenceIds: [validUuid] }
      ],
      nextSteps: ["Do not enter credentials. Report link to campus security."],
      limitations: ["Mobile emulation used."],
      createdAt: nowIso
    };

    expect(AssessmentSchema.safeParse(valid).success).toBe(true);

    // Generic "safe" is explicitly prohibited by contract
    const invalidVerdict = { ...valid, verdict: "safe" };
    expect(AssessmentSchema.safeParse(invalidVerdict).success).toBe(false);
  });

  it("validates Case and AuthorizationScope records", () => {
    const validScope = {
      id: validUuid,
      tenantId: "tenant-fixture",
      purpose: "fixture_probe_verification",
      allowedHosts: ["fixture.threatlens.test"],
      allowedActions: ["form_submit"],
      allowedReceivers: ["http://localhost:4002/receiver/canary"],
      fixtureTenant: "tenant-fixture",
      ownerReference: "lab-admin",
      createdAt: nowIso,
      expiresAt: nowIso,
      revokedAt: null
    };

    expect(AuthorizationScopeSchema.safeParse(validScope).success).toBe(true);

    const validCase = {
      id: validUuid,
      tenantId: "tenant-1",
      sourceAnalysisIds: [validUuid],
      disposition: "concern_supported",
      redactedSummary: "Phishing form observed targeting university students.",
      entities: [{ name: "State University", role: "claimed_entity" }],
      createdAt: nowIso,
      updatedAt: nowIso,
      expiresAt: nowIso,
      retentionPreference: "standard_30_days",
      correctionHistory: [],
      version: 1
    };

    expect(CaseSchema.safeParse(validCase).success).toBe(true);
  });

  it("validates CreateAnalysisInputSchema", () => {
    // URL only
    expect(CreateAnalysisInputSchema.safeParse({
      input: { url: "https://fixture.threatlens.test/scholarship" }
    }).success).toBe(true);

    // Message only
    expect(CreateAnalysisInputSchema.safeParse({
      input: { message: "Urgent: Verify your account immediately." }
    }).success).toBe(true);

    // Empty input fails
    expect(CreateAnalysisInputSchema.safeParse({
      input: {}
    }).success).toBe(false);
  });
});
