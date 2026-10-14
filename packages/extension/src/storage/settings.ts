import { ExtensionSettings } from "../types.js";

export const DEFAULT_SETTINGS: ExtensionSettings = {
  consentGranted: false, // Affirmative user grant required before reading page content
  consentVersion: "v1.0",
  scanningEnabled: true, // Active once consent is granted; can be paused
  enabledSites: {
    "synthetic-fixture": true,
    "gmail-web": false,
    "whatsapp-web": false
  },
  apiBaseUrl: "http://localhost:3001"
};

const STORAGE_KEY = "threatlens_settings";

/**
 * Retrieves the current extension settings from chrome.storage.local
 */
export async function getSettings(): Promise<ExtensionSettings> {
  if (typeof chrome !== "undefined" && chrome.storage?.local) {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    if (result && result[STORAGE_KEY]) {
      const stored = result[STORAGE_KEY] as Partial<ExtensionSettings>;
      return {
        ...DEFAULT_SETTINGS,
        ...stored,
        enabledSites: { ...DEFAULT_SETTINGS.enabledSites, ...(stored.enabledSites || {}) }
      };
    }
  }
  return { ...DEFAULT_SETTINGS };
}

/**
 * Updates extension settings in chrome.storage.local
 */
export async function updateSettings(partial: Partial<ExtensionSettings>): Promise<ExtensionSettings> {
  const current = await getSettings();
  const updated: ExtensionSettings = {
    ...current,
    ...partial,
    enabledSites: {
      ...current.enabledSites,
      ...(partial.enabledSites || {})
    }
  };

  if (typeof chrome !== "undefined" && chrome.storage?.local) {
    await chrome.storage.local.set({ [STORAGE_KEY]: updated });
  }

  return updated;
}

/**
 * Grants affirmative user consent for in-context visible message analysis.
 */
export async function grantConsent(): Promise<ExtensionSettings> {
  return updateSettings({
    consentGranted: true,
    scanningEnabled: true
  });
}

/**
 * Immediately revokes user consent and disables scanning across all sites.
 */
export async function revokeConsent(): Promise<ExtensionSettings> {
  return updateSettings({
    consentGranted: false,
    scanningEnabled: false,
    enabledSites: {
      "synthetic-fixture": false,
      "gmail-web": false,
      "whatsapp-web": false
    }
  });
}

/**
 * Toggles pause/active scanning state.
 */
export async function toggleScanning(): Promise<boolean> {
  const current = await getSettings();
  const newState = !current.scanningEnabled;
  await updateSettings({ scanningEnabled: newState });
  return newState;
}
