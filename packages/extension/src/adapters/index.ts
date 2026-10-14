import { SYNTHETIC_FIXTURE_ADAPTER } from "./synthetic-fixture.js";
import { GMAIL_WEB_ADAPTER } from "./gmail-web.js";
import { WHATSAPP_WEB_ADAPTER } from "./whatsapp-web.js";
import { GENERIC_WEB_ADAPTER } from "./generic-web.js";

export const SITE_ADAPTERS = [
  SYNTHETIC_FIXTURE_ADAPTER,
  GMAIL_WEB_ADAPTER,
  WHATSAPP_WEB_ADAPTER
];

export function findAdapterForUrl(url: string) {
  return SITE_ADAPTERS.find(adapter => adapter.canHandle(url));
}

export function getAdapterForUrl(url: string) {
  const specific = findAdapterForUrl(url);
  if (specific) return specific;
  if (GENERIC_WEB_ADAPTER.canHandle(url)) return GENERIC_WEB_ADAPTER;
  return undefined;
}

export { SYNTHETIC_FIXTURE_ADAPTER, GMAIL_WEB_ADAPTER, WHATSAPP_WEB_ADAPTER, GENERIC_WEB_ADAPTER };

