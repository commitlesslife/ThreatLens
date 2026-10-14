import { z } from "zod";
import { UuidSchema, IsoDateTimeSchema, SchemaVersionSchema } from "./common.js";

export const EventTypeSchema = z.enum([
  "analysis.started",
  "target.admitted",
  "target.denied",
  "profile.started",
  "profile.completed",
  "profile.failed",
  "profile.difference_found",
  "brand.candidate_found",
  "brand.relationship_checked",
  "probe.skipped",
  "probe.attempt_observed",
  "probe.blocked",
  "probe.receiver_confirmed",
  "case.match_found",
  "assessment.updated",
  "analysis.completed",
  "analysis.partial",
  "analysis.cancelled",
  "analysis.failed"
]);
export type EventType = z.infer<typeof EventTypeSchema>;

export const TransferStateSchema = z.enum([
  "declared",
  "attempted",
  "blocked",
  "receiver_confirmed",
  "unknown"
]);
export type TransferState = z.infer<typeof TransferStateSchema>;

export const CanaryMatchClassSchema = z.enum([
  "synthetic_match",
  "no_match",
  "synthetic_mismatch",
  "not_applicable"
]);
export type CanaryMatchClass = z.infer<typeof CanaryMatchClassSchema>;

export const EvidenceEventSchema = z.object({
  id: UuidSchema,
  analysisId: UuidSchema,
  profileRunId: UuidSchema.nullable().default(null),
  sequence: z.number().int().positive(),
  eventType: EventTypeSchema,
  sourceRef: z.string().min(1),
  destinationRedacted: z.string().nullable().default(null),
  method: z.string().nullable().default(null),
  fieldCategories: z.array(z.string()).default([]),
  canaryMatchClass: CanaryMatchClassSchema.default("not_applicable"),
  transferState: TransferStateSchema.default("unknown"),
  observedAt: IsoDateTimeSchema,
  coverageSource: z.string().min(1),
  artifactId: z.string().nullable().default(null),
  contentHash: z.string().nullable().default(null),
  schemaVersion: SchemaVersionSchema
});
export type EvidenceEvent = z.infer<typeof EvidenceEventSchema>;
