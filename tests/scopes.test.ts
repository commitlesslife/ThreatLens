import { describe, it, expect } from "vitest";
import { validateScope, AuthorizationScope } from "@threatlens/contracts";

describe("Authorization Scope Enforcement", () => {
  const baseScope: AuthorizationScope = {
    id: "123e4567-e89b-12d3-a456-426614174000",
    tenantId: "tenant-fixture-local",
    purpose: "fixture_probe_verification",
    allowedHosts: ["fixture.threatlens.test", "localhost"],
    allowedActions: ["form_submit", "fetch"],
    allowedReceivers: ["http://localhost:4002/receiver/canary", "http://receiver.threatlens.test/receiver/canary"],
    fixtureTenant: "tenant-fixture-local",
    ownerReference: "fixture-admin-lab",
    createdAt: new Date(Date.now() - 60000).toISOString(),
    expiresAt: new Date(Date.now() + 600000).toISOString(), // 10 minutes from now
    revokedAt: null
  };

  it("permits active probing when scope is valid and parameters match", () => {
    const result = validateScope(baseScope, "fixture.threatlens.test", "form_submit", "http://localhost:4002/receiver/canary");
    expect(result.valid).toBe(true);
  });

  it("rejects when scope is missing / null", () => {
    const result = validateScope(null, "fixture.threatlens.test", "form_submit");
    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe("scope_required");
  });

  it("rejects when scope is expired", () => {
    const expiredScope: AuthorizationScope = {
      ...baseScope,
      expiresAt: new Date(Date.now() - 5000).toISOString() // 5 seconds in the past
    };

    const result = validateScope(expiredScope, "fixture.threatlens.test", "form_submit");
    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe("scope_expired");
  });

  it("rejects when scope is revoked", () => {
    const revokedScope: AuthorizationScope = {
      ...baseScope,
      revokedAt: new Date().toISOString()
    };

    const result = validateScope(revokedScope, "fixture.threatlens.test", "form_submit");
    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe("scope_expired");
  });

  it("rejects out-of-scope target host", () => {
    // Attempting probe against arbitrary external domain
    const result = validateScope(baseScope, "external-unauthorized.com", "form_submit");
    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe("target_denied");
  });

  it("rejects out-of-scope action", () => {
    // xhr is not in allowedActions
    const restrictedScope: AuthorizationScope = {
      ...baseScope,
      allowedActions: ["form_submit"]
    };

    const result = validateScope(restrictedScope, "fixture.threatlens.test", "xhr");
    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe("target_denied");
  });

  it("rejects out-of-scope receiver URL", () => {
    const result = validateScope(
      baseScope,
      "fixture.threatlens.test",
      "form_submit",
      "http://rogue-receiver.com/exfiltrate"
    );
    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe("target_denied");
  });
});
