import { findAdapterForUrl } from "./adapters/index.js";
import { getSettings } from "./storage/settings.js";
import { ExtensionMessage } from "./types.js";

declare global {
  interface Window { __threatLensContentInitialized?: boolean }
}

async function initContentScript(): Promise<void> {
  if (window.__threatLensContentInitialized) return;
  const adapter = findAdapterForUrl(window.location.href);
  if (!adapter) return;
  window.__threatLensContentInitialized = true;

  const scan = async (): Promise<{ success: boolean; messages: ReturnType<typeof adapter.extractVisibleMessages> }> => {
    const settings = await getSettings();
    const enabled = settings.consentGranted && settings.scanningEnabled && settings.enabledSites[adapter.id] === true;
    if (!enabled) return { success: false, messages: [] };
    const messages = adapter.extractVisibleMessages(document);
    chrome.runtime.sendMessage({
      type: "SCAN_RESULTS",
      messages,
      siteAdapter: adapter.id,
      pageUrl: location.origin + location.pathname
    } satisfies ExtensionMessage).catch(() => undefined);
    return { success: true, messages };
  };

  chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
    if (message.type === "SCAN_VISIBLE_MESSAGES") {
      scan().then(sendResponse).catch(() => sendResponse({ success: false, messages: [] }));
      return true;
    }
    if (message.type === "HIGHLIGHT_MESSAGE") {
      adapter.highlightMessage?.(document, message.messageId, message.highlight);
      sendResponse({ success: true });
    }
    if (message.type === "GET_SCAN_STATUS") {
      getSettings().then(settings => sendResponse({
        adapterId: adapter.id,
        adapterName: adapter.name,
        consentGranted: settings.consentGranted,
        scanningEnabled: settings.scanningEnabled,
        siteEnabled: settings.enabledSites[adapter.id] === true,
        pageUrl: location.origin + location.pathname
      }));
      return true;
    }
  });

  let timer: ReturnType<typeof setTimeout> | undefined;
  const observer = new MutationObserver(() => {
    void getSettings().then(settings => {
      if (!settings.consentGranted || !settings.scanningEnabled || settings.enabledSites[adapter.id] !== true) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { void scan(); }, 500);
    });
  });
  if (document.body) observer.observe(document.body, { childList: true, subtree: true, characterData: true });
}

void initContentScript();
