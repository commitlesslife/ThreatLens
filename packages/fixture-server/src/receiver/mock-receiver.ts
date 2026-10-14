import { createHash, randomUUID } from "node:crypto";
import { Router, Request, Response } from "express";
import { validateScope, AuthorizationScope } from "@threatlens/contracts";

export interface MockReceiverReceipt {
  id: string;
  fixtureRunId: string;
  scopeId: string;
  canaryMatchClass: "synthetic_match";
  canaryFingerprint: string;
  method: string;
  receivedAt: string;
  sourceHost: string;
}

export class MockReceiverStore {
  private receipts: MockReceiverReceipt[] = [];
  private scopes: Map<string, AuthorizationScope> = new Map();

  public registerScope(scope: AuthorizationScope): void {
    this.scopes.set(scope.id, scope);
  }

  public getScope(scopeId: string): AuthorizationScope | undefined {
    return this.scopes.get(scopeId);
  }

  public recordReceipt(receipt: MockReceiverReceipt): void {
    this.receipts.push(receipt);
  }

  public getReceipts(fixtureRunId?: string): MockReceiverReceipt[] {
    if (fixtureRunId) {
      return this.receipts.filter(r => r.fixtureRunId === fixtureRunId);
    }
    return [...this.receipts];
  }

  public clear(): void {
    this.receipts = [];
  }

  public count(fixtureRunId?: string): number {
    return this.getReceipts(fixtureRunId).length;
  }
}

export interface MockReceiverOptions {
  store?: MockReceiverStore;
  allowedHosts?: string[];
}

const DEFAULT_ALLOWED_HOSTS = [
  "localhost",
  "127.0.0.1",
  "fixture.threatlens.test",
  "receiver.threatlens.test"
];

/**
 * Creates the team-owned mock receiver Express router.
 */
export function createMockReceiverRouter(options: MockReceiverOptions = {}): Router {
  const router = Router();
  const store = options.store || new MockReceiverStore();
  const allowedHosts = (options.allowedHosts || DEFAULT_ALLOWED_HOSTS).map(h => h.toLowerCase());

  // Ingestion endpoint for synthetic probe traffic
  router.post(["/canary", "/api/receiver/canary"], (req: Request, res: Response): void => {
    // 1. Host validation: Reject non-fixture hostnames
    const rawHost = (req.headers["x-forwarded-host"] as string) ||
                    (req.headers["x-threatlens-target-host"] as string) ||
                    req.headers.host || "";
    const hostHeader = rawHost.toLowerCase().split(":")[0];
    const isHostAllowed = allowedHosts.some(allowed => {
      const norm = allowed.split(":")[0];
      return hostHeader === norm || hostHeader.endsWith(`.${norm}`);
    });

    if (!isHostAllowed) {
      res.status(403).json({
        error: {
          code: "target_denied",
          message: `Host '${hostHeader}' is not an authorized fixture host.`
        }
      });
      return;
    }

    // 2. Authorization scope extraction & validation
    const scopeIdHeader = req.headers["x-threatlens-scope-id"] as string | undefined;
    const authHeader = req.headers.authorization;
    let scopeId = scopeIdHeader;

    if (!scopeId && authHeader?.startsWith("Bearer ")) {
      scopeId = authHeader.substring(7).trim();
    }
    if (!scopeId && req.body && typeof req.body === "object") {
      scopeId = req.body.scopeId;
    }

    if (!scopeId) {
      res.status(403).json({
        error: {
          code: "scope_required",
          message: "Receiver requires an authorized fixture scope ID."
        }
      });
      return;
    }

    const scope = store.getScope(scopeId);
    if (!scope) {
      res.status(403).json({
        error: {
          code: "scope_required",
          message: `Scope '${scopeId}' was not recognized or registered on this fixture server.`
        }
      });
      return;
    }

    const validation = validateScope(scope, hostHeader, "form_submit", undefined, new Date());
    if (!validation.valid) {
      res.status(403).json({
        error: {
          code: validation.errorCode || "scope_expired",
          message: validation.reason || "Scope authorization check failed."
        }
      });
      return;
    }

    // 3. Canary payload validation: Ensure ONLY synthetic test traffic is accepted
    const bodyStr = JSON.stringify(req.body || {});
    const canaryMatch = bodyStr.match(/TL-CANARY-[A-Za-z0-9_-]+/);

    if (!canaryMatch) {
      res.status(400).json({
        error: {
          code: "non_synthetic_traffic_rejected",
          message: "Receiver accepts only synthetic test traffic containing valid TL-CANARY markers."
        }
      });
      return;
    }

    const rawCanary = canaryMatch[0];
    const canaryFingerprint = createHash("sha256").update(rawCanary).digest("hex").slice(0, 16);
    const fixtureRunId = req.body?.fixtureRunId || req.headers["x-threatlens-run-id"] || randomUUID();

    // 4. Record sanitized receipt (never store raw payload/passwords)
    const receipt: MockReceiverReceipt = {
      id: randomUUID(),
      fixtureRunId: String(fixtureRunId),
      scopeId,
      canaryMatchClass: "synthetic_match",
      canaryFingerprint,
      method: req.method,
      receivedAt: new Date().toISOString(),
      sourceHost: hostHeader
    };

    store.recordReceipt(receipt);

    res.status(201).json({
      success: true,
      receiptId: receipt.id,
      fixtureRunId: receipt.fixtureRunId,
      canaryMatchClass: receipt.canaryMatchClass,
      canaryFingerprint: receipt.canaryFingerprint,
      receivedAt: receipt.receivedAt
    });
  });

  // Query receipts for verification in tests and demo rehearsal
  router.get(["/receipts", "/api/receiver/receipts"], (req: Request, res: Response): void => {
    const fixtureRunId = req.query.fixtureRunId as string | undefined;
    const receipts = store.getReceipts(fixtureRunId);
    res.json({
      total: receipts.length,
      receipts
    });
  });

  // Reset receipts
  router.post(["/clear", "/api/receiver/clear"], (_req: Request, res: Response): void => {
    store.clear();
    res.json({ success: true, message: "Mock receiver receipts cleared." });
  });

  return router;
}
