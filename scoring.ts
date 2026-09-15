import { MoodFactor, MoodResult, Freshness } from "./types";

/**
 * Weighted average over factors that are neither unavailable nor stale.
 * STALE factors are real data that's too old to treat as current, so — same
 * as the spec requires — they're excluded from the score but still shown
 * in the UI with their real values and a STALE badge, never silently
 * substituted in as if they were fresh.
 */
export function computeMood(factors: MoodFactor[]): MoodResult {
  const used = factors.filter((f) => !f.unavailable && !f.stale);
  const totalWeight = factors.reduce((s, f) => s + f.weight, 0);
  const usedWeight = used.reduce((s, f) => s + f.weight, 0);

  if (usedWeight === 0) {
    return { score: 0, label: "NEUTRAL", usedWeight: 0, totalWeight };
  }
  const weightedSum = used.reduce((s, f) => s + f.score * f.weight, 0);
  const score = Math.round(weightedSum / usedWeight);
  return { score, label: moodLabel(score), usedWeight, totalWeight };
}

export function moodLabel(score: number): string {
  if (score >= 70) return "STRONGLY POSITIVE";
  if (score >= 30) return "POSITIVE";
  if (score >= -29) return "NEUTRAL";
  if (score >= -69) return "NEGATIVE";
  return "STRONGLY NEGATIVE";
}

/**
 * Turns a raw timestamp + a rough "how old is too old" budget into one of
 * the five freshness states. Never returns LIVE unless the caller
 * explicitly says the provider is a real-time stream — everything else
 * defaults to a more honest, more conservative label.
 */
export function classifyFreshness(
  timestampMs: number | null,
  opts: { isStream?: boolean; staleAfterMinutes?: number } = {}
): Freshness {
  if (timestampMs == null) return "DATA UNAVAILABLE";
  const ageMinutes = (Date.now() - timestampMs) / 60000;
  if (opts.isStream && ageMinutes < 1) return "LIVE";
  if (ageMinutes < 2) return "~1 MIN DELAY";
  const staleAfter = opts.staleAfterMinutes ?? 60 * 20; // default: 20h
  if (ageMinutes < staleAfter) return "LATEST AVAILABLE";
  return "STALE";
}
