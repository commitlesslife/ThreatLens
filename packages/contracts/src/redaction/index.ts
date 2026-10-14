import { EvidenceEvent } from "../schemas/evidence.js";

export const REDACTED_SECRET = "[REDACTED_SECRET]";
export const REDACTED_CANARY = "[REDACTED_CANARY]";

/**
 * Standard query parameter keys that must be redacted in URLs.
 */
const SENSITIVE_QUERY_PARAMS = new Set([
  "token",
  "auth",
  "code",
  "secret",
  "key",
  "api_key",
  "apikey",
  "password",
  "pass",
  "passwd",
  "otp",
  "pin",
  "session",
  "sessionid",
  "session_id",
  "jwt",
  "access_token",
  "refresh_token",
  "signature",
  "sig",
  "vpa",
  "card"
]);

/**
 * Common regex patterns for secret strings.
 */
const SECRET_PATTERNS: Array<{ regex: RegExp; replacement: string }> = [
  // Bearer tokens
  { regex: /Bearer\s+[A-Za-z0-9\-\._~\+\/=]+/gi, replacement: `Bearer ${REDACTED_SECRET}` },
  // Basic Auth header values
  { regex: /Basic\s+[A-Za-z0-9+/=]+/gi, replacement: `Basic ${REDACTED_SECRET}` },
  // JWT tokens
  { regex: /eyJ[A-Za-z0-9-_]{10,}\.eyJ[A-Za-z0-9-_]{10,}\.[A-Za-z0-9-_]+/g, replacement: REDACTED_SECRET },
  // API key assignment or JSON pairs (e.g. "api_key": "xyz" or api_key=xyz)
  {
    regex: /((?:apiKey|api_key|api-key|secret|token|password|passwd|access_token|private_key)\s*[:=]\s*["']?)[A-Za-z0-9_\-\.]{8,}(["']?)/gi,
    replacement: `$1${REDACTED_SECRET}$2`
  },
  // Synthetic Canary pattern: e.g. TL-CANARY-XXXX
  { regex: /TL-CANARY-[A-Za-z0-9_-]+/g, replacement: REDACTED_CANARY }
];

/**
 * Redacts secrets from a plain text or serialized string.
 * Optionally accepts custom secret tokens to strip.
 */
export function redactSecrets(text: string, customTokens: string[] = []): string {
  if (!text) return "";

  let result = text;

  // Custom tokens first
  for (const token of customTokens) {
    if (token && token.trim().length > 0) {
      result = result.split(token).join(REDACTED_SECRET);
    }
  }

  // Regex patterns
  for (const pattern of SECRET_PATTERNS) {
    result = result.replace(pattern.regex, pattern.replacement);
  }

  return result;
}

/**
 * Redacts sensitive credentials (userinfo) and sensitive query parameters from a URL.
 */
export function redactUrl(urlStr: string): string {
  if (!urlStr) return "";

  try {
    const parsed = new URL(urlStr);

    // Redact password in userinfo if present: http://user:pass@host/
    if (parsed.password) {
      parsed.password = REDACTED_SECRET;
    }
    if (parsed.username && parsed.username.length > 0) {
      parsed.username = "[REDACTED_USER]";
    }

    // Redact sensitive query parameters
    for (const [key] of parsed.searchParams.entries()) {
      if (SENSITIVE_QUERY_PARAMS.has(key.toLowerCase())) {
        parsed.searchParams.set(key, REDACTED_SECRET);
      }
    }

    return parsed.toString().replace(/%5B/g, "[").replace(/%5D/g, "]");
  } catch {
    // If not a valid standard URL, fallback to regex redaction
    return redactSecrets(urlStr);
  }
}

/**
 * Sanitizes an EvidenceEvent to ensure no raw secrets or unredacted destinations are stored.
 */
export function redactEvidenceEvent(event: EvidenceEvent, customSecrets: string[] = []): EvidenceEvent {
  const sanitized = { ...event };

  if (sanitized.destinationRedacted) {
    sanitized.destinationRedacted = redactUrl(sanitized.destinationRedacted);
    if (customSecrets.length > 0) {
      sanitized.destinationRedacted = redactSecrets(sanitized.destinationRedacted, customSecrets);
    }
  }

  sanitized.sourceRef = redactSecrets(sanitized.sourceRef, customSecrets);

  return sanitized;
}
