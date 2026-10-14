import { z } from "zod";
import { UuidSchema, IsoDateTimeSchema, TenantIdSchema } from "./common.js";

export const InputKindSchema = z.enum(["url", "message", "both"]);
export type InputKind = z.infer<typeof InputKindSchema>;

export const AnalysisModeSchema = z.enum(["passive", "authorized_fixture_probe"]);
export type AnalysisMode = z.infer<typeof AnalysisModeSchema>;

export const AnalysisStatusSchema = z.enum([
  "queued",
  "admitting",
  "observing",
  "comparing",
  "probing",
  "assessing",
  "completed",
  "partial",
  "cancelled",
  "failed"
]);
export type AnalysisStatus = z.infer<typeof AnalysisStatusSchema>;

export const AnalysisErrorCodeSchema = z.enum([
  "invalid_input",
  "unsupported_scheme",
  "target_denied",
  "scope_required",
  "scope_expired",
  "rate_limited",
  "not_found",
  "timeout",
  "cancelled",
  "provider_unavailable",
  "resource_limit",
  "internal_error"
]);
export type AnalysisErrorCode = z.infer<typeof AnalysisErrorCodeSchema>;

export const RedactedInputSchema = z.object({
  url: z.string().url().optional(),
  message: z.string().optional()
}).refine(data => data.url !== undefined || data.message !== undefined, {
  message: "At least one of url or message must be present in input"
});
export type RedactedInput = z.infer<typeof RedactedInputSchema>;

export const AnalysisSchema = z.object({
  id: UuidSchema,
  tenantId: TenantIdSchema,
  inputKind: InputKindSchema,
  redactedInput: RedactedInputSchema,
  requestedMode: AnalysisModeSchema,
  authorizationScopeId: z.string().uuid().nullable(),
  status: AnalysisStatusSchema,
  policyVersion: z.string().default("v1"),
  createdAt: IsoDateTimeSchema,
  startedAt: IsoDateTimeSchema.nullable(),
  finishedAt: IsoDateTimeSchema.nullable(),
  deadlineAt: IsoDateTimeSchema,
  errorCode: AnalysisErrorCodeSchema.nullable().default(null),
  sourceClient: z.enum(["web_app", "extension", "api", "test"]).default("web_app"),
  sourceSiteAdapter: z.string().nullable().default(null),
  consentVersion: z.string().nullable().default(null)
});
export type Analysis = z.infer<typeof AnalysisSchema>;
