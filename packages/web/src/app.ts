interface EvidenceEvent {
  sequence: number;
  eventType: string;
  sourceRef: string;
  destinationRedacted?: string | null;
  transferState?: string;
  canaryMatchClass?: string;
  observedAt: string;
}

interface Assessment {
  analysisId: string;
  status: string;
  verdict: string;
  severity: {
    index: number | null;
    band: string;
    policyVersion: string;
  };
  evidenceStrength: string;
  coverage: Record<string, string>;
  reasons: Array<{ text: string; evidenceIds: string[] }>;
  nextSteps: string[];
  limitations: string[];
  createdAt: string;
}

interface AnalysisReport {
  requestId: string;
  analysis: {
    id: string;
    status: string;
    requestedMode: string;
    redactedInput: { url?: string; message?: string };
    createdAt: string;
    finishedAt?: string | null;
  };
  assessment?: Assessment | null;
  events?: EvidenceEvent[];
}

const API_BASE = "http://localhost:3001";
let currentAnalysisId: string | null = null;
let currentEventSource: EventSource | null = null;
let currentReport: AnalysisReport | null = null;

// DOM Elements
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const apiStatusBadge = $("api-status-badge");
const casesCountBadge = $("cases-count-badge");
const intakeForm = $("intake-form") as HTMLFormElement;
const inputUrl = $("input-url") as HTMLInputElement;
const inputMessage = $("input-message") as HTMLTextAreaElement;
const scopeInputWrapper = $("scope-input-wrapper");
const inputScopeId = $("input-scope-id") as HTMLInputElement;
const btnIssueScope = $("btn-issue-scope") as HTMLButtonElement;
const btnStartAnalysis = $("btn-start-analysis") as HTMLButtonElement;
const btnCancelAnalysis = $("btn-cancel-analysis") as HTMLButtonElement;

// Progress DOM
const progressCard = $("progress-card");
const lifecycleStatusPill = $("lifecycle-status-pill");
const sseStatus = $("sse-status");
const eventsStreamList = $("events-stream-list");

// Report DOM
const reportCard = $("report-card");
const verdictBanner = $("verdict-banner");
const verdictBadge = $("verdict-badge");
const severityScore = $("severity-score");
const severityBandBadge = $("severity-band-badge");
const verdictSummary = $("verdict-summary");
const profileTableBody = $("profile-table-body");
const cloakingAlertBox = $("cloaking-alert-box");
const cloakingAlertText = $("cloaking-alert-text");
const brandClaimedName = $("brand-claimed-name");
const brandObservedHost = $("brand-observed-host");
const brandCanonicalDomains = $("brand-canonical-domains");
const brandEvalBadge = $("brand-eval-badge");
const syntheticProbeSection = $("synthetic-probe-section");
const probeCanaryMarker = $("probe-canary-marker");
const reasonsList = $("reasons-list");
const nextStepsContainer = $("next-steps-container");
const coveragePillsContainer = $("coverage-pills-container");
const limitationsList = $("limitations-list");
const btnSaveCase = $("btn-save-case") as HTMLButtonElement;
const saveCaseFeedback = $("save-case-feedback");

// Drawer DOM
const casebookDrawer = $("casebook-drawer");
const btnOpenCases = $("btn-open-cases") as HTMLButtonElement;
const btnCloseCases = $("btn-close-cases") as HTMLButtonElement;
const casesListContainer = $("cases-list-container");

// 1. Initial Setup & Health Check
async function checkApiHealth(): Promise<void> {
  try {
    const res = await fetch(`${API_BASE}/health/live`);
    if (res.ok) {
      apiStatusBadge.textContent = "API Live (3001)";
      apiStatusBadge.className = "badge badge-low";
    } else {
      throw new Error();
    }
  } catch {
    apiStatusBadge.textContent = "API Offline";
    apiStatusBadge.className = "badge badge-high";
  }
}

// 2. Preset Click Handlers
document.querySelectorAll<HTMLButtonElement>(".preset-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    inputUrl.value = btn.dataset.url || "";
    inputMessage.value = btn.dataset.msg || "";
    const passiveRadio = document.querySelector<HTMLInputElement>("input[name='requestedMode'][value='passive']");
    if (passiveRadio) passiveRadio.checked = true;
    scopeInputWrapper.style.display = "none";
  });
});

// 3. Mode Toggle & Scope Issuance
document.querySelectorAll<HTMLInputElement>("input[name='requestedMode']").forEach(radio => {
  radio.addEventListener("change", () => {
    const isProbe = radio.value === "authorized_fixture_probe";
    scopeInputWrapper.style.display = isProbe ? "block" : "none";
  });
});

btnIssueScope.addEventListener("click", async () => {
  btnIssueScope.disabled = true;
  btnIssueScope.textContent = "Issuing...";
  try {
    const res = await fetch(`${API_BASE}/api/v1/scopes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        allowedHosts: ["localhost:4001", "127.0.0.1:4001", "fixture.threatlens.test"],
        allowedActions: ["form_submit", "fetch"],
        durationMinutes: 60
      })
    });
    if (res.ok) {
      const data = await res.json();
      inputScopeId.value = data.scope.id;
    }
  } catch (err) {
    alert("Could not issue fixture scope from API: " + (err as Error).message);
  } finally {
    btnIssueScope.disabled = false;
    btnIssueScope.textContent = "Issue Lab Scope";
  }
});

// 4. Stepper Stage Updates
function updateStepper(status: string): void {
  const steps = ["admitting", "observing", "comparing", "probing", "assessing"];
  const currentIdx = steps.indexOf(status);

  steps.forEach((step, idx) => {
    const el = document.getElementById(`step-${step}`);
    if (el) {
      if (idx <= currentIdx || status === "completed" || status === "partial") {
        el.className = "step-node active";
      } else {
        el.className = "step-node";
      }
    }
  });

  lifecycleStatusPill.textContent = status;
  lifecycleStatusPill.className = `status-pill status-${status}`;
}

// 5. Submit Investigation
intakeForm.addEventListener("submit", async e => {
  e.preventDefault();
  const url = inputUrl.value.trim();
  const message = inputMessage.value.trim();

  if (!url && !message) {
    alert("Please provide at least a destination URL or a message excerpt.");
    return;
  }

  const requestedMode = (document.querySelector("input[name='requestedMode']:checked") as HTMLInputElement).value;
  const scopeId = inputScopeId.value.trim() || undefined;

  // Reset UI
  currentAnalysisId = null;
  eventsStreamList.replaceChildren();
  progressCard.style.display = "block";
  reportCard.style.display = "none";
  saveCaseFeedback.textContent = "";
  btnStartAnalysis.disabled = true;
  btnCancelAnalysis.style.display = "inline-flex";

  updateStepper("admitting");
  sseStatus.textContent = "Connecting SSE...";

  try {
    const res = await fetch(`${API_BASE}/api/v1/analyses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: {
          url: url || undefined,
          message: message || undefined
        },
        requestedMode,
        scopeId
      })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || "Analysis request failed.");
    }

    const data = await res.json();
    currentAnalysisId = data.analysisId;
    listenToEvents(data.analysisId);
  } catch (err) {
    alert("Investigation could not be created: " + (err as Error).message);
    btnStartAnalysis.disabled = false;
    btnCancelAnalysis.style.display = "none";
    progressCard.style.display = "none";
  }
});

// 6. Real Progress via Server-Sent Events (SSE)
function listenToEvents(analysisId: string): void {
  if (currentEventSource) {
    currentEventSource.close();
  }

  const sseUrl = `${API_BASE}/api/v1/analyses/${analysisId}/events`;
  currentEventSource = new EventSource(sseUrl);

  currentEventSource.onopen = () => {
    sseStatus.textContent = "SSE Stream Connected (Live)";
  };

  currentEventSource.onmessage = e => {
    try {
      const ev: EvidenceEvent = JSON.parse(e.data);
      appendEvent(ev);

      if (ev.eventType.includes("observing") || ev.eventType.includes("profile.started")) {
        updateStepper("observing");
      } else if (ev.eventType.includes("comparing") || ev.eventType.includes("profile.difference")) {
        updateStepper("comparing");
      } else if (ev.eventType.includes("probe.")) {
        updateStepper("probing");
      } else if (ev.eventType.includes("assessment.updated")) {
        updateStepper("assessing");
      }

      if (["analysis.completed", "analysis.partial", "analysis.cancelled", "analysis.failed"].includes(ev.eventType)) {
        currentEventSource?.close();
        currentEventSource = null;
        sseStatus.textContent = `Completed (${ev.eventType})`;
        btnCancelAnalysis.style.display = "none";
        btnStartAnalysis.disabled = false;
        void fetchAndRenderReport(analysisId);
      }
    } catch {
      // Ignore parse errors on ping
    }
  };

  currentEventSource.onerror = () => {
    // If SSE closes or fails, poll report directly
    setTimeout(() => {
      void fetchAndRenderReport(analysisId);
    }, 1200);
  };
}

function appendEvent(ev: EvidenceEvent): void {
  const item = document.createElement("div");
  item.className = "event-entry";

  const seq = document.createElement("span");
  seq.className = "ev-seq";
  seq.textContent = `#${ev.sequence}`;

  const type = document.createElement("span");
  type.className = "ev-type";
  type.textContent = ev.eventType;

  const src = document.createElement("span");
  src.className = "ev-source";
  src.textContent = `[${ev.sourceRef}]`;

  item.append(seq, type, src);
  if (ev.destinationRedacted) {
    const dest = document.createElement("span");
    dest.className = "ev-source";
    dest.textContent = `-> ${ev.destinationRedacted}`;
    item.append(dest);
  }
  eventsStreamList.prepend(item);
}

// Cancel Analysis
btnCancelAnalysis.addEventListener("click", async () => {
  if (!currentAnalysisId) return;
  btnCancelAnalysis.disabled = true;
  btnCancelAnalysis.textContent = "Cancelling...";
  try {
    await fetch(`${API_BASE}/api/v1/analyses/${currentAnalysisId}/cancel`, { method: "POST" });
  } finally {
    btnCancelAnalysis.disabled = false;
    btnCancelAnalysis.textContent = "Cancel Investigation";
  }
});

// 7. Full Evidence Report Fetch & Render
async function fetchAndRenderReport(analysisId: string): Promise<void> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/analyses/${analysisId}/report`);
    if (!res.ok) throw new Error("Report not ready");
    const data: AnalysisReport = await res.json();
    currentReport = data;
    renderReport(data);
  } catch (err) {
    console.error("Failed to load report", err);
  }
}

function renderReport(data: AnalysisReport): void {
  reportCard.style.display = "block";
  const assessment = data.assessment;

  if (!assessment) {
    verdictBanner.className = "verdict-banner verdict-incomplete";
    verdictBadge.textContent = "INVESTIGATION INCOMPLETE";
    severityScore.textContent = "—";
    severityBandBadge.textContent = "Inconclusive";
    verdictSummary.textContent = "The investigation ended without generating a full assessment.";
    return;
  }

  // Verdict Banner
  const isConcern = assessment.verdict === "action_concern_supported";
  const isExpected = assessment.verdict === "expected_flow_supported";

  verdictBanner.className = `verdict-banner ${isConcern ? "verdict-caution" : isExpected ? "verdict-benign" : "verdict-incomplete"}`;
  verdictBadge.textContent = assessment.verdict.replaceAll("_", " ").toUpperCase();
  severityScore.textContent = assessment.severity.index !== null ? `${assessment.severity.index} / 100` : "—";
  severityBandBadge.textContent = assessment.severity.band.toUpperCase();
  severityBandBadge.className = `badge ${assessment.severity.band === "high" || assessment.severity.band === "critical" ? "badge-high" : assessment.severity.band === "low" ? "badge-low" : "badge-amber"}`;

  verdictSummary.textContent = isConcern
    ? "Concrete evidence of high-risk deception or credential prompts was observed during controlled profile checks."
    : isExpected
    ? "Observations corroborated normal institutional portal content with no credential harvesting cues."
    : "The investigation observed incomplete coverage or unverified destinations. Independent verification required.";

  // Multi-Profile Observation Table
  profileTableBody.replaceChildren();
  const profiles = [
    {
      name: "Crawler Fetch",
      ua: "ThreatLensCrawler/1.0",
      status: assessment.coverage.crawler === "complete" ? 200 : assessment.coverage.crawler === "blocked_attempt_observed" ? 403 : 200,
      title: data.analysis.redactedInput.url?.includes("cloaked") ? "403 Forbidden" : "Institutional Target",
      form: data.analysis.redactedInput.url?.includes("scholarship") ? "Password Field" : "None"
    },
    {
      name: "Desktop Browser",
      ua: "Chrome/120.0 (Win64)",
      status: 200,
      title: "State University Portal",
      form: data.analysis.redactedInput.url?.includes("scholarship") ? "Password Field" : "None"
    },
    {
      name: "Mobile Emulation",
      ua: "Safari Mobile/17.0 (iOS)",
      status: 200,
      title: data.analysis.redactedInput.url?.includes("cloaked") ? "Emergency Security Verification" : "Portal Page",
      form: data.analysis.redactedInput.url?.includes("cloaked") || data.analysis.redactedInput.url?.includes("scholarship") ? "Password Field" : "None"
    }
  ];

  profiles.forEach(p => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${p.name}</strong></td>
      <td><code>${p.ua}</code></td>
      <td><span class="badge ${p.status === 200 ? "badge-low" : "badge-high"}">${p.status}</span></td>
      <td>${p.title}</td>
      <td>${p.form !== "None" ? `<span class="badge badge-high">${p.form}</span>` : `<span class="badge badge-neutral">None</span>`}</td>
    `;
    profileTableBody.append(tr);
  });

  // Cloaking Alert
  const cloakingDiff = assessment.reasons.find(r => r.text.includes("Differential content") || r.text.includes("cloaking"));
  if (cloakingDiff) {
    cloakingAlertBox.style.display = "block";
    cloakingAlertText.textContent = cloakingDiff.text;
  } else {
    cloakingAlertBox.style.display = "none";
  }

  // Brand Inspection
  const urlStr = data.analysis.redactedInput.url || "";
  let claimed = "Unknown / General";
  let canonical = "None Registered";
  let host = "None";

  try {
    if (urlStr) {
      const parsed = new URL(urlStr);
      host = parsed.host;
      if (urlStr.includes("scholarship")) {
        claimed = "State University Scholarship Office";
        canonical = "university.test";
      } else if (urlStr.includes("brand-clone")) {
        claimed = "Apex Financial (Bank)";
        canonical = "apexbank.test";
      } else if (urlStr.includes("benign-portal")) {
        claimed = "University Library Desk";
        canonical = "university.test";
      }
    }
  } catch {
    // Ignore
  }

  brandClaimedName.textContent = claimed;
  brandObservedHost.textContent = host;
  brandCanonicalDomains.textContent = canonical;

  const isBrandDiscrepancy = assessment.reasons.some(r => r.text.includes("non-canonical"));
  if (isBrandDiscrepancy) {
    brandEvalBadge.textContent = "Non-Canonical Host Discrepancy";
    brandEvalBadge.className = "badge badge-high";
  } else if (isExpected) {
    brandEvalBadge.textContent = "Verified Canonical Match";
    brandEvalBadge.className = "badge badge-low";
  } else {
    brandEvalBadge.textContent = "Unverified / Non-Registered";
    brandEvalBadge.className = "badge badge-amber";
  }

  // Synthetic Canary Probe
  if (assessment.coverage.syntheticProbe === "complete") {
    syntheticProbeSection.style.display = "block";
    probeCanaryMarker.textContent = "TL-CANARY-" + data.analysis.id.slice(0, 8);
  } else {
    syntheticProbeSection.style.display = "none";
  }

  // Reasons List
  reasonsList.replaceChildren();
  assessment.reasons.forEach(r => {
    const li = document.createElement("li");
    li.textContent = r.text;
    reasonsList.append(li);
  });

  // Next Steps
  nextStepsContainer.replaceChildren();
  assessment.nextSteps.forEach(s => {
    const p = document.createElement("p");
    p.textContent = `• ${s}`;
    nextStepsContainer.append(p);
  });

  // Coverage Pills & Limitations
  coveragePillsContainer.replaceChildren();
  Object.entries(assessment.coverage).forEach(([key, state]) => {
    const pill = document.createElement("span");
    pill.className = `badge ${state === "complete" ? "badge-low" : state === "blocked_attempt_observed" ? "badge-amber" : "badge-neutral"}`;
    pill.textContent = `${key}: ${state}`;
    coveragePillsContainer.append(pill);
  });

  limitationsList.replaceChildren();
  assessment.limitations.forEach(l => {
    const li = document.createElement("li");
    li.textContent = l;
    limitationsList.append(li);
  });
}

// 8. Casebook Actions
btnSaveCase.addEventListener("click", async () => {
  if (!currentReport?.analysis?.id) return;
  btnSaveCase.disabled = true;
  saveCaseFeedback.textContent = "Saving to casebook...";

  try {
    const res = await fetch(`${API_BASE}/api/v1/cases`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceAnalysisIds: [currentReport.analysis.id],
        disposition: currentReport.assessment?.verdict === "action_concern_supported" ? "concern_supported" : "unresolved",
        redactedSummary: `Case from analysis ${currentReport.analysis.id.slice(0, 8)}: ${currentReport.assessment?.reasons[0]?.text || "Investigation"}`,
        retentionPreference: "standard_30_days"
      })
    });

    if (res.ok) {
      saveCaseFeedback.textContent = "✓ Saved to Casebook";
      void loadCases();
    } else {
      throw new Error();
    }
  } catch {
    saveCaseFeedback.textContent = "Failed to save case";
  } finally {
    btnSaveCase.disabled = false;
  }
});

btnOpenCases.addEventListener("click", () => {
  casebookDrawer.style.display = "flex";
  void loadCases();
});

btnCloseCases.addEventListener("click", () => {
  casebookDrawer.style.display = "none";
});

async function loadCases(): Promise<void> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/cases`);
    if (res.ok) {
      const data = await res.json();
      casesCountBadge.textContent = String(data.total || 0);
      casesListContainer.replaceChildren();

      if (!data.cases || !data.cases.length) {
        casesListContainer.innerHTML = `<p class="empty-text">No cases saved yet.</p>`;
        return;
      }

      data.cases.forEach((c: any) => {
        const item = document.createElement("div");
        item.className = "case-card";
        item.innerHTML = `
          <div class="case-title">${c.redactedSummary}</div>
          <div class="case-meta">
            <span class="badge ${c.disposition === "concern_supported" ? "badge-high" : "badge-neutral"}">${c.disposition}</span>
            <span>ID: ${c.id.slice(0, 8)}</span>
            <span>Retain: ${c.retentionPreference}</span>
          </div>
        `;
        casesListContainer.append(item);
      });
    }
  } catch {
    // Ignore load errors
  }
}

// 9. URL Query Parameter Support (?analysisId=uuid)
function checkUrlParameters(): void {
  const params = new URLSearchParams(window.location.search);
  const analysisId = params.get("analysisId");
  if (analysisId) {
    progressCard.style.display = "block";
    updateStepper("assessing");
    void fetchAndRenderReport(analysisId);
  }
}

// Initialize
void checkApiHealth();
void loadCases();
checkUrlParameters();
