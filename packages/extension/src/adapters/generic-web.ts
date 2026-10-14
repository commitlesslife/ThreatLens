import { ExtractedMessage } from "../types.js";
import { quickScanVisibleText } from "../scanner/quick-scanner.js";

/**
 * Universal Page Adapter for arbitrary web pages.
 * Inspects visible sections, articles, cards, dialogs, forms, and message-like blocks.
 */
export const GENERIC_WEB_ADAPTER = {
  id: "generic-web",
  name: "Universal Page Scanner",
  verified: true,

  canHandle(url: string): boolean {
    try {
      const parsed = new URL(url);
      return ["http:", "https:"].includes(parsed.protocol) && !parsed.hostname.includes("chrome.google.com");
    } catch {
      return false;
    }
  },

  extractVisibleMessages(doc: Document): ExtractedMessage[] {
    const results: ExtractedMessage[] = [];
    const seenTexts = new Set<string>();

    // Candidate message/card selectors on general websites
    const selectors = [
      "article",
      "main",
      "[role='article']",
      "[role='alert']",
      "[role='status']",
      ".card",
      ".notice",
      ".alert",
      ".message",
      ".post",
      ".comment",
      "form",
      ".inbox-item",
      ".chat-item",
      "p"
    ];

    const candidates = doc.querySelectorAll<HTMLElement>(selectors.join(", "));

    candidates.forEach((el, index) => {
      // Must be visible
      if (el.offsetParent === null && el.style.display === "none") return;

      const visibleText = (el.innerText || el.textContent || "").trim();
      // Only process meaningful text blocks between 20 and 2000 chars
      if (visibleText.length < 20 || visibleText.length > 2000) return;
      if (seenTexts.has(visibleText)) return;

      // Extract all candidate links inside or nearby
      const extractedUrls: string[] = [];
      el.querySelectorAll<HTMLAnchorElement>("a").forEach(a => {
        if (a.href && (a.href.startsWith("http://") || a.href.startsWith("https://"))) {
          extractedUrls.push(a.href);
        }
      });

      // If this element contains suspicious patterns or links, scan it
      const { result, relevantExcerpt } = quickScanVisibleText(visibleText, extractedUrls);

      // Only include if it has candidate links or triggered a concern/inconclusive verdict
      if (extractedUrls.length > 0 || result.verdict !== "benign") {
        seenTexts.add(visibleText);
        const id = el.id || `generic-msg-${index}-${Date.now().toString(36)}`;
        el.setAttribute("data-threatlens-id", id);

        results.push({
          id,
          sourceAdapter: "generic-web",
          sender: el.querySelector("header, h1, h2, h3, h4, strong, .sender")?.textContent?.trim() || "Visible Page Content",
          subject: (doc.title || "Page Scan").slice(0, 60),
          visibleText,
          relevantExcerpt,
          detectedUrls: extractedUrls,
          quickScanResult: result
        });
      }
    });

    // If no individual cards were found but the page has links, scan the primary content area
    if (results.length === 0 && doc.body) {
      const pageText = (doc.body.innerText || "").slice(0, 1500).trim();
      const allUrls: string[] = [];
      doc.querySelectorAll<HTMLAnchorElement>("a").forEach(a => {
        if (a.href && (a.href.startsWith("http://") || a.href.startsWith("https://"))) {
          allUrls.push(a.href);
        }
      });

      if (allUrls.length > 0 || pageText.length > 30) {
        const { result, relevantExcerpt } = quickScanVisibleText(pageText, allUrls);
        results.push({
          id: `page-root-${Date.now().toString(36)}`,
          sourceAdapter: "generic-web",
          sender: "Active Webpage",
          subject: (doc.title || "Page Overview").slice(0, 60),
          visibleText: pageText,
          relevantExcerpt: relevantExcerpt || pageText.slice(0, 200),
          detectedUrls: allUrls,
          quickScanResult: result
        });
      }
    }

    return results.slice(0, 10);
  },

  highlightMessage(doc: Document, messageId: string, highlight: boolean): void {
    const el = doc.querySelector<HTMLElement>(`[data-threatlens-id='${messageId}'], #${messageId}`);
    if (!el) return;

    if (highlight) {
      el.style.outline = "3px solid #ef4444";
      el.style.backgroundColor = "rgba(254, 226, 226, 0.4)";
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      el.style.outline = "";
      el.style.backgroundColor = "";
    }
  }
};
