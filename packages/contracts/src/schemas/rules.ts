import { z } from "zod";
import { UuidSchema, IsoDateTimeSchema, TenantIdSchema } from "./common.js";

export const SignalTypeSchema = z.enum([
  "exact_dom_signature",
  "exact_canary_sink",
  "canonical_host_fingerprint",
  "brand_visual_hash",
  "similarity_lead"
]);
export type SignalType = z.infer<typeof SignalTypeSchema>;

export const SignalEligibilitySchema = z.enum([
  "exact_rule_eligible",
  "review_required",
  "advisory_lead_only",
  "ineligible"
]);
export type SignalEligibility = z.infer<typeof SignalEligibilitySchema>;

export const ConfidenceClassSchema = z.enum(["high", "medium", "low"]);
export type ConfidenceClass = z.infer<typeof ConfidenceClassSchema>;

export const ReusableSignalSchema = z.object({
  id: UuidSchema,
  tenantId: TenantIdSchema,
  sourceCaseIds: z.array(UuidSchema).min(1),
  signalType: SignalTypeSchema,
  normalizedValueHash: z.string().min(1),
  scope: z.string().min(1),
  eligibility: SignalEligibilitySchema,
  confidenceClass: ConfidenceClassSchema,
  createdAt: IsoDateTimeSchema,
  expiresAt: IsoDateTimeSchema,
  revokedAt: IsoDateTimeSchema.nullable().default(null),
  policyVersion: z.string().default("v1")
});
export type ReusableSignal = z.infer<typeof ReusableSignalSchema>;

export const ProtectionRuleSchema = z.object({
  id: UuidSchema,
  signalId: UuidSchema,
  clientType: z.enum(["web_app", "chrome_extension", "api_gateway"]),
  actionScope: z.enum(["warn", "block", "prompt_verification"]),
  ruleVersion: z.string().default("v1"),
  issuedAt: IsoDateTimeSchema,
  expiresAt: IsoDateTimeSchema,
  revokedAt: IsoDateTimeSchema.nullable().default(null),
  enabledByUser: z.boolean().default(true)
});
export type ProtectionRule = z.infer<typeof ProtectionRuleSchema>;
