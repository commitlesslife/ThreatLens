import { z } from "zod";

/**
 * Common schema primitives
 */
export const UuidSchema = z.string().uuid();

export const IsoDateTimeSchema = z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/));

export const TenantIdSchema = z.string().min(1).max(128);

export const SchemaVersionSchema = z.string().default("v1");
