export type QuickScanVerdict = "concerning" | "benign" | "inconclusive";

export interface QuickScanResult {
  verdict: QuickScanVerdict;
  confidence: "high" | "medium" | "low";
  indicators: string[];
  reasons: string[];
  candidateLink: string | null;
  recommendedNextStep: string;
}

export interface ExtractedMessage {
  id: string;
  sourceAdapter: string;
  sender?: string;
  subject?: string;
  timestamp?: string;
  visibleText: string;
  extractedUrls: string[];
  relevantExcerpt: string;
  quickScanResult: QuickScanResult;
}

export interface ExtensionSettings {
  consentGranted: boolean;
  consentVersion: string;
  scanningEnabled: boolean;
  enabledSites: {
    "synthetic-fixture": boolean;
    "gmail-web": boolean;
    "whatsapp-web": boolean;
    [siteId: string]: boolean;
  };
  apiBaseUrl: string;
}

export type ExtensionMessage =
  | { type: "GET_SCAN_STATUS" }
  | { type: "SCAN_VISIBLE_MESSAGES"; force?: boolean }
  | { type: "SCAN_RESULTS"; messages: ExtractedMessage[]; siteAdapter: string; pageUrl: string }
  | { type: "DISPLAY_SCAN_RESULTS"; messages: ExtractedMessage[]; siteAdapter: string; pageUrl: string }
  | { type: "HIGHLIGHT_MESSAGE"; messageId: string; highlight: boolean }
  | { type: "START_INVESTIGATION"; messageId: string; excerpt: string; url: string; adapter: string }
  | { type: "INVESTIGATION_RESULT"; messageId: string; analysisId: string; verdict: string; status: string }
  | { type: "UPDATE_SETTINGS"; settings: Partial<ExtensionSettings> }
  | { type: "REVOKE_CONSENT" };
