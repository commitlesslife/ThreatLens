import { randomUUID } from "node:crypto";
import { AnalysisStatus, AnalysisMode } from "../schemas/analysis.js";
import { EvidenceEvent, EventType, CanaryMatchClass, TransferState } from "../schemas/evidence.js";

/**
 * Valid state transitions for the analysis lifecycle:
 * queued -> admitting -> observing -> comparing -> probing -> assessing -> completed
 * Any non-terminal state may exit to partial, cancelled, or failed.
 */
const VALID_TRANSITIONS: Record<AnalysisStatus, AnalysisStatus[]> = {
  queued: ["admitting", "cancelled", "failed"],
  admitting: ["observing", "assessing", "partial", "cancelled", "failed"],
  observing: ["comparing", "assessing", "partial", "cancelled", "failed"],
  comparing: ["probing", "assessing", "partial", "cancelled", "failed"],
  probing: ["assessing", "partial", "cancelled", "failed"],
  assessing: ["completed", "partial", "cancelled", "failed"],
  completed: [],
  partial: [],
  cancelled: [],
  failed: []
};

export class AnalysisLifecycleManager {
  private _analysisId: string;
  private _mode: AnalysisMode;
  private _currentStatus: AnalysisStatus;
  private _sequence: number = 0;
  private _events: EvidenceEvent[] = [];

  constructor(analysisId: string, mode: AnalysisMode = "passive", initialStatus: AnalysisStatus = "queued") {
    this._analysisId = analysisId;
    this._mode = mode;
    this._currentStatus = initialStatus;
  }

  public get analysisId(): string {
    return this._analysisId;
  }

  public get currentStatus(): AnalysisStatus {
    return this._currentStatus;
  }

  public get sequence(): number {
    return this._sequence;
  }

  public get events(): ReadonlyArray<EvidenceEvent> {
    return this._events;
  }

  /**
   * Checks if a transition from the current state to the target state is valid.
   */
  public canTransitionTo(nextStatus: AnalysisStatus): boolean {
    const allowed = VALID_TRANSITIONS[this._currentStatus] || [];
    return allowed.includes(nextStatus);
  }

  /**
   * Transitions to the next analysis state. Throws an error on illegal transition.
   */
  public transitionTo(nextStatus: AnalysisStatus, reason?: string): void {
    if (!this.canTransitionTo(nextStatus)) {
      throw new Error(`Invalid state transition from '${this._currentStatus}' to '${nextStatus}'`);
    }

    // Additional mode constraints: probing is only allowed in authorized_fixture_probe mode
    if (nextStatus === "probing" && this._mode !== "authorized_fixture_probe") {
      throw new Error(`Cannot transition to 'probing' when analysis mode is '${this._mode}'. Probing is strictly reserved for authorized_fixture_probe.`);
    }

    this._currentStatus = nextStatus;
  }

  /**
   * Emits a real, ordered, monotonic progress/evidence event.
   * Real events are created only when an actual pipeline stage or observation occurs.
   */
  public emitEvent(params: {
    eventType: EventType;
    sourceRef: string;
    profileRunId?: string | null;
    destinationRedacted?: string | null;
    method?: string | null;
    fieldCategories?: string[];
    canaryMatchClass?: CanaryMatchClass;
    transferState?: TransferState;
    coverageSource: string;
    artifactId?: string | null;
    contentHash?: string | null;
    observedAt?: string;
  }): EvidenceEvent {
    this._sequence += 1;

    const event: EvidenceEvent = {
      id: randomUUID(),
      analysisId: this._analysisId,
      profileRunId: params.profileRunId ?? null,
      sequence: this._sequence,
      eventType: params.eventType,
      sourceRef: params.sourceRef,
      destinationRedacted: params.destinationRedacted ?? null,
      method: params.method ?? null,
      fieldCategories: params.fieldCategories ?? [],
      canaryMatchClass: params.canaryMatchClass ?? "not_applicable",
      transferState: params.transferState ?? "unknown",
      observedAt: params.observedAt ?? new Date().toISOString(),
      coverageSource: params.coverageSource,
      artifactId: params.artifactId ?? null,
      contentHash: params.contentHash ?? null,
      schemaVersion: "v1"
    };

    this._events.push(event);
    return event;
  }
}
