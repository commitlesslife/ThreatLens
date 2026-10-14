import { z } from "zod";
import { UuidSchema, IsoDateTimeSchema } from "./common.js";

export const ProfileKindSchema = z.enum(["crawler", "desktop", "mobile_emulated"]);
export type ProfileKind = z.infer<typeof ProfileKindSchema>;

export const ProfileStatusSchema = z.enum(["pending", "running", "completed", "failed", "skipped"]);
export type ProfileStatus = z.infer<typeof ProfileStatusSchema>;

export const CoverageStateSchema = z.enum(["complete", "partial", "failed", "not_applicable", "blocked_attempt_observed"]);
export type CoverageState = z.infer<typeof CoverageStateSchema>;

export const ViewportSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  deviceScaleFactor: z.number().positive().optional().default(1)
});
export type Viewport = z.infer<typeof ViewportSchema>;

export const ProfileRunSchema = z.object({
  id: UuidSchema,
  analysisId: UuidSchema,
  profileKind: ProfileKindSchema,
  engine: z.string().min(1),
  engineVersion: z.string().min(1),
  userAgentClass: z.string().min(1),
  viewport: ViewportSchema,
  locale: z.string().min(2),
  timezone: z.string().min(1),
  egressContext: z.string().min(1),
  instrumentationFlags: z.array(z.string()).default([]),
  status: ProfileStatusSchema,
  startedAt: IsoDateTimeSchema.nullable(),
  finishedAt: IsoDateTimeSchema.nullable(),
  coverage: CoverageStateSchema,
  artifactIds: z.array(z.string()).default([])
});
export type ProfileRun = z.infer<typeof ProfileRunSchema>;
