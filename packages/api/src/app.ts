import { randomUUID } from "node:crypto";
import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import { ScopeService } from "./services/scope-service.js";
import { AnalysisService } from "./services/analysis-service.js";
import { CaseService } from "./services/case-service.js";

export interface AppServices {
  scopeService?: ScopeService;
  analysisService?: AnalysisService;
  caseService?: CaseService;
}

export function createApp(services: AppServices = {}): Express {
  const app = express();
  const scopeService = services.scopeService || new ScopeService();
  const analysisService = services.analysisService || new AnalysisService(scopeService);
  const caseService = services.caseService || new CaseService();

  app.use(cors());
  app.use(express.json());

  // Attach requestId to each request
  app.use((req: Request, res: Response, next: NextFunction) => {
    const requestId = (req.headers["x-request-id"] as string) || randomUUID();
    res.setHeader("X-Request-Id", requestId);
    (req as any).requestId = requestId;
    next();
  });

  // Health check endpoints
  app.get("/health/live", (_req: Request, res: Response) => {
    res.json({ status: "live", service: "threatlens-api" });
  });

  app.get("/health/ready", (_req: Request, res: Response) => {
    res.json({ status: "ready", mode: "fixture_only", publicFetchEnabled: false });
  });

  // POST /api/v1/analyses - Submit URL, message, or both
  app.post("/api/v1/analyses", (req: Request, res: Response) => {
    const requestId = (req as any).requestId;
    const tenantId = (req.headers["x-tenant-id"] as string) || "tenant-fixture-local";

    const result = analysisService.createAnalysis(req.body, tenantId);

    if (result.error) {
      res.status(400).json({
        requestId,
        error: result.error
      });
      return;
    }

    res.status(202).json({
      requestId,
      analysisId: result.analysis!.id,
      status: result.analysis!.status,
      eventsUrl: result.eventsUrl,
      createdAt: result.analysis!.createdAt
    });
  });

  // GET /api/v1/analyses/:id - Read state, status, and current assessment
  app.get("/api/v1/analyses/:id", (req: Request, res: Response) => {
    const requestId = (req as any).requestId;
    const id = String(req.params.id);
    const analysis = analysisService.getAnalysis(id);

    if (!analysis) {
      res.status(404).json({
        requestId,
        error: {
          code: "not_found",
          message: `Analysis with id '${id}' was not found.`,
          retryable: false
        }
      });
      return;
    }

    const assessment = analysisService.getAssessment(id) || null;

    res.json({
      requestId,
      analysis,
      assessment
    });
  });

  // GET /api/v1/analyses/:id/report - Read full report (analysis, assessment, and events)
  app.get("/api/v1/analyses/:id/report", (req: Request, res: Response) => {
    const requestId = (req as any).requestId;
    const id = String(req.params.id);
    const analysis = analysisService.getAnalysis(id);

    if (!analysis) {
      res.status(404).json({
        requestId,
        error: {
          code: "not_found",
          message: `Analysis with id '${id}' was not found.`,
          retryable: false
        }
      });
      return;
    }

    const assessment = analysisService.getAssessment(id) || null;
    const events = analysisService.getEvents(id);

    res.json({
      requestId,
      analysis,
      assessment,
      events
    });
  });

  // GET /api/v1/analyses/:id/events - Stream ordered SSE progress/evidence events
  app.get("/api/v1/analyses/:id/events", (req: Request, res: Response) => {
    const requestId = (req as any).requestId;
    const id = String(req.params.id);
    const analysis = analysisService.getAnalysis(id);

    if (!analysis) {
      res.status(404).json({
        requestId,
        error: {
          code: "not_found",
          message: `Analysis with id '${id}' was not found.`,
          retryable: false
        }
      });
      return;
    }

    const acceptsSSE = req.headers.accept?.includes("text/event-stream");

    if (acceptsSSE) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      // Send existing events first
      const existingEvents = analysisService.getEvents(id);
      for (const event of existingEvents) {
        res.write(`id: ${event.sequence}\nevent: ${event.eventType}\ndata: ${JSON.stringify(event)}\n\n`);
      }

      // If already terminal, end stream
      if (["completed", "partial", "cancelled", "failed"].includes(analysis.status)) {
        res.end();
        return;
      }

      // Subscribe to real-time events
      const unsubscribe = analysisService.addEventListener(id, event => {
        res.write(`id: ${event.sequence}\nevent: ${event.eventType}\ndata: ${JSON.stringify(event)}\n\n`);
        if (["analysis.completed", "analysis.partial", "analysis.cancelled", "analysis.failed"].includes(event.eventType)) {
          res.end();
        }
      });

      req.on("close", () => {
        unsubscribe();
      });
    } else {
      // JSON format for test or non-SSE clients
      const events = analysisService.getEvents(id);
      res.json({
        requestId,
        analysisId: id,
        total: events.length,
        events
      });
    }
  });

  // POST /api/v1/analyses/:id/cancel - Request cancellation
  app.post("/api/v1/analyses/:id/cancel", (req: Request, res: Response) => {
    const requestId = (req as any).requestId;
    const id = String(req.params.id);
    const result = analysisService.cancelAnalysis(id);

    if (!result.success) {
      res.status(404).json({
        requestId,
        error: {
          code: "not_found",
          message: result.error || "Analysis not found",
          retryable: false
        }
      });
      return;
    }

    res.json({
      requestId,
      analysisId: id,
      status: result.analysis!.status,
      cancelled: true
    });
  });

  // Scope management endpoints (lab fixture issuance)
  app.post("/api/v1/scopes", (req: Request, res: Response) => {
    const requestId = (req as any).requestId;
    const scope = scopeService.createFixtureScope(req.body);

    res.status(201).json({
      requestId,
      scope
    });
  });

  app.get("/api/v1/scopes/:id", (req: Request, res: Response) => {
    const requestId = (req as any).requestId;
    const id = String(req.params.id);
    const scope = scopeService.getScope(id);

    if (!scope) {
      res.status(404).json({
        requestId,
        error: {
          code: "not_found",
          message: `Scope '${id}' was not found.`,
          retryable: false
        }
      });
      return;
    }

    res.json({
      requestId,
      scope
    });
  });

  app.post("/api/v1/scopes/:id/revoke", (req: Request, res: Response) => {
    const requestId = (req as any).requestId;
    const id = String(req.params.id);
    const revoked = scopeService.revokeScope(id);

    if (!revoked) {
      res.status(404).json({
        requestId,
        error: {
          code: "not_found",
          message: `Scope '${id}' was not found.`,
          retryable: false
        }
      });
      return;
    }

    res.json({
      requestId,
      scopeId: id,
      revoked: true
    });
  });

  // Casebook endpoints (Slice 4 / Casebook)
  app.post("/api/v1/cases", (req: Request, res: Response) => {
    const requestId = (req as any).requestId;
    const tenantId = (req.headers["x-tenant-id"] as string) || "tenant-default";

    try {
      const createdCase = caseService.createCase(req.body, tenantId);
      res.status(201).json({
        requestId,
        case: createdCase
      });
    } catch (err) {
      res.status(400).json({
        requestId,
        error: {
          code: "invalid_input",
          message: (err as Error).message,
          retryable: false
        }
      });
    }
  });

  app.get("/api/v1/cases", (req: Request, res: Response) => {
    const requestId = (req as any).requestId;
    const tenantId = (req.headers["x-tenant-id"] as string) || undefined;
    const cases = caseService.listCases(tenantId);

    res.json({
      requestId,
      total: cases.length,
      cases
    });
  });

  app.get("/api/v1/cases/:id", (req: Request, res: Response) => {
    const requestId = (req as any).requestId;
    const id = String(req.params.id);
    const caseRecord = caseService.getCase(id);

    if (!caseRecord) {
      res.status(404).json({
        requestId,
        error: {
          code: "not_found",
          message: `Case with id '${id}' was not found.`,
          retryable: false
        }
      });
      return;
    }

    res.json({
      requestId,
      case: caseRecord
    });
  });

  app.patch("/api/v1/cases/:id", (req: Request, res: Response) => {
    const requestId = (req as any).requestId;
    const id = String(req.params.id);
    const updated = caseService.updateCase(id, req.body);

    if (!updated) {
      res.status(404).json({
        requestId,
        error: {
          code: "not_found",
          message: `Case with id '${id}' was not found.`,
          retryable: false
        }
      });
      return;
    }

    res.json({
      requestId,
      case: updated
    });
  });

  app.delete("/api/v1/cases/:id", (req: Request, res: Response) => {
    const requestId = (req as any).requestId;
    const id = String(req.params.id);
    const deleted = caseService.deleteCase(id);

    if (!deleted) {
      res.status(404).json({
        requestId,
        error: {
          code: "not_found",
          message: `Case with id '${id}' was not found.`,
          retryable: false
        }
      });
      return;
    }

    res.json({
      requestId,
      deleted: true
    });
  });

  return app;
}
