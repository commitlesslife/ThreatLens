import { getSettings } from "./storage/settings.js";
import { ExtensionMessage } from "./types.js";

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => undefined);

chrome.runtime.onInstalled.addListener(async () => {
  await getSettings();
});

chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
  if (message.type === "SCAN_RESULTS") {
    chrome.runtime.sendMessage({ ...message, type: "DISPLAY_SCAN_RESULTS" } satisfies ExtensionMessage).catch(() => undefined);
    return;
  }

  if (message.type !== "START_INVESTIGATION") return;
  void (async () => {
    try {
      const settings = await getSettings();
      if (!settings.consentGranted) throw new Error("Enable ThreatLens privacy consent before sending a message for analysis.");
      const target = new URL(message.url);
      if (!["http:", "https:"].includes(target.protocol)) throw new Error("Only HTTP and HTTPS destinations can be investigated.");
      const excerpt = message.excerpt.trim().slice(0, 1200);
      if (!excerpt) throw new Error("No relevant message excerpt was selected.");

      const response = await fetch(`${settings.apiBaseUrl}/api/v1/analyses`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Tenant-Id": "tenant-extension-local" },
        body: JSON.stringify({
          input: { url: target.href, message: excerpt },
          requestedMode: "passive",
          sourceClient: "extension",
          sourceSiteAdapter: message.adapter,
          consentVersion: settings.consentVersion
        })
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error?.message || `API request failed (${response.status}).`);
      sendResponse({ success: true, analysisId: body.analysisId, status: body.status });
    } catch (error) {
      sendResponse({ success: false, error: error instanceof Error ? error.message : "ThreatLens API request failed." });
    }
  })();
  return true;
});
