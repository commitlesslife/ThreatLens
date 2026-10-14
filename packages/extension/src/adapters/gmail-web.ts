import { ExtractedMessage } from "../types.js";
import { quickScanVisibleText } from "../scanner/quick-scanner.js";

/**
 * Modular site adapter for Gmail Web (mail.google.com).
 * STATUS: Prototype adapter. Verified against Gmail-like synthetic DOM structures;
 * unverified against live authenticated Google user sessions.
 */
export const GMAIL_WEB_ADAPTER = {
  id: "gmail-web",
  name: "Gmail Web (Modular Prototype)",
  verified: false, // Live external site requiring user authentication - unverified

  canHandle(url: string): boolean {
    return url.startsWith("https://mail.google.com");
  },

  extractVisibleMessages(doc: Document): ExtractedMessage[] {
    const results: ExtractedMessage[] = [];

    // Gmail Web message containers in active reading pane
    const messageContainers = doc.querySelectorAll<HTMLElement>("div[role='main'] div[data-message-id], div.adn.ads");

    messageContainers.forEach(container => {
      // Must be visible
      if (container.offsetParent === null && container.style.display === "none") return;

      const id = container.getAttribute("data-message-id") || container.getAttribute("data-legacy-message-id") || `gmail-${Math.random()}`;
      const senderEl = container.querySelector(".gD, [email]");
      const sender = senderEl?.getAttribute("email") || senderEl?.textContent || "";
      const subjectEl = doc.querySelector("h2.hP");
      const subject = subjectEl?.textContent || "";

      // Message body
      const bodyEl = container.querySelector(".ii.gt, .a3s.aiL");
      const bodyText = bodyEl?.textContent || "";
      const visibleText = `${subject} ${bodyText}`.trim();

      const extractedUrls: string[] = [];
      bodyEl?.querySelectorAll<HTMLAnchorElement>("a").forEach(a => {
        if (a.href && !a.href.startsWith("mailto:")) {
          extractedUrls.push(a.href);
        }
      });

      const { result, relevantExcerpt } = quickScanVisibleText(visibleText, extractedUrls);

      results.push({
        id,
        sourceAdapter: "gmail-web",
        sender: sender.trim(),
        subject: subject.trim(),
        visibleText,
        extractedUrls,
        relevantExcerpt,
        quickScanResult: result
      });
    });

    return results;
  },

  highlightMessage(doc: Document, messageId: string, highlight: boolean): void {
    const el = doc.querySelector(`[data-message-id="${messageId}"]`) as HTMLElement;
    if (el) {
      if (highlight) {
        el.style.outline = "3px solid #ef4444";
        el.style.backgroundColor = "#fff1f2";
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        el.style.outline = "";
        el.style.backgroundColor = "";
      }
    }
  }
};
