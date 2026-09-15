import { ProviderResult } from "../types";

/**
 * These three don't have a clean, free, terms-of-service-compliant API:
 *
 * - GIFT NIFTY has no public JSON feed. It's quoted by brokers (Kotak Neo,
 *   ICICI Direct, etc.) and by NSE IX itself, but not as an open API.
 * - NIFTY's live options chain (OI, PCR, max pain) is served by NSE's own
 *   website through an endpoint that's protected against automated access —
 *   scraping it means spoofing browser headers/cookies to get around that
 *   protection, which this project deliberately does not do (see the
 *   original brief's own "do not bypass access restrictions" rule).
 * - India's 10-year G-Sec yield doesn't have a clean free JSON API either;
 *   FBIL (the official benchmark administrator) publishes it, but not as
 *   an open feed.
 *
 * The honest fix for all three is the same: a registered broker/data-vendor
 * API where you accept their terms and (usually) get a developer key —
 * e.g. Zerodha Kite Connect, Upstox API, Angel One SmartAPI, or a paid feed
 * like Global Datafeeds/TrueData. Once you have credentials, replace the
 * body of these functions with a real fetch — the return shape is already
 * wired into the scoring engine and the UI, so nothing else needs to change.
 */

export async function fetchGiftNifty(): Promise<ProviderResult<null>> {
  return unavailable(
    "GIFT NIFTY",
    "No compliant free API. Wire up a broker API (e.g. Kite Connect) here."
  );
}

export async function fetchNiftyOptionsOI(): Promise<ProviderResult<null>> {
  return unavailable(
    "NIFTY Options Chain",
    "NSE's option-chain endpoint is bot-protected; use a licensed broker API instead of scraping it."
  );
}

export async function fetchIndia10Y(): Promise<ProviderResult<null>> {
  return unavailable(
    "India 10Y G-Sec",
    "No compliant free API found; consider a paid feed (Trading Economics API, Investing.com API, etc.)."
  );
}

function unavailable(source: string, note: string): ProviderResult<null> {
  return { ok: false, value: null, source, timestamp: null, freshness: "DATA UNAVAILABLE", note };
}
