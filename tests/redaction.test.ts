import { describe, it, expect } from "vitest";
import {
  redactSecrets,
  redactUrl,
  redactEvidenceEvent,
  REDACTED_SECRET,
  REDACTED_CANARY,
  EvidenceEvent
} from "@threatlens/contracts";

describe("Redaction Helpers", () => {
  it("removes Bearer tokens and API keys from text", () => {
    const input = "Authorization: Bearer secret-token-xyz123456 and api_key=ak_live_987654321";
    const redacted = redactSecrets(input);

    expect(redacted).not.toContain("secret-token-xyz123456");
    expect(redacted).not.toContain("ak_live_987654321");
    expect(redacted).toContain(`Bearer ${REDACTED_SECRET}`);
  });

  it("removes custom secrets passed explicitly", () => {
    const secret = "SUPER_CONFIDENTIAL_TOKEN_99";
    const input = `User entered credentials containing ${secret} in verification payload.`;
    const redacted = redactSecrets(input, [secret]);

    expect(redacted).not.toContain(secret);
    expect(redacted).toContain(REDACTED_SECRET);
  });

  it("redacts sensitive query parameters and basic auth in URLs", () => {
    const urlWithQuery = "https://fixture.threatlens.test/login?user=student1&token=session_secret_token_123&otp=987654";
    const redacted = redactUrl(urlWithQuery);

    expect(redacted).not.toContain("session_secret_token_123");
    expect(redacted).not.toContain("987654");
    expect(redacted).toContain(`token=${REDACTED_SECRET}`);
    expect(redacted).toContain(`otp=${REDACTED_SECRET}`);
    expect(redacted).toContain("user=student1"); // Benign query preserved

    const urlWithBasicAuth = "https://admin:superSecretPass123@fixture.threatlens.test/admin";
    const redactedBasic = redactUrl(urlWithBasicAuth);

    expect(redactedBasic).not.toContain("superSecretPass123");
    expect(redactedBasic).toContain(REDACTED_SECRET);
  });

  it("masks synthetic canary markers in event logs", () => {
    const text = "Observed synthetic transmission with marker TL-CANARY-918273-X4";
    const redacted = redactSecrets(text);

    expect(redacted).not.toContain("TL-CANARY-918273-X4");
    expect(redacted).toContain(REDACTED_CANARY);
  });

  it("redacts EvidenceEvent destinations and references", () => {
    const event: EvidenceEvent = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      analysisId: "123e4567-e89b-12d3-a456-426614174000",
      profileRunId: null,
      sequence: 1,
      eventType: "probe.attempt_observed",
      sourceRef: "probe_worker_with_secret_xyz789",
      destinationRedacted: "http://receiver.threatlens.test/canary?auth=super_secret_auth_code",
      method: "POST",
      fieldCategories: ["username", "password"],
      canaryMatchClass: "synthetic_match",
      transferState: "attempted",
      observedAt: new Date().toISOString(),
      coverageSource: "playwright_route",
      artifactId: null,
      contentHash: null,
      schemaVersion: "v1"
    };

    const sanitized = redactEvidenceEvent(event, ["secret_xyz789"]);

    expect(sanitized.destinationRedacted).not.toContain("super_secret_auth_code");
    expect(sanitized.destinationRedacted).toContain(`auth=${REDACTED_SECRET}`);
    expect(sanitized.sourceRef).not.toContain("secret_xyz789");
    expect(sanitized.sourceRef).toContain(REDACTED_SECRET);
  });
});
