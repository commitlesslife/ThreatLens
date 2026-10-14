import { z } from "zod";
import { UuidSchema, IsoDateTimeSchema, TenantIdSchema } from "./common.js";

export const CaseDispositionSchema = z.enum([
  "unresolved",
  "concern_supported",
  "expected_flow_supported",
  "superseded",
  "retracted"
]);
export type CaseDisposition = z.infer<typeof CaseDispositionSchema>;

export const RetentionPreferenceSchema = z.enum([
  "standard_30_days",
  "extended_90_days",
  "immediate_delete_on_session_close"
]);
export type RetentionPreference = z.infer<typeof RetentionPreferenceSchema>;

export const CaseEntitySchema = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  canonicalDomain: z.string().optional()
});
export type CaseEntity = z.infer<typeof CaseEntitySchema>;

export const CorrectionRecordSchema = z.object({
  correctedAt: IsoDateTimeSchema,
  correctedBy: z.string().min(1),
  priorDisposition: CaseDispositionSchema,
  reason: z.string().min(1)
});
export type CorrectionRecord = z.infer<typeof CorrectionRecordSchema>;

export const CaseSchema = z.object({
  id: UuidSchema,
  tenantId: TenantIdSchema,
  sourceAnalysisIds: z.array(UuidSchema).min(1),
  disposition: CaseDispositionSchema,
  redactedSummary: z.string().min(1),
  entities: z.array(CaseEntitySchema).default([]),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
  expiresAt: IsoDateTimeSchema,
  retentionPreference: RetentionPreferenceSchema.default("standard_30_days"),
  correctionHistory: z.array(CorrectionRecordSchema).default([]),
  version: z.number().int().positive().default(1)
});
export type Case = z.infer<typeof CaseSchema>;
