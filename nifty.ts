import { fetchYahooQuote } from "./providers/yahoo";
import { fetchTreasuryYield } from "./providers/fred";
import {
  fetchGiftNifty,
  fetchNiftyOptionsOI,
  fetchIndia10Y,
} from "./providers/unfilled";
import { computeMood } from "./scoring";
import { scoreFromPctChange, scoreFromInversePctChange, scoreFromYieldChangeBp, average } from "./heuristics";
import { MoodFactor } from "./types";

export async function getNiftyData() {
  const [nifty, vix, sp500, dow, nasdaq, usVix, brent, wti, us10y, gift, optionsOI, india10y] =
    await Promise.all([
      fetchYahooQuote("^NSEI", "Yahoo Finance"),
      fetchYahooQuote("^INDIAVIX", "Yahoo Finance"),
      fetchYahooQuote("^GSPC", "Yahoo Finance"),
      fetchYahooQuote("^DJI", "Yahoo Finance"),
      fetchYahooQuote("^IXIC", "Yahoo Finance"),
      fetchYahooQuote("^VIX", "Yahoo Finance"),
      fetchYahooQuote("BZ=F", "Yahoo Finance"),
      fetchYahooQuote("CL=F", "Yahoo Finance"),
      fetchTreasuryYield("DGS10"),
      fetchGiftNifty(),
      fetchNiftyOptionsOI(),
      fetchIndia10Y(),
    ]);

  const factors: MoodFactor[] = [
    {
      id: "f1",
      name: "US Market Impact",
      weight: 15,
      score: usMarketScore(sp500.value?.changePct, dow.value?.changePct, nasdaq.value?.changePct, usVix.value?.changePct),
      importance: "Medium",
      direction: dir(usMarketScore(sp500.value?.changePct, dow.value?.changePct, nasdaq.value?.changePct, usVix.value?.changePct)),
      why: "Derived from the latest S&P 500 / Dow / Nasdaq moves and the VIX.",
      evidence: describeUS(sp500, dow, nasdaq, usVix),
      impact: "Feeds FII risk appetite and global sentiment into the NIFTY session.",
      source: "Yahoo Finance",
      timestamp: sp500.timestamp,
      freshness: sp500.ok ? sp500.freshness : "DATA UNAVAILABLE",
      unavailable: !sp500.ok && !dow.ok && !nasdaq.ok,
    },
    {
      id: "f2",
      name: "Bond Market",
      weight: 20,
      score: scoreFromYieldChangeBp(us10y.value?.changeBp ?? 0, 4),
      importance: "High",
      direction: dir(scoreFromYieldChangeBp(us10y.value?.changeBp ?? 0, 4)),
      why: "US 10-year yield move (India 10Y has no compliant free API — see note).",
      evidence: us10y.ok
        ? `US 10Y at ${us10y.value!.yieldPct}% (${fmtBp(us10y.value!.changeBp)} vs prior reading), as of ${us10y.value!.date}.`
        : `US 10Y unavailable: ${us10y.note}`,
      impact: "Rising yields raise the discount rate applied to Indian equities and pressure FII flows.",
      source: us10y.source,
      timestamp: us10y.timestamp,
      freshness: us10y.freshness,
      unavailable: !us10y.ok,
      stale: us10y.freshness === "STALE",
    },
    {
      id: "f3",
      name: "Commodities",
      weight: 15,
      score: scoreFromInversePctChange(average([brent.value?.changePct ?? NaN, wti.value?.changePct ?? NaN]), 3),
      importance: "High",
      direction: dir(scoreFromInversePctChange(average([brent.value?.changePct ?? NaN, wti.value?.changePct ?? NaN]), 3)),
      why: "Crude oil move — India is a large net importer, so pricier oil is a headwind.",
      evidence: describeOil(brent, wti),
      impact: "Higher oil raises India's import bill and inflation risk.",
      source: "Yahoo Finance",
      timestamp: brent.timestamp ?? wti.timestamp,
      freshness: brent.ok ? brent.freshness : wti.freshness,
      unavailable: !brent.ok && !wti.ok,
    },
    {
      id: "f4",
      name: "War / Geopolitical Impact",
      weight: 15,
      score: 0,
      importance: "High",
      direction: "neutral",
      why: "No automated geopolitical news feed is wired up in this build.",
      evidence: "This factor needs a news API (see README) to score automatically.",
      impact: "Left neutral rather than guessed — plug in a news source to activate it.",
      source: "Not configured",
      timestamp: null,
      freshness: "DATA UNAVAILABLE",
      unavailable: true,
    },
    {
      id: "f5",
      name: "Event Impact",
      weight: 10,
      score: 0,
      importance: "Medium",
      direction: "neutral",
      why: "No economic-calendar API is wired up in this build.",
      evidence: "Needs a calendar source (see README) for CPI/Fed/RBI dates and consensus figures.",
      impact: "Left neutral rather than guessed.",
      source: "Not configured",
      timestamp: null,
      freshness: "DATA UNAVAILABLE",
      unavailable: true,
    },
    {
      id: "f6",
      name: "GIFT NIFTY",
      weight: 10,
      score: 0,
      importance: "Medium",
      direction: "neutral",
      why: gift.note ?? "",
      evidence: gift.note ?? "",
      impact: "Pre-market bias unknown until a broker API is wired up.",
      source: gift.source,
      timestamp: null,
      freshness: "DATA UNAVAILABLE",
      unavailable: true,
    },
    {
      id: "f7",
      name: "Previous Day Mood",
      weight: 10,
      score: scoreFromPctChange(nifty.value?.changePct ?? 0, 15),
      importance: "Low",
      direction: dir(scoreFromPctChange(nifty.value?.changePct ?? 0, 15)),
      why: "How NIFTY's most recent session closed.",
      evidence: nifty.ok
        ? `NIFTY last at ${nifty.value!.value.toLocaleString("en-IN")}, ${fmtPct(nifty.value!.changePct)} vs prior close.`
        : `NIFTY unavailable: ${nifty.note}`,
      impact: "Sets the carry-over tone into the next session.",
      source: nifty.source,
      timestamp: nifty.timestamp,
      freshness: nifty.freshness,
      unavailable: !nifty.ok,
    },
    {
      id: "f8",
      name: "Options Open Interest",
      weight: 10,
      score: 0,
      importance: "High",
      direction: "neutral",
      why: optionsOI.note ?? "",
      evidence: optionsOI.note ?? "",
      impact: "Support/resistance from OI unknown until a broker API is wired up.",
      source: optionsOI.source,
      timestamp: null,
      freshness: "DATA UNAVAILABLE",
      unavailable: true,
    },
  ];

  const mood = computeMood(factors);

  return {
    snapshot: nifty.ok
      ? {
          value: nifty.value!.value,
          change: nifty.value!.change,
          changePct: nifty.value!.changePct,
          dayHigh: nifty.value!.dayHigh,
          dayLow: nifty.value!.dayLow,
          prevClose: nifty.value!.prevClose,
          source: nifty.source,
          timestamp: nifty.timestamp,
          freshness: nifty.freshness,
        }
      : { note: nifty.note, source: nifty.source, freshness: "DATA UNAVAILABLE" },
    indiaVix: vix.ok ? { value: vix.value!.value, changePct: vix.value!.changePct, freshness: vix.freshness } : null,
    factors,
    mood,
    fetchedAt: new Date().toISOString(),
  };
}

function usMarketScore(spPct?: number, dowPct?: number, ndxPct?: number, vixPct?: number): number {
  const equity = average([spPct ?? NaN, dowPct ?? NaN, ndxPct ?? NaN]);
  const equityScore = scoreFromPctChange(equity, 18);
  const vixScore = scoreFromInversePctChange(vixPct ?? 0, 1.5);
  return Math.round(equityScore * 0.7 + vixScore * 0.3);
}

function dir(score: number): "positive" | "negative" | "neutral" {
  if (score > 8) return "positive";
  if (score < -8) return "negative";
  return "neutral";
}

function fmtPct(n: number): string {
  return `${n > 0 ? "+" : ""}${n.toFixed(2)}%`;
}
function fmtBp(n: number | null): string {
  if (n == null) return "no prior reading";
  return `${n > 0 ? "+" : ""}${n}bp`;
}
function describeUS(sp: any, dow: any, ndx: any, vix: any): string {
  if (!sp.ok && !dow.ok && !ndx.ok) return `Unavailable: ${sp.note}`;
  const parts: string[] = [];
  if (sp.ok) parts.push(`S&P 500 ${fmtPct(sp.value.changePct)}`);
  if (dow.ok) parts.push(`Dow ${fmtPct(dow.value.changePct)}`);
  if (ndx.ok) parts.push(`Nasdaq ${fmtPct(ndx.value.changePct)}`);
  if (vix.ok) parts.push(`VIX ${fmtPct(vix.value.changePct)}`);
  return parts.join(", ");
}
function describeOil(brent: any, wti: any): string {
  if (!brent.ok && !wti.ok) return `Unavailable: ${brent.note}`;
  const parts: string[] = [];
  if (brent.ok) parts.push(`Brent $${brent.value.value.toFixed(2)} (${fmtPct(brent.value.changePct)})`);
  if (wti.ok) parts.push(`WTI $${wti.value.value.toFixed(2)} (${fmtPct(wti.value.changePct)})`);
  return parts.join(", ");
}
