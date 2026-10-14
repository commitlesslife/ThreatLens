import { z } from "zod";
import { UuidSchema, IsoDateTimeSchema, TenantIdSchema } from "./common.js";

export const ScopePurposeSchema = z.enum([
  "fixture_probe_verification",
  "lab_integration_test"
]);
export type ScopePurpose = z.infer<typeof ScopePurposeSchema>;

export const ScopeActionSchema = z.enum([
  "form_submit",
  "fetch",
  "navigation",
  "xhr"
]);
export type ScopeAction = z.infer<typeof ScopeActionSchema>;

export const AuthorizationScopeSchema = z.object({
  id: UuidSchema,
  tenantId: TenantIdSchema,
  purpose: ScopePurposeSchema,
  allowedHosts: z.array(z.string().min(1)).min(1),
  allowedActions: z.array(ScopeActionSchema).min(1),
  allowedReceivers: z.array(z.string().url()).min(1),
  fixtureTenant: z.string().min(1),
  ownerReference: z.string().min(1),
  createdAt: IsoDateTimeSchema,
  expiresAt: IsoDateTimeSchema,
  revokedAt: IsoDateTimeSchema.nullable().default(null)
});
export type AuthorizationScope = z.infer<typeof AuthorizationScopeSchema>;

export interface ScopeValidationResult {
  valid: boolean;
  errorCode?: "scope_required" | "scope_expired" | "target_denied" | "invalid_scope";
  reason?: string;
}

/**
 * Validates whether an authorization scope is active and covers the target host, action, and receiver.
 */
export function validateScope(
  scope: AuthorizationScope | null | undefined,
  targetHost: string,
  action: ScopeAction,
  receiverUrl?: string,
  now: Date = new Date()
): ScopeValidationResult {
  if (!scope) {
    return {
      valid: false,
      errorCode: "scope_required",
      reason: "Active testing requires an authorized fixture scope."
    };
  }

  // Check parse / validity
  const parsed = AuthorizationScopeSchema.safeParse(scope);
  if (!parsed.success) {
    return {
      valid: false,
      errorCode: "invalid_scope",
      reason: "Authorization scope schema validation failed."
    };
  }

  // Check revocation
  if (scope.revokedAt !== null) {
    return {
      valid: false,
      errorCode: "scope_expired",
      reason: "Authorization scope has been revoked."
    };
  }

  // Check expiration
  const expiryTime = new Date(scope.expiresAt).getTime();
  if (now.getTime() >= expiryTime) {
    return {
      valid: false,
      errorCode: "scope_expired",
      reason: "Authorization scope has expired."
    };
  }

  // Check target host
  const normalizedTargetHost = targetHost.toLowerCase().split(":")[0];
  const hostAllowed = scope.allowedHosts.some(host => {
    const norm = host.toLowerCase().split(":")[0];
    return norm === normalizedTargetHost || normalizedTargetHost.endsWith(`.${norm}`);
  });

  if (!hostAllowed) {
    return {
      valid: false,
      errorCode: "target_denied",
      reason: `Target host '${targetHost}' is not covered by the authorization scope allowedHosts.`
    };
  }

  // Check action
  if (!scope.allowedActions.includes(action)) {
    return {
      valid: false,
      errorCode: "target_denied",
      reason: `Action '${action}' is not permitted under this authorization scope.`
    };
  }

  // Check receiver URL if provided
  if (receiverUrl) {
    try {
      const parsedReceiver = new URL(receiverUrl);
      const receiverAllowed = scope.allowedReceivers.some(allowed => {
        const parsedAllowed = new URL(allowed);
        return parsedAllowed.origin.toLowerCase() === parsedReceiver.origin.toLowerCase();
      });

      if (!receiverAllowed) {
        return {
          valid: false,
          errorCode: "target_denied",
          reason: `Receiver URL '${receiverUrl}' is not in the scope's allowed receivers.`
        };
      }
    } catch {
      return {
        valid: false,
        errorCode: "invalid_scope",
        reason: `Receiver URL '${receiverUrl}' is malformed.`
      };
    }
  }

  return { valid: true };
}
