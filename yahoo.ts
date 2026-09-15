import { ProviderResult, Quote } from "../types";
import { classifyFreshness } from "../scoring";

/**
 * Yahoo Finance's public "chart" endpoint. It's unofficial and undocumented
 * (no published SLA, no API key, can change shape without notice) but it's
 * the most practical free, no-login source that covers indices, crypto,
 * FX/DXY and commodity futures from one place — which is why open-source
 * tools like `yfinance` rely on it too. Treat every response defensively:
 * validate before use, never assume the shape is stable.
 *
 * Symbols used elsewhere in this project:
 *   NIFTY 50        ^NSEI
 *   India VIX       ^INDIAVIX
 *   BTC             BTC-USD
 *   US Dollar Index DX-Y.NYB
 *   S&P 500         ^GSPC
 *   Dow Jones       ^DJI
 *   Nasdaq          ^IXIC
 *   US VIX          ^VIX
 *   WTI Crude       CL=F
 *   Brent Crude     BZ=F
 *   Gold            GC=F
 */
export async function fetchYahooQuote(
  symbol: string,
  sourceLabel = "Yahoo Finance"
): Promise<ProviderResult<Quote>> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol
  )}?interval=1d&range=5d`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        // Yahoo's undocumented endpoint sometimes rejects requests with no
        // browser-like User-Agent.
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      // Never cache a bad reading as if it were fresh.
      cache: "no-store",
    });

    if (!res.ok) {
      return unavailable(sourceLabel, `Upstream responded ${res.status}`);
    }

    const json = await res.json();
    const result = json?.chart?.result?.[0];
    const meta = result?.meta;

    if (!meta || typeof meta.regularMarketPrice !== "number") {
      return unavailable(sourceLabel, "Unexpected response shape from Yahoo");
    }

    const prevClose: number | undefined =
      meta.previousClose ?? meta.chartPreviousClose;
    const value = meta.regularMarketPrice as number;
    const change = typeof prevClose === "number" ? value - prevClose : 0;
    const changePct =
      typeof prevClose === "number" && prevClose !== 0
        ? (change / prevClose) * 100
        : 0;

    const timestampMs =
      typeof meta.regularMarketTime === "number"
        ? meta.regularMarketTime * 1000
        : null;

    return {
      ok: true,
      value: {
        value,
        change: round(change),
        changePct: round(changePct, 2),
        dayHigh: meta.regularMarketDayHigh,
        dayLow: meta.regularMarketDayLow,
        prevClose,
      },
      source: sourceLabel,
      timestamp: timestampMs ? new Date(timestampMs).toISOString() : null,
      freshness: classifyFreshness(timestampMs, {
        isStream: meta.marketState === "REGULAR",
        staleAfterMinutes: 60 * 20,
      }),
    };
  } catch (err: any) {
    const message =
      err?.name === "AbortError" ? "Request timed out" : "Network error";
    return unavailable(sourceLabel, message);
  } finally {
    clearTimeout(timeout);
  }
}

function unavailable(source: string, note: string): ProviderResult<Quote> {
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
