import { z } from "zod";
import { UuidSchema, IsoDateTimeSchema } from "./common.js";
import { AnalysisModeSchema, AnalysisStatusSchema, AnalysisErrorCodeSchema, RedactedInputSchema } from "./analysis.js";

export const ClientSourceSchema = z.enum(["web_app", "extension", "api", "test"]).default("web_app");
export type ClientSource = z.infer<typeof ClientSourceSchema>;

export const CreateAnalysisInputSchema = z.object({
  input: RedactedInputSchema,
  requestedMode: AnalysisModeSchema.default("passive"),
  locale: z.string().default("en"),
  scopeId: z.string().uuid().nullable().optional().default(null),
  sourceClient: ClientSourceSchema.optional().default("web_app"),
  sourceSiteAdapter: z.string().nullable().optional().default(null),
  consentVersion: z.string().nullable().optional().default(null)
});
export type CreateAnalysisInput = z.infer<typeof CreateAnalysisInputSchema>;

export const CreateAnalysisResponseSchema = z.object({
  requestId: UuidSchema,
  analysisId: UuidSchema,
  status: AnalysisStatusSchema,
  eventsUrl: z.string(),
  createdAt: IsoDateTimeSchema
});
export type CreateAnalysisResponse = z.infer<typeof CreateAnalysisResponseSchema>;

export const ErrorDetailSchema = z.object({
  code: AnalysisErrorCodeSchema,
  message: z.string(),
  retryable: z.boolean().default(false)
});
export type ErrorDetail = z.infer<typeof ErrorDetailSchema>;

export const ErrorEnvelopeSchema = z.object({
  requestId: UuidSchema,
  error: ErrorDetailSchema
});
export type ErrorEnvelope = z.infer<typeof ErrorEnvelopeSchema>;
