import { randomUUID } from "node:crypto";
import {
  AuthorizationScope,
  AuthorizationScopeSchema,
  validateScope,
  ScopeValidationResult,
  ScopeAction,
  ScopePurpose
} from "@threatlens/contracts";

export interface CreateScopeOptions {
  tenantId?: string;
  purpose?: ScopePurpose;
  allowedHosts?: string[];
  allowedActions?: ScopeAction[];
  allowedReceivers?: string[];
  fixtureTenant?: string;
  ownerReference?: string;
  ttlSeconds?: number;
}

export class ScopeService {
  private scopes: Map<string, AuthorizationScope> = new Map();

  /**
   * Issues a server-authorized fixture-only scope.
   * Scopes can only be issued by server provisioning or test coordinators.
   */
  public createFixtureScope(options: CreateScopeOptions = {}): AuthorizationScope {
    const now = new Date();
    const ttlSeconds = options.ttlSeconds ?? 900; // default 15 minutes
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);

    const scope: AuthorizationScope = {
      id: randomUUID(),
      tenantId: options.tenantId || "tenant-fixture-local",
      purpose: options.purpose || "fixture_probe_verification",
      allowedHosts: options.allowedHosts || [
        "localhost",
        "127.0.0.1",
        "fixture.threatlens.test",
        "receiver.threatlens.test"
      ],
      allowedActions: options.allowedActions || ["form_submit", "fetch", "navigation", "xhr"],
      allowedReceivers: options.allowedReceivers || [
        "http://localhost:4002/receiver/canary",
        "http://localhost:4001/receiver/canary",
        "http://receiver.threatlens.test/receiver/canary"
      ],
      fixtureTenant: options.fixtureTenant || "tenant-fixture-local",
      ownerReference: options.ownerReference || "fixture-admin-lab",
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      revokedAt: null
    };

    // Strict validation against contract schema
    AuthorizationScopeSchema.parse(scope);
    this.scopes.set(scope.id, scope);
    return scope;
  }

  public getScope(scopeId: string): AuthorizationScope | undefined {
    return this.scopes.get(scopeId);
  }

  public revokeScope(scopeId: string): boolean {
    const scope = this.scopes.get(scopeId);
    if (!scope) return false;
    scope.revokedAt = new Date().toISOString();
    return true;
  }

  /**
   * Validates if active probe testing is authorized for the given target host and action.
   */
  public checkAuthorization(
    scopeId: string | null | undefined,
    targetHost: string,
    action: ScopeAction = "form_submit",
    receiverUrl?: string,
    now: Date = new Date()
  ): ScopeValidationResult {
    if (!scopeId) {
      return {
        valid: false,
        errorCode: "scope_required",
        reason: "Active testing requires an authorized fixture scope."
      };
    }

    const scope = this.scopes.get(scopeId);
    if (!scope) {
      return {
        valid: false,
        errorCode: "scope_required",
        reason: `Scope '${scopeId}' was not found.`
      };
    }

    return validateScope(scope, targetHost, action, receiverUrl, now);
  }
}
