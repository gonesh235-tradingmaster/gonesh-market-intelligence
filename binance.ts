import { ProviderResult } from "../types";

export interface BtcDerivatives {
  fundingRatePct: number; // per 8h funding rate, as a percent
  annualizedFundingPct: number; // rough annualization (3 periods/day)
  openInterestBtc: number;
}

/**
 * Binance's public futures endpoints — no API key required for these two.
 * Caveat worth knowing before you deploy: Binance blocks requests from a
 * handful of regions (notably the US) at the network level. If your
 * serverless function's region is blocked, this will fail closed to
 * DATA UNAVAILABLE rather than error the whole page — but if you see that
 * happen consistently, swap this adapter for Bybit's or OKX's equivalent
 * public endpoints, or pin your Vercel function region to one Binance
 * doesn't block.
 */
export async function fetchBtcDerivatives(): Promise<
  ProviderResult<BtcDerivatives>
> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  const source = "Binance Futures (public API)";

  try {
    const [premiumRes, oiRes] = await Promise.all([
      fetch("https://fapi.binance.com/fapi/v1/premiumIndex?symbol=BTCUSDT", {
        signal: controller.signal,
        cache: "no-store",
      }),
      fetch("https://fapi.binance.com/fapi/v1/openInterest?symbol=BTCUSDT", {
        signal: controller.signal,
        cache: "no-store",
      }),
    ]);

    if (!premiumRes.ok || !oiRes.ok) {
      return unavailable(
        source,
        `Upstream responded ${premiumRes.status}/${oiRes.status} — possibly region-blocked`
      );
    }

    const premium = await premiumRes.json();
    const oi = await oiRes.json();

    const fundingRate = parseFloat(premium?.lastFundingRate);
    const openInterest = parseFloat(oi?.openInterest);
    const timeMs: number | null =
      typeof premium?.time === "number" ? premium.time : null;

    if (Number.isNaN(fundingRate) || Number.isNaN(openInterest)) {
      return unavailable(source, "Unexpected response shape from Binance");
    }

    return {
      ok: true,
      value: {
        fundingRatePct: round(fundingRate * 100, 4),
        annualizedFundingPct: round(fundingRate * 3 * 365 * 100, 2),
        openInterestBtc: round(openInterest, 1),
      },
      source,
      timestamp: timeMs ? new Date(timeMs).toISOString() : null,
      freshness: timeMs && Date.now() - timeMs < 5 * 60000 ? "LIVE" : "LATEST AVAILABLE",
    };
  } catch (err: any) {
    const message =
      err?.name === "AbortError" ? "Request timed out" : "Network error";
    return unavailable(source, message);
  } finally {
    clearTimeout(timeout);
  }
}

function unavailable(
  source: string,
  note: string
): ProviderResult<BtcDerivatives> {
  return {
    ok: false,
    value: null,
    source,
    timestamp: null,
    freshness: "DATA UNAVAILABLE",
    note,
  };
}

function round(n: number, dp = 2): number {
  const f = Math.pow(10, dp);
  return Math.round(n * f) / f;
}
