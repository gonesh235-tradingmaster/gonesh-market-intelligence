export type Freshness =
  | "LIVE"
  | "~1 MIN DELAY"
  | "LATEST AVAILABLE"
  | "STALE"
  | "DATA UNAVAILABLE";

/** Standard envelope every provider adapter returns. Never throws past
 *  this boundary — callers always get a value or a clear unavailable flag,
 *  never a fabricated number. */
export interface ProviderResult<T> {
  ok: boolean;
  value: T | null;
  source: string;
  timestamp: string | null; // ISO string, in the source's own terms
  freshness: Freshness;
  note?: string; // shown in the UI when ok is false, explains *why*
}

export interface MoodFactor {
  id: string;
  name: string;
  weight: number; // relative weight, doesn't need to sum to 100
  score: number; // -100..100, ignored if unavailable/stale
  importance: "Low" | "Medium" | "High";
  direction: "positive" | "negative" | "neutral";
  why: string;
  evidence: string;
  impact: string;
  source: string;
  timestamp: string | null;
  freshness: Freshness;
  unavailable?: boolean;
  stale?: boolean;
}

export interface MoodResult {
  score: number;
  label: string;
  usedWeight: number;
  totalWeight: number;
}

export interface Quote {
  value: number;
  change: number;
  changePct: number;
  dayHigh?: number;
  dayLow?: number;
  prevClose?: number;
}
