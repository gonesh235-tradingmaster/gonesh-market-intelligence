"""
GONESH Market Intelligence
Compute Global Market Mood from NIFTY + BTC data.
"""

import json
import os
import sys
from datetime import datetime, timezone


def load_json(path):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"[WARN] Could not load {path}: {e}", file=sys.stderr)
        return None


def extract_mood(data, key="mood_score"):
    """Extract mood score from a data payload."""
    if not data:
        return None, None
    if data.get("status") == "DATA UNAVAILABLE":
        return None, None
    d = data.get("data", {})
    score = d.get(key)
    reason = d.get("mood_reason", "")
    return score, reason


def main():
    os.makedirs("data", exist_ok=True)

    nifty = load_json("data/nifty.json")
    btc = load_json("data/btc.json")

    nifty_score, nifty_reason = extract_mood(nifty)
    btc_score, btc_reason = extract_mood(btc)

    # Collect available scores
    contributions = []
    reasons = []

    if nifty_score is not None:
        contributions.append(("NIFTY", nifty_score, 0.5))
        if nifty_reason:
            reasons.append(f"NIFTY: {nifty_reason}")

    if btc_score is not None:
        contributions.append(("BTC", btc_score, 0.5))
        if btc_reason:
            reasons.append(f"BTC: {btc_reason}")

    if not contributions:
        payload = {
            "status": "DATA UNAVAILABLE",
            "reason": "Neither NIFTY nor BTC mood data available",
            "updated_utc": datetime.now(timezone.utc).isoformat(),
        }
    else:
        # Normalize weights to sum to 1
        total_w = sum(w for _, _, w in contributions)
        weighted_sum = sum(score * (w / total_w) for _, score, w in contributions)
        global_score = int(round(weighted_sum))
        global_score = max(-100, min(100, global_score))

        # Short explanation
        if global_score >= 70:
            mood_label = "STRONGLY POSITIVE"
        elif global_score >= 30:
            mood_label = "POSITIVE"
        elif global_score >= -29:
            mood_label = "NEUTRAL"
        elif global_score >= -69:
            mood_label = "NEGATIVE"
        else:
            mood_label = "STRONGLY NEGATIVE"

        explanation = f"Global mood is {mood_label.lower()} (score {global_score:+d}). "
        if reasons:
            explanation += " | ".join(reasons[:2])
        else:
            explanation += "Mixed conditions across assets."

        payload = {
            "updated_utc": datetime.now(timezone.utc).isoformat(),
            "source": "Computed from NIFTY + BTC",
            "score": global_score,
            "label": mood_label,
            "explanation": explanation,
            "components": [
                {"asset": name, "score": score, "weight": round(w, 2)}
                for name, score, w in contributions
            ],
        }

    with open("data/global_mood.json", "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    print(f"Saved data/global_mood.json (score={payload.get('score', 'N/A')})")


if __name__ == "__main__":
    main()
