import { QuickScanResult } from "../types.js";

const URGENCY_PATTERNS = [
  /\burgent\b/i,
  /\bimmediate(?:ly)?\b/i,
  /\baction required\b/i,
  /\baccount (?:flagged|suspended|terminated)\b/i,
  /\bprevent (?:revocation|cancellation)\b/i,
  /\bwithin \d+ (?:hours?|minutes?)\b/i,
  /\bsecurity alert\b/i
];

const CREDENTIAL_PATTERNS = [
  /\b(?:re-)?verify (?:your )?(?:account|credentials|password|identity)\b/i,
  /\bcampus password\b/i,
  /\b(?:student|network) id\b/i,
  /\b(?:pin|otp|passcode)\b/i,
  /\blogin credentials\b/i,
  /\bre-authenticate\b/i,
  /\bconfirm your credentials\b/i
];

const FINANCIAL_LURE_PATTERNS = [
  /\bdisbursement\b/i,
  /\bscholarship funds?\b/i,
  /\bclaim funds\b/i,
  /\bwire transfer\b/i,
  /\b\$\d+[\d,]*(?:\.\d{2})?\b/i
];

/**
 * Analyzes visible message text and extracted links on-device without network calls.
 */
export function quickScanVisibleText(
  visibleText: string,
  extractedUrls: string[]
): { result: QuickScanResult; relevantExcerpt: string } {
  const indicators: string[] = [];
  const reasons: string[] = [];

  // Check Urgency
  const hasUrgency = URGENCY_PATTERNS.some(p => p.test(visibleText));
  if (hasUrgency) {
    indicators.push("urgency_or_coercion");
    reasons.push("Message uses urgent or coercive language demanding immediate action.");
  }

  // Check Credential requests
  const hasCredentialRequest = CREDENTIAL_PATTERNS.some(p => p.test(visibleText));
  if (hasCredentialRequest) {
    indicators.push("credential_request");
    reasons.push("Message requests institutional account credentials, passwords, or verification.");
  }

  // Check Financial/Scholarship Lure
  const hasFinancialLure = FINANCIAL_LURE_PATTERNS.some(p => p.test(visibleText));
  if (hasFinancialLure) {
    indicators.push("financial_lure");
    reasons.push("Message references pending funds, scholarships, or monetary disbursement.");
  }

  // Check Links
  let candidateLink: string | null = null;
  let hasSuspiciousLink = false;

  for (const url of extractedUrls) {
    try {
      const parsed = new URL(url);
      if (parsed.pathname.includes("/scholarship") || parsed.pathname.includes("/login")) {
        hasSuspiciousLink = true;
        candidateLink = url;
        indicators.push("credential_collection_link");
        reasons.push(`Destination link targets a credential login endpoint: ${parsed.pathname}`);
        break;
      } else if (!candidateLink) {
        candidateLink = url;
      }
    } catch {
      // malformed URL
    }
  }

  // Formulate Verdict and Next Step
  let verdict: QuickScanResult["verdict"] = "benign";
  let confidence: QuickScanResult["confidence"] = "low";
  let recommendedNextStep = "No immediate risk observed. Proceed normally.";

  if (hasCredentialRequest && (hasUrgency || hasSuspiciousLink || hasFinancialLure)) {
    verdict = "concerning";
    confidence = hasSuspiciousLink ? "high" : "medium";
    recommendedNextStep = "Do not click link or enter credentials. Click 'Investigate' for deep ThreatLens analysis.";
  } else if (hasUrgency && candidateLink) {
    verdict = "concerning";
    confidence = "medium";
    recommendedNextStep = "Review destination before clicking. Click 'Investigate' to verify destination safely.";
  } else if (indicators.length === 0) {
    verdict = "benign";
    confidence = "high";
    reasons.push("Standard informational content with no credential or urgency requests.");
    recommendedNextStep = "No concerning behavior observed.";
  } else {
    verdict = "inconclusive";
    confidence = "low";
    reasons.push("Some unusual patterns detected, but insufficient evidence of a threat.");
    recommendedNextStep = "Exercise standard caution with unverified links.";
  }

  // Extract ONLY the relevant excerpt (sentence or window containing flagged terms or links)
  const relevantExcerpt = extractMinimalExcerpt(visibleText, candidateLink);

  return {
    result: {
      verdict,
      confidence,
      indicators,
      reasons,
      candidateLink,
      recommendedNextStep
    },
    relevantExcerpt
  };
}

/**
 * Extracts a concise snippet centered around the triggered indicator or link,
 * strictly avoiding sending the entire message or unrelated paragraphs.
 */
function extractMinimalExcerpt(text: string, candidateLink: string | null): string {
  if (!text) return "";

  // Split into sentences
  const sentences = text.split(/(?<=[.!?])\s+/);

  // Find the sentence containing the candidate link, credential prompt, or urgency
  for (const sentence of sentences) {
    if (
      (candidateLink && sentence.includes(candidateLink)) ||
      CREDENTIAL_PATTERNS.some(p => p.test(sentence)) ||
      URGENCY_PATTERNS.some(p => p.test(sentence))
    ) {
      return sentence.trim();
    }
  }

  // Fallback to first sentence or first 160 characters
  return (sentences[0] || text.slice(0, 160)).trim();
}
