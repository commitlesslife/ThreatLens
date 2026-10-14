import { z } from "zod";
import { UuidSchema, IsoDateTimeSchema } from "./common.js";
import { CoverageStateSchema } from "./profile.js";

export const AssessmentVerdictSchema = z.enum([
  "action_concern_supported",
  "related_evidence_found",
  "expected_flow_supported",
  "more_verification_needed",
  "investigation_incomplete",
  "no_concerning_behavior_observed"
]);
export type AssessmentVerdict = z.infer<typeof AssessmentVerdictSchema>;

export const SeverityBandSchema = z.enum([
  "low",
  "medium",
  "high",
  "critical",
  "inconclusive"
]);
export type SeverityBand = z.infer<typeof SeverityBandSchema>;

export const SeveritySchema = z.object({
  index: z.number().min(0).max(100).nullable(),
  band: SeverityBandSchema,
  policyVersion: z.string().default("v1")
});
export type Severity = z.infer<typeof SeveritySchema>;

export const EvidenceStrengthSchema = z.enum([
  "unresolved",
  "inferred_concern",
  "observed_action",
  "independently_corroborated"
]);
export type EvidenceStrength = z.infer<typeof EvidenceStrengthSchema>;

export const ReasonItemSchema = z.object({
  text: z.string().min(1),
  evidenceIds: z.array(UuidSchema).default([])
});
export type ReasonItem = z.infer<typeof ReasonItemSchema>;

export const AssessmentSchema = z.object({
  analysisId: UuidSchema,
  status: z.enum(["completed", "partial", "failed", "cancelled"]),
  verdict: AssessmentVerdictSchema,
  severity: SeveritySchema,
  evidenceStrength: EvidenceStrengthSchema,
  coverage: z.record(z.string(), CoverageStateSchema),
  reasons: z.array(ReasonItemSchema),
  nextSteps: z.array(z.string()).default([]),
  limitations: z.array(z.string()).default([]),
  createdAt: IsoDateTimeSchema
});
export type Assessment = z.infer<typeof AssessmentSchema>;
