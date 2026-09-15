import { fetchYahooQuote } from "./providers/yahoo";
import { fetchTreasuryYield } from "./providers/fred";
import { fetchBtcDerivatives } from "./providers/binance";
import { computeMood } from "./scoring";
import { scoreFromPctChange, scoreFromInversePctChange, scoreFromYieldChangeBp, average } from "./heuristics";
import { MoodFactor } from "./types";

export async function getBtcData() {
  const [btc, sp500, dow, nasdaq, usVix, dxy, us10y, us2y, derivs] = await Promise.all([
    fetchYahooQuote("BTC-USD", "Yahoo Finance"),
    fetchYahooQuote("^GSPC", "Yahoo Finance"),
    fetchYahooQuote("^DJI", "Yahoo Finance"),
    fetchYahooQuote("^IXIC", "Yahoo Finance"),
    fetchYahooQuote("^VIX", "Yahoo Finance"),
    fetchYahooQuote("DX-Y.NYB", "Yahoo Finance"),
    fetchTreasuryYield("DGS10"),
    fetchTreasuryYield("DGS2"),
    fetchBtcDerivatives(),
  ]);

  const usScore = usMarketScore(sp500.value?.changePct, dow.value?.changePct, nasdaq.value?.changePct, usVix.value?.changePct);
  const bondScore = scoreFromYieldChangeBp(average([us10y.value?.changeBp ?? NaN, us2y.value?.changeBp ?? NaN]), 4);
  const dxyScore = scoreFromInversePctChange(dxy.value?.changePct ?? 0, 4);

  const factors: MoodFactor[] = [
    {
      id: "b1", name: "US Equity / Risk Sentiment", weight: 10, score: usScore, importance: "Medium", direction: dir(usScore),
      why: "US equities and VIX set the broad risk-on/risk-off backdrop.",
      evidence: describeUS(sp500, dow, nasdaq, usVix),
      impact: "Risk-on US sessions are generally supportive for BTC, all else equal.",
      source: "Yahoo Finance", timestamp: sp500.timestamp, freshness: sp500.ok ? sp500.freshness : "DATA UNAVAILABLE",
      unavailable: !sp500.ok && !dow.ok && !nasdaq.ok,
    },
    {
      id: "b2", name: "DXY", weight: 10, score: dxyScore, importance: "Medium", direction: dir(dxyScore),
      why: "Dollar strength is typically a headwind for BTC.",
      evidence: dxy.ok ? `DXY at ${dxy.value!.value.toFixed(2)} (${fmtPct(dxy.value!.changePct)}).` : `Unavailable: ${dxy.note}`,
      impact: "A firmer dollar tends to pressure risk assets including BTC.",
      source: dxy.source, timestamp: dxy.timestamp, freshness: dxy.freshness, unavailable: !dxy.ok,
    },
    {
      id: "b3", name: "US Bond Market", weight: 15, score: bondScore, importance: "High", direction: dir(bondScore),
      why: "US 2Y/10Y yields set the discount rate applied to non-yielding assets.",
      evidence: describeYields(us10y, us2y),
      impact: "Rising real yields raise the opportunity cost of holding BTC.",
      source: "FRED", timestamp: us10y.timestamp, freshness: us10y.ok ? us10y.freshness : "DATA UNAVAILABLE",
      unavailable: !us10y.ok && !us2y.ok, stale: us10y.freshness === "STALE",
    },
    {
      id: "b4", name: "Fed / Rate Expectations", weight: 20, score: 0, importance: "High", direction: "neutral",
      why: "No CME FedWatch / rate-probability feed is wired up in this build.",
      evidence: "Needs a dedicated rates-expectations API (see README) — CPI/PPI prints alone don't give you implied odds.",
      impact: "Left neutral rather than guessed.",
      source: "Not configured", timestamp: null, freshness: "DATA UNAVAILABLE", unavailable: true,
    },
    {
      id: "b5", name: "Crypto-Specific News", weight: 10, score: 0, importance: "Medium", direction: "neutral",
      why: "No crypto news API is wired up in this build.",
      evidence: "Needs a news source (see README) for ETF/regulatory/security headlines.",
      impact: "Left neutral rather than guessed.",
      source: "Not configured", timestamp: null, freshness: "DATA UNAVAILABLE", unavailable: true,
    },
    {
      id: "b6", name: "ETF / Institutional Flows", weight: 15, score: 0, importance: "High", direction: "neutral",
      why: "No free compliant ETF-flow API is wired up in this build.",
      evidence: "Flow trackers like SoSoValue/Farside publish this but don't offer a free open API — needs a paid feed or manual entry.",
      impact: "Left neutral rather than guessed.",
      source: "Not configured", timestamp: null, freshness: "DATA UNAVAILABLE", unavailable: true,
    },
    {
      id: "b7", name: "Open Interest / Funding", weight: 10,
      score: derivs.ok ? clampFundingScore(derivs.value!.annualizedFundingPct) : 0,
      importance: "Medium", direction: derivs.ok ? dir(clampFundingScore(derivs.value!.annualizedFundingPct)) : "neutral",
      why: "Binance BTC perpetual funding rate — a proxy for how crowded/expensive leveraged longs are.",
      evidence: derivs.ok
        ? `Funding ${derivs.value!.fundingRatePct}% per 8h (~${derivs.value!.annualizedFundingPct}% annualized); OI ${derivs.value!.openInterestBtc.toLocaleString()} BTC.`
        : `Unavailable: ${derivs.note}`,
      impact: "Very positive funding = crowded longs (squeeze risk down); very negative = crowded shorts.",
      source: derivs.source, timestamp: derivs.timestamp, freshness: derivs.freshness, unavailable: !derivs.ok,
    },
    {
      id: "b8", name: "Liquidations", weight: 5, score: 0, importance: "Medium", direction: "neutral",
      why: "No liquidation-tracking API is wired up in this build.",
      evidence: "Services like Coinglass expose this via a paid API — not included here.",
      impact: "Left neutral rather than guessed.",
      source: "Not configured", timestamp: null, freshness: "DATA UNAVAILABLE", unavailable: true,
    },
    {
      id: "b9", name: "Previous Day Mood", weight: 10, score: scoreFromPctChange(btc.value?.changePct ?? 0, 12),
      importance: "Low", direction: dir(scoreFromPctChange(btc.value?.changePct ?? 0, 12)),
      why: "How BTC's most recent session moved.",
      evidence: btc.ok ? `BTC at $${btc.value!.value.toLocaleString()}, ${fmtPct(btc.value!.changePct)}.` : `Unavailable: ${btc.note}`,
      impact: "Sets the carry-over tone into the next session.",
      source: btc.source, timestamp: btc.timestamp, freshness: btc.freshness, unavailable: !btc.ok,
    },
    {
      id: "b10", name: "Geopolitical / Global Risk", weight: 5, score: 0, importance: "Medium", direction: "neutral",
      why: "No automated geopolitical news feed is wired up in this build.",
      evidence: "Needs a news API (see README).",
      impact: "Left neutral rather than guessed.",
      source: "Not configured", timestamp: null, freshness: "DATA UNAVAILABLE", unavailable: true,
    },
  ];

  const mood = computeMood(factors);

  return {
    snapshot: btc.ok
      ? {
          value: btc.value!.value, change: btc.value!.change, changePct: btc.value!.changePct,
          dayHigh: btc.value!.dayHigh, dayLow: btc.value!.dayLow, source: btc.source,
          timestamp: btc.timestamp, freshness: btc.freshness,
        }
      : { note: btc.note, source: btc.source, freshness: "DATA UNAVAILABLE" },
    factors,
    mood,
    fetchedAt: new Date().toISOString(),
  };
}

function clampFundingScore(annualizedPct: number): number {
  // Very high positive funding (crowded longs) reads as a mild negative —
  // it's a squeeze-risk signal, not a directional call.
  return Math.max(-60, Math.min(60, -annualizedPct * 2));
}
function usMarketScore(spPct?: number, dowPct?: number, ndxPct?: number, vixPct?: number): number {
  const equity = average([spPct ?? NaN, dowPct ?? NaN, ndxPct ?? NaN]);
  const equityScore = Math.max(-100, Math.min(100, equity * 18));
  const vixScore = Math.max(-100, Math.min(100, -(vixPct ?? 0) * 1.5));
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
function describeUS(sp: any, dow: any, ndx: any, vix: any): string {
  if (!sp.ok && !dow.ok && !ndx.ok) return `Unavailable: ${sp.note}`;
  const parts: string[] = [];
  if (sp.ok) parts.push(`S&P 500 ${fmtPct(sp.value.changePct)}`);
  if (dow.ok) parts.push(`Dow ${fmtPct(dow.value.changePct)}`);
  if (ndx.ok) parts.push(`Nasdaq ${fmtPct(ndx.value.changePct)}`);
  if (vix.ok) parts.push(`VIX ${fmtPct(vix.value.changePct)}`);
  return parts.join(", ");
}
function describeYields(a: any, b: any): string {
  if (!a.ok && !b.ok) return `Unavailable: ${a.note}`;
  const parts: string[] = [];
  if (a.ok) parts.push(`US 10Y ${a.value.yieldPct}% (${a.value.changeBp ?? 0}bp)`);
  if (b.ok) parts.push(`US 2Y ${b.value.yieldPct}% (${b.value.changeBp ?? 0}bp)`);
  return parts.join(", ");
}
