/**
 * Small, deliberately simple, deliberately documented scoring heuristics.
 * Every factor score in this project traces back to one of these — nothing
 * is hand-picked to make the mood score look more dramatic than the
 * underlying numbers justify. Tune the `scale` constants as you learn how
 * they behave; just keep the mapping readable so the score stays
 * reproducible from the evidence shown next to it.
 */

export function clamp(n: number, min = -100, max = 100): number {
  return Math.max(min, Math.min(max, n));
}

/** A rising value (equities, GIFT NIFTY premium) is treated as positive. */
export function scoreFromPctChange(pct: number, scale = 20): number {
  return clamp(pct * scale);
}

/** A rising value (VIX, DXY, crude, yields) is treated as negative for
 *  risk assets — the classic "risk-off" direction. */
export function scoreFromInversePctChange(pct: number, scale = 3): number {
  return clamp(-pct * scale);
}

/** Yield changes come from FRED in basis points, not percent. */
export function scoreFromYieldChangeBp(changeBp: number, scale = 4): number {
  return clamp(-changeBp * scale);
}

/** Average several already-computed -100..100 scores. */
export function average(scores: number[]): number {
  const valid = scores.filter((s) => !Number.isNaN(s));
  if (valid.length === 0) return 0;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}
