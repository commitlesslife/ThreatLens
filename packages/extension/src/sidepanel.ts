import { getSettings, grantConsent, revokeConsent, toggleScanning, updateSettings } from "./storage/settings.js";
import { ExtractedMessage, ExtensionMessage, ExtensionSettings } from "./types.js";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const viewConsent = $("view-consent");
const viewActive = $("view-active");
const viewSettings = $("view-settings");
const btnGrantConsent = $("btn-grant-consent") as HTMLButtonElement;
const btnTogglePause = $("btn-toggle-pause") as HTMLButtonElement;
const pauseStatusIndicator = $("pause-status-indicator");
const btnOpenSettings = $("btn-open-settings") as HTMLButtonElement;
const btnCloseSettings = $("btn-close-settings") as HTMLButtonElement;
const btnRevokeConsent = $("btn-revoke-consent") as HTMLButtonElement;
const btnRefreshScan = $("btn-refresh-scan") as HTMLButtonElement;
const siteAdapterBadge = $("site-adapter-badge");
const messagesContainer = $("messages-container");
const investigationCard = $("investigation-status-card");
const invStatusPill = $("inv-status-pill");
const invMessageText = $("inv-message-text");
const invId = $("inv-id");
const btnOpenWebReport = $("btn-open-web-report") as HTMLButtonElement;
const btnDismissInv = $("btn-dismiss-inv") as HTMLButtonElement;
const toggleScanningActive = $("toggle-scanning-active") as HTMLInputElement;
const siteToggles: Record<string, HTMLInputElement> = {
  "synthetic-fixture": $("toggle-adapter-synthetic") as HTMLInputElement,
  "gmail-web": $("toggle-adapter-gmail") as HTMLInputElement,
  "whatsapp-web": $("toggle-adapter-whatsapp") as HTMLInputElement
};

const SITE_ACCESS: Record<string, { origins: string[]; matches: string[]; name: string }> = {
  "synthetic-fixture": {
    name: "Synthetic ThreatLens Lab",
    origins: ["http://localhost:4001/*", "http://127.0.0.1:4001/*"],
    matches: ["http://localhost:4001/fixtures/*", "http://127.0.0.1:4001/fixtures/*"]
  },
  "gmail-web": { name: "Gmail Web", origins: ["https://mail.google.com/*"], matches: ["https://mail.google.com/*"] },
  "whatsapp-web": { name: "WhatsApp Web", origins: ["https://web.whatsapp.com/*"], matches: ["https://web.whatsapp.com/*"] }
};
let currentSettings: ExtensionSettings;
let lastMessages: ExtractedMessage[] = [];

async function refreshView(scan = true): Promise<void> {
  currentSettings = await getSettings();
  const hasConsent = currentSettings.consentGranted;
  viewConsent.style.display = hasConsent ? "none" : "block";
  viewActive.style.display = hasConsent ? "block" : "none";
  if (!hasConsent) {
    viewSettings.style.display = "none";
    btnTogglePause.style.display = "none";
    messagesContainer.replaceChildren();
    return;
  }
  btnTogglePause.style.display = "inline-block";
  pauseStatusIndicator.textContent = currentSettings.scanningEnabled ? "Active" : "Paused";
  pauseStatusIndicator.className = `status-pill ${currentSettings.scanningEnabled ? "active" : "paused"}`;
  toggleScanningActive.checked = currentSettings.scanningEnabled;
  for (const [id, toggle] of Object.entries(siteToggles)) toggle.checked = currentSettings.enabledSites[id] === true;
  if (scan && currentSettings.scanningEnabled) await requestTabScan();
}

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function requestTabScan(): Promise<void> {
  const tab = await activeTab();
  if (!tab?.id) return showEmpty("No active browser tab is available.");
  chrome.tabs.sendMessage(tab.id, { type: "SCAN_VISIBLE_MESSAGES" } satisfies ExtensionMessage, response => {
    if (chrome.runtime.lastError || !response?.success) {
      const host = (() => { try { return new URL(tab.url || "").hostname; } catch { return ""; } })();
      siteAdapterBadge.textContent = "Site access needed or unsupported";
      showEmpty(host ? `ThreatLens is not enabled for ${host}. Enable a supported site in Settings first.` : "This page cannot be scanned.");
      return;
    }
    renderMessages(response.messages || [], response.siteAdapter || "enabled site");
  });
}

function showEmpty(text: string): void {
  messagesContainer.replaceChildren();
  const empty = document.createElement("div");
  empty.className = "empty-state";
  const p = document.createElement("p"); p.textContent = text;
  empty.append(p); messagesContainer.append(empty);
}

function renderMessages(messages: ExtractedMessage[], adapter: string): void {
  lastMessages = messages;
  siteAdapterBadge.textContent = `On-device scan · ${adapter}`;
  messagesContainer.replaceChildren();
  if (!messages.length) return showEmpty("No visible messages were detected. Open a message or chat that is currently visible.");
  for (const msg of messages) {
    const card = document.createElement("article");
    card.className = `message-card ${msg.quickScanResult.verdict}`;
    const heading = document.createElement("div"); heading.className = "msg-header";
    const sender = document.createElement("span"); sender.className = "msg-sender"; sender.textContent = msg.sender || msg.subject || "Visible message";
    const verdict = document.createElement("span"); verdict.className = `verdict-tag ${msg.quickScanResult.verdict === "concerning" ? "concerning-red" : msg.quickScanResult.verdict}`;
    verdict.textContent = msg.quickScanResult.verdict === "concerning" ? "Review this message" : msg.quickScanResult.verdict === "inconclusive" ? "Needs a closer look" : "No concern detected";
    heading.append(sender, verdict); card.append(heading);
    for (const reason of msg.quickScanResult.reasons.slice(0, 3)) {
      const p = document.createElement("p"); p.className = "msg-reasons"; p.textContent = reason; card.append(p);
    }
    if (msg.quickScanResult.candidateLink) {
      const link = document.createElement("div"); link.className = "msg-link-box";
      try { link.textContent = new URL(msg.quickScanResult.candidateLink).host; } catch { link.textContent = "Unparseable destination"; }
      card.append(link);
    }
    const actions = document.createElement("div"); actions.className = "msg-actions";
    const highlight = document.createElement("button"); highlight.className = "btn-highlight"; highlight.textContent = "Show message";
    highlight.addEventListener("click", async () => {
      const tab = await activeTab(); if (tab?.id) chrome.tabs.sendMessage(tab.id, { type: "HIGHLIGHT_MESSAGE", messageId: msg.id, highlight: true } satisfies ExtensionMessage);
    }); actions.append(highlight);
    if (msg.quickScanResult.verdict !== "benign" && msg.quickScanResult.candidateLink) {
      const investigate = document.createElement("button"); investigate.className = "btn-investigate"; investigate.textContent = "Investigate link";
      investigate.addEventListener("click", () => void startInvestigation(msg)); actions.append(investigate);
    }
    card.append(actions); messagesContainer.append(card);
  }
}

async function startInvestigation(msg: ExtractedMessage): Promise<void> {
  const url = msg.quickScanResult.candidateLink;
  if (!url) return;
  investigationCard.style.display = "block";
  invStatusPill.textContent = "Submitting"; invStatusPill.className = "status-pill paused";
  invMessageText.textContent = "Sending only this message excerpt and its selected link to ThreatLens.";
  invId.textContent = "";
  chrome.runtime.sendMessage({ type: "START_INVESTIGATION", messageId: msg.id, excerpt: msg.relevantExcerpt, url, adapter: msg.sourceAdapter } satisfies ExtensionMessage, response => {
    if (chrome.runtime.lastError || !response?.success) {
      invStatusPill.textContent = "Could not start";
      invMessageText.textContent = response?.error || "Could not reach the local ThreatLens API. Start the API service and try again.";
      return;
    }
    invId.textContent = response.analysisId;
    void pollAnalysis(response.analysisId);
  });
}

async function pollAnalysis(id: string): Promise<void> {
  const terminal = ["completed", "partial", "failed", "cancelled"];
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      currentSettings = await getSettings();
      const response = await fetch(`${currentSettings.apiBaseUrl}/api/v1/analyses/${encodeURIComponent(id)}`);
      if (!response.ok) throw new Error("The report could not be loaded.");
      const body = await response.json();
      const analysis = body.analysis;
      const assessment = body.assessment;
      invStatusPill.textContent = assessment?.verdict?.replaceAll("_", " ") || analysis.status;
      invStatusPill.className = `status-pill ${assessment?.severity?.band === "high" || assessment?.severity?.band === "critical" ? "paused" : "active"}`;
      if (assessment) {
        const reason = assessment.reasons?.[0]?.text || "Analysis completed with the coverage shown in the report.";
        invMessageText.textContent = `${reason} ${assessment.limitations?.[0] || ""}`.trim();
        btnOpenWebReport.style.display = "block";
        btnOpenWebReport.onclick = () => {
          chrome.tabs.create({ url: `http://localhost:3000/?analysisId=${encodeURIComponent(id)}` });
        };
        if (terminal.includes(analysis.status)) return;
      } else if (terminal.includes(analysis.status)) {
        invMessageText.textContent = analysis.status === "partial" ? "Investigation ended with incomplete coverage. Treat this result as inconclusive." : `Investigation ${analysis.status}.`;
        btnOpenWebReport.style.display = "block";
        btnOpenWebReport.onclick = () => {
          chrome.tabs.create({ url: `http://localhost:3000/?analysisId=${encodeURIComponent(id)}` });
        };
        return;
      }
    } catch (error) {
      invMessageText.textContent = error instanceof Error ? error.message : "Waiting for report…";
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  invStatusPill.textContent = "Still running";
  invMessageText.textContent = "The report is taking longer than expected. Its analysis ID is available above.";
}

async function registerSiteScript(siteId: string): Promise<void> {
  const config = SITE_ACCESS[siteId];
  await chrome.scripting.unregisterContentScripts({ ids: [siteId] }).catch(() => undefined);
  await chrome.scripting.registerContentScripts([{ id: siteId, matches: config.matches, js: ["dist/content.js"], runAt: "document_idle", persistAcrossSessions: true }]);
  const tab = await activeTab();
  if (tab?.id && config.matches.some(pattern => {
    const prefix = pattern.replace("/*", ""); return tab.url?.startsWith(prefix);
  })) await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["dist/content.js"] }).catch(() => undefined);
}

async function setSiteEnabled(siteId: string, enabled: boolean): Promise<void> {
  const config = SITE_ACCESS[siteId]; if (!config) return;
  if (enabled) {
    if (!currentSettings.consentGranted) { siteToggles[siteId].checked = false; return; }
    const granted = await chrome.permissions.request({ origins: config.origins });
    if (!granted) { siteToggles[siteId].checked = false; siteAdapterBadge.textContent = `${config.name} access was not granted`; return; }
    await updateSettings({ enabledSites: { ...currentSettings.enabledSites, [siteId]: true } });
    await registerSiteScript(siteId);
  } else {
    await chrome.scripting.unregisterContentScripts({ ids: [siteId] }).catch(() => undefined);
    await chrome.permissions.remove({ origins: config.origins });
    await updateSettings({ enabledSites: { ...currentSettings.enabledSites, [siteId]: false } });
  }
  await refreshView();
}

async function revokeEverything(): Promise<void> {
  await revokeConsent();
  await chrome.scripting.unregisterContentScripts().catch(() => undefined);
  await chrome.permissions.remove({ origins: Object.values(SITE_ACCESS).flatMap(site => site.origins) });
  lastMessages = [];
  investigationCard.style.display = "none";
  await refreshView(false);
}

btnGrantConsent.addEventListener("click", async () => { await grantConsent(); await refreshView(false); });
btnTogglePause.addEventListener("click", async () => { await toggleScanning(); await refreshView(); });
btnOpenSettings.addEventListener("click", () => { viewConsent.style.display = "none"; viewActive.style.display = "none"; viewSettings.style.display = "block"; });
btnCloseSettings.addEventListener("click", async () => { viewSettings.style.display = "none"; await refreshView(); });
btnRevokeConsent.addEventListener("click", () => void revokeEverything());
btnRefreshScan.addEventListener("click", () => void requestTabScan());
btnDismissInv.addEventListener("click", () => {
  investigationCard.style.display = "none";
  btnOpenWebReport.style.display = "none";
});
toggleScanningActive.addEventListener("change", async () => { await updateSettings({ scanningEnabled: toggleScanningActive.checked }); await refreshView(); });
for (const [siteId, toggle] of Object.entries(siteToggles)) toggle.addEventListener("change", () => void setSiteEnabled(siteId, toggle.checked));

chrome.runtime.onMessage.addListener((message: ExtensionMessage) => {
  if (message.type === "DISPLAY_SCAN_RESULTS") renderMessages(message.messages, message.siteAdapter);
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.threatlens_settings) void refreshView(false);
});

void refreshView();
