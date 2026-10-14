import { z } from "zod";
import { UuidSchema, IsoDateTimeSchema } from "./common.js";

export const FindingCategorySchema = z.enum([
  "cloaking_difference",
  "brand_impersonation",
  "credential_harvesting",
  "coercion_language",
  "delegated_login_verified",
  "suspicious_contact",
  "unknown_brand"
]).or(z.string().min(1));
export type FindingCategory = z.infer<typeof FindingCategorySchema>;

export const EvidenceClassSchema = z.enum([
  "observed_action",
  "structural_difference",
  "visual_similarity",
  "text_indicator",
  "corroborated_identity"
]);
export type EvidenceClass = z.infer<typeof EvidenceClassSchema>;

export const FindingSchema = z.object({
  id: UuidSchema,
  analysisId: UuidSchema,
  category: FindingCategorySchema,
  interpretation: z.string().min(1),
  evidenceClass: EvidenceClassSchema,
  supportingEventIds: z.array(UuidSchema).min(1, "Finding must cite at least one supporting evidence event ID"),
  authorizationSourceIds: z.array(z.string()).default([]),
  limitations: z.array(z.string()).default([]),
  createdAt: IsoDateTimeSchema
});
export type Finding = z.infer<typeof FindingSchema>;
