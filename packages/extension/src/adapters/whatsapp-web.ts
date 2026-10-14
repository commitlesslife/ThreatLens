import { ExtractedMessage } from "../types.js";
import { quickScanVisibleText } from "../scanner/quick-scanner.js";

/**
 * Modular site adapter for WhatsApp Web (web.whatsapp.com).
 * STATUS: Prototype adapter. Verified against synthetic chat structures;
 * unverified against live WhatsApp QR authenticated sessions.
 */
export const WHATSAPP_WEB_ADAPTER = {
  id: "whatsapp-web",
  name: "WhatsApp Web (Modular Prototype)",
  verified: false, // Live external site requiring QR session - unverified

  canHandle(url: string): boolean {
    return url.startsWith("https://web.whatsapp.com");
  },

  extractVisibleMessages(doc: Document): ExtractedMessage[] {
    const results: ExtractedMessage[] = [];

    // WhatsApp Web incoming message containers
    const bubbles = doc.querySelectorAll<HTMLElement>("div[data-testid='msg-container'], div.message-in");

    bubbles.forEach(bubble => {
      if (bubble.offsetParent === null && bubble.style.display === "none") return;

      const id = bubble.getAttribute("data-id") || `wa-${Math.random()}`;
      const textEl = bubble.querySelector(".selectable-text, span._ao3e, span.copyable-text");
      const visibleText = textEl?.textContent || "";

      const extractedUrls: string[] = [];
      bubble.querySelectorAll<HTMLAnchorElement>("a").forEach(a => {
        if (a.href) extractedUrls.push(a.href);
      });

      // Also check plain-text URLs in chat bubbles
      const urlRegex = /https?:\/\/[^\s]+/g;
      let match;
      while ((match = urlRegex.exec(visibleText)) !== null) {
        if (!extractedUrls.includes(match[0])) {
          extractedUrls.push(match[0]);
        }
      }

      const { result, relevantExcerpt } = quickScanVisibleText(visibleText, extractedUrls);

      results.push({
        id,
        sourceAdapter: "whatsapp-web",
        visibleText: visibleText.trim(),
        extractedUrls,
        relevantExcerpt,
        quickScanResult: result
      });
    });

    return results;
  },

  highlightMessage(doc: Document, messageId: string, highlight: boolean): void {
    const el = doc.querySelector(`[data-id="${messageId}"]`) as HTMLElement;
    if (el) {
      if (highlight) {
        el.style.outline = "3px solid #ef4444";
        el.style.backgroundColor = "#fee2e2";
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        el.style.outline = "";
        el.style.backgroundColor = "";
      }
    }
  }
};
