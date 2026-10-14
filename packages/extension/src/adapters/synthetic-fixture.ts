import { ExtractedMessage } from "../types.js";
import { quickScanVisibleText } from "../scanner/quick-scanner.js";

export const SYNTHETIC_FIXTURE_ADAPTER = {
  id: "synthetic-fixture",
  name: "ThreatLens Synthetic Lab Fixture",
  verified: true, // Fully verified against team-owned local fixtures

  canHandle(url: string): boolean {
    return (
      url.includes("/fixtures/synthetic-inbox") ||
      url.includes("/fixtures/synthetic-chat") ||
      url.includes("fixture.threatlens.test/fixtures/")
    );
  },

  extractVisibleMessages(doc: Document): ExtractedMessage[] {
    const results: ExtractedMessage[] = [];

    // Check if on synthetic-inbox
    const inboxItems = doc.querySelectorAll<HTMLElement>(".message-item");
    if (inboxItems.length > 0) {
      inboxItems.forEach(item => {
        // Read ONLY visible message container
        if (item.offsetParent === null && item.style.display === "none") return;

        const id = item.getAttribute("data-message-id") || item.id || `msg-${Math.random()}`;
        const sender = item.getAttribute("data-sender") || item.querySelector(".message-meta")?.textContent || "";
        const subject = item.querySelector(".message-subject")?.textContent || "";
        const bodyEl = item.querySelector(".message-body");
        const visibleText = `${subject} ${bodyEl?.textContent || ""}`.trim();

        const extractedUrls: string[] = [];
        bodyEl?.querySelectorAll<HTMLAnchorElement>("a").forEach(a => {
          if (a.href) extractedUrls.push(a.href);
        });

        const { result, relevantExcerpt } = quickScanVisibleText(visibleText, extractedUrls);

        results.push({
          id,
          sourceAdapter: "synthetic-fixture",
          sender: sender.trim(),
          subject: subject.trim(),
          visibleText,
          extractedUrls,
          relevantExcerpt,
          quickScanResult: result
        });
      });
      return results;
    }

    // Check if on synthetic-chat
    const chatBubbles = doc.querySelectorAll<HTMLElement>(".chat-bubble");
    if (chatBubbles.length > 0) {
      chatBubbles.forEach(bubble => {
        if (bubble.offsetParent === null && bubble.style.display === "none") return;

        const id = bubble.getAttribute("data-message-id") || bubble.id || `chat-${Math.random()}`;
        const sender = bubble.getAttribute("data-sender") || bubble.querySelector(".bubble-sender")?.textContent || "";
        const textEl = bubble.querySelector(".bubble-text") || bubble;
        const visibleText = textEl.textContent || "";

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
          sourceAdapter: "synthetic-fixture",
          sender: sender.trim(),
          visibleText: visibleText.trim(),
          extractedUrls,
          relevantExcerpt,
          quickScanResult: result
        });
      });
    }

    return results;
  },

  highlightMessage(doc: Document, messageId: string, highlight: boolean): void {
    const el = doc.getElementById(messageId) || doc.querySelector(`[data-message-id="${messageId}"]`);
    if (el) {
      if (highlight) {
        el.classList.add("threatlens-highlight");
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        el.classList.remove("threatlens-highlight");
      }
    }
  }
};
