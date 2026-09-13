"""
GONESH Market Intelligence
Fetch BTC spot + derivatives data from Binance
No API key required.
"""

import json
import os
import sys
import urllib.request
import urllib.error
from datetime import datetime, timezone


BINANCE_SPOT = "https://api.binance.com/api/v3"
BINANCE_FUTURES = "https://fapi.binance.com/fapi/v1"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Market Intelligence Fetcher)",
    "Accept": "application/json",
}


def http_get_json(url):
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        print(f"[WARN] {url} failed: {e}", file=sys.stderr)
        return None


def fetch_btc_spot():
    """24hr ticker stats from Binance spot."""
    data = http_get_json(f"{BINANCE_SPOT}/ticker/24hr?symbol=BTCUSDT")
    if not data:
        return None

    try:
        price = float(data["lastPrice"])
        prev_close = float(data["prevClosePrice"])
        change = price - prev_close
        change_pct = (change / prev_close) * 100 if prev_close else 0

        return {
            "price": round(price, 2),
            "previous_close": round(prev_close, 2),
            "change_24h": round(change, 2),
            "change_24h_percent": round(change_pct, 2),
            "high_24h": round(float(data["highPrice"]), 2),
            "low_24h": round(float(data["lowPrice"]), 2),
            "volume_24h": round(float(data["volume"]), 2),
            "quote_volume_24h": round(float(data["quoteVolume"]), 2),
        }
    except Exception as e:
        print(f"[WARN] BTC spot parse failed: {e}", file=sys.stderr)
        return None


def fetch_btc_open_interest():
    """Open interest from Binance Futures."""
    data = http_get_json(f"{BINANCE_FUTURES}/openInterest?symbol=BTCUSDT")
    if not data:
        return None
    try:
        return {
            "open_interest": round(float(data["openInterest"]), 2),
            "timestamp_ms": int(data["time"]),
        }
    except Exception as e:
        print(f"[WARN] OI parse failed: {e}", file=sys.stderr)
        return None


def fetch_btc_funding():
    """Funding rate + mark price from Binance Futures."""
    data = http_get_json(f"{BINANCE_FUTURES}/premiumIndex?symbol=BTCUSDT")
    if not data:
        return None
    try:
        funding_rate = float(data["lastFundingRate"])
        return {
            "funding_rate": round(funding_rate * 100, 4),  # as percent
            "mark_price": round(float(data["markPrice"]), 2),
            "index_price": round(float(data["indexPrice"]), 2),
        }
    except Exception as e:
        print(f"[WARN] Funding parse failed: {e}", file=sys.stderr)
        return None


def compute_btc_mood(spot, oi, funding):
    """
    Simple mood score -100 to +100 based on available BTC data.
    """
    scores = []
    weights = []
    reasons = []

    # Price change (weight 50)
    if spot and spot.get("change_24h_percent") is not None:
        cp = spot["change_24h_percent"]
        s = max(-50, min(50, cp * 2))
        scores.append(s)
        weights.append(50)
        if cp > 1:
            reasons.append(f"BTC up {cp:.2f}% in 24h")
        elif cp < -1:
            reasons.append(f"BTC down {abs(cp):.2f}% in 24h")

    # Funding rate (weight 25) - high positive = over-leveraged longs
    if funding and funding.get("funding_rate") is not None:
        fr = funding["funding_rate"]
        if fr > 0.03:
            scores.append(-10)
            reasons.append(f"Funding rate elevated ({fr:.3f}%)")
        elif fr < -0.03:
            scores.append(10)
            reasons.append(f"Funding rate negative ({fr:.3f}%)")
        else:
            scores.append(0)
        weights.append(25)

    # Open interest (weight 25) - use as neutral since we can't measure change in one snapshot
    if oi:
        scores.append(0)
        weights.append(25)

    if not scores:
        return None, "Insufficient data"

    total_weight = sum(weights)
    raw = sum(s * w for s, w in zip(scores, weights))
    score = int(round(raw / total_weight))
    score = max(-100, min(100, score))

    if not reasons:
        reasons.append("Range-bound conditions")

    return score, " • ".join(reasons)


def main():
    os.makedirs("data", exist_ok=True)

    print("Fetching BTC spot...")
    spot = fetch_btc_spot()

    print("Fetching BTC open interest...")
    oi = fetch_btc_open_interest()

    print("Fetching BTC funding rate...")
    funding = fetch_btc_funding()

    if not spot:
        payload = {
            "status": "DATA UNAVAILABLE",
            "reason": "Binance did not return BTC data",
            "updated_utc": datetime.now(timezone.utc).isoformat(),
        }
    else:
        mood_score, mood_reason = compute_btc_mood(spot, oi, funding)
        data = dict(spot)
        data["mood_score"] = mood_score
        data["mood_reason"] = mood_reason

        payload = {
            "updated_utc": datetime.now(timezone.utc).isoformat(),
            "source": "Binance",
            "source_url": "https://www.binance.com/en/trade/BTC_USDT",
            "data": data,
        }

    with open("data/btc.json", "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    # Derivatives file (for btc.html)
    derivatives = {
        "updated_utc": datetime.now(timezone.utc).isoformat(),
        "source": "Binance Futures",
        "open_interest": oi,
        "funding": funding,
    }
    with open("data/btc_factors.json", "w", encoding="utf-8") as f:
        json.dump(derivatives, f, ensure_ascii=False, indent=2)

    print("Saved data/btc.json and data/btc_factors.json")


if __name__ == "__main__":
    main()
