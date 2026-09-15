import { ProviderResult } from "../types";

export interface YieldReading {
  yieldPct: number;
  date: string; // YYYY-MM-DD, as published by FRED
  changeBp: number | null; // change vs. the prior valid reading, in basis points
}

/**
 * FRED (Federal Reserve Economic Data) is the official, free source for US
 * Treasury constant-maturity yields. Requires a free API key — sign up at
 * https://fred.stlouisfed.org/docs/api/api_key.html and put it in
 * FRED_API_KEY (see .env.example). Without a key this returns
 * DATA UNAVAILABLE instead of throwing, so the rest of the page still works.
 *
 * Common series IDs: DGS10 (10-year), DGS2 (2-year), DGS30 (30-year).
 */
export async function fetchTreasuryYield(
  seriesId: "DGS10" | "DGS2" | "DGS30"
): Promise<ProviderResult<YieldReading>> {
  const source = `FRED (${seriesId})`;
  const apiKey = process.env.FRED_API_KEY;

  if (!apiKey) {
    return unavailable(
      source,
      "FRED_API_KEY is not set — get a free key from fred.stlouisfed.org and add it to .env.local"
    );
  }

  const url =
    `https://api.stlouisfed.org/fred/series/observations` +
    `?series_id=${seriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=5`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
    if (!res.ok) {
      return unavailable(source, `Upstream responded ${res.status}`);
    }
    const json = await res.json();
    const observations: Array<{ date: string; value: string }> =
      json?.observations ?? [];

    // FRED marks non-trading days with value "." — walk back to the most
    // recent real readings instead of showing a gap.
    const valid = observations.filter((o) => o.value !== ".");
    const latest = valid[0];
    const prior = valid[1];
    if (!latest) {
      return unavailable(source, "No recent observation available");
    }

    const yieldPct = parseFloat(latest.value);
    if (Number.isNaN(yieldPct)) {
      return unavailable(source, "Unexpected response shape from FRED");
    }
    const priorPct = prior ? parseFloat(prior.value) : NaN;
    const changeBp = Number.isNaN(priorPct)
      ? null
      : Math.round((yieldPct - priorPct) * 100);

    const ageDays =
      (Date.now() - new Date(latest.date).getTime()) / (1000 * 60 * 60 * 24);

    return {
      ok: true,
      value: { yieldPct, date: latest.date, changeBp },
      source,
      timestamp: new Date(latest.date).toISOString(),
      freshness: ageDays <= 4 ? "LATEST AVAILABLE" : "STALE",
    };
  } catch (err: any) {
    const message =
      err?.name === "AbortError" ? "Request timed out" : "Network error";
    return unavailable(source, message);
  } finally {
    clearTimeout(timeout);
  }
}

function unavailable(source: string, note: string): ProviderResult<YieldReading> {
  return { ok: false, value: null, source, timestamp: null, freshness: "DATA UNAVAILABLE", note };
}
