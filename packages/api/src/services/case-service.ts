import { randomUUID } from "node:crypto";
import {
  Case,
  CaseSchema,
  CaseDisposition,
  RetentionPreference,
  CorrectionRecord
} from "@threatlens/contracts";

export interface CreateCaseInput {
  sourceAnalysisIds: string[];
  disposition?: CaseDisposition;
  redactedSummary: string;
  entities?: Array<{ name: string; role: string; canonicalDomain?: string }>;
  retentionPreference?: RetentionPreference;
}

export class CaseService {
  private cases = new Map<string, Case>();

  public createCase(input: CreateCaseInput, tenantId = "tenant-default"): Case {
    const id = randomUUID();
    const now = new Date();
    const days = input.retentionPreference === "extended_90_days" ? 90 : 30;
    const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();

    const newCase: Case = {
      id,
      tenantId,
      sourceAnalysisIds: input.sourceAnalysisIds,
      disposition: input.disposition || "unresolved",
      redactedSummary: input.redactedSummary,
      entities: input.entities || [],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      expiresAt,
      retentionPreference: input.retentionPreference || "standard_30_days",
      correctionHistory: [],
      version: 1
    };

    CaseSchema.parse(newCase);
    this.cases.set(id, newCase);
    return newCase;
  }

  public getCase(id: string): Case | undefined {
    return this.cases.get(id);
  }

  public listCases(tenantId?: string): Case[] {
    const all = Array.from(this.cases.values());
    if (tenantId) {
      return all.filter(c => c.tenantId === tenantId);
    }
    return all;
  }

  public updateCase(
    id: string,
    updates: {
      disposition?: CaseDisposition;
      reason?: string;
      correctedBy?: string;
      retentionPreference?: RetentionPreference;
    }
  ): Case | undefined {
    const existing = this.cases.get(id);
    if (!existing) return undefined;

    const now = new Date().toISOString();
    const correctionHistory = [...existing.correctionHistory];

    if (updates.disposition && updates.disposition !== existing.disposition) {
      const record: CorrectionRecord = {
        correctedAt: now,
        correctedBy: updates.correctedBy || "security_operator",
        priorDisposition: existing.disposition,
        reason: updates.reason || "Case disposition updated"
      };
      correctionHistory.push(record);
    }

    const updated: Case = {
      ...existing,
      disposition: updates.disposition || existing.disposition,
      retentionPreference: updates.retentionPreference || existing.retentionPreference,
      updatedAt: now,
      version: existing.version + 1,
      correctionHistory
    };

    CaseSchema.parse(updated);
    this.cases.set(id, updated);
    return updated;
  }

  public deleteCase(id: string): boolean {
    return this.cases.delete(id);
  }
}
