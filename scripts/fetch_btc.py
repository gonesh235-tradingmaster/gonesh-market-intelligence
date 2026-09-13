"""
GONESH Market Intelligence
Fetch BTC spot data from CoinGecko
No API key required. No geo-blocking.
"""

import json
import os
import sys
import urllib.request
import urllib.error
from datetime import datetime, timezone


COINGECKO = "https://api.coingecko.com/api/v3"

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
    """Fetch BTC spot data from CoinGecko."""
    url = (
        f"{COINGECKO}/coins/bitcoin"
        "?localization=false"
        "&tickers=false"
        "&market_data=true"
        "&community_data=false"
        "&developer_data=false"
        "&sparkline=false"
    )
    data = http_get_json(url)
    if not data:
        return None

    try:
        md = data.get("market_data", {})
        price = md.get("current_price", {}).get("usd")
        change_24h = md.get("price_change_24h")
        change_24h_pct = md.get("price_change_percentage_24h")
        high_24h = md.get("high_24h", {}).get("usd")
        low_24h = md.get("low_24h", {}).get("usd")
        volume_24h = md.get("total_volume", {}).get("usd")
        prev_close = None
        if price is not None and change_24h is not None:
            prev_close = price - change_24h

        return {
            "price": round(price, 2) if price is not None else None,
            "previous_close": round(prev_close, 2) if prev_close is not None else None,
            "change_24h": round(change_24h, 2) if change_24h is not None else None,
            "change_24h_percent": round(change_24h_pct, 2) if change_24h_pct is not None else None,
            "high_24h": round(high_24h, 2) if high_24h is not None else None,
            "low_24h": round(low_24h, 2) if low_24h is not None else None,
            "volume_24h": round(volume_24h, 0) if volume_24h is not None else None,
        }
    except Exception as e:
        print(f"[WARN] BTC spot parse failed: {e}", file=sys.stderr)
        return None


def fetch_btc_derivatives():
    """Fetch OI and funding rate from CoinGecko derivatives endpoint."""
    url = f"{COINGECKO}/derivatives?include_tickers=unexpired"
    data = http_get_json(url)
    if not data or not isinstance(data, list):
        return None

    # Find BTC perpetual on Binance or first BTC perp
    btc_perps = [
        d for d in data
        if d.get("index_id") == "BTC" and d.get("contract_type") == "perpetual"
    ]
    if not btc_perps:
        return None

    # Prefer Binance if available
    chosen = None
    for p in btc_perps:
        if "binance" in (p.get("market", "") or "").lower():
            chosen = p
            break
    if not chosen:
        chosen = btc_perps[0]

    try:
        oi = chosen.get("open_interest")
        funding = chosen.get("funding_rate")
        return {
            "market": chosen.get("market"),
            "open_interest": round(float(oi), 2) if oi is not None else None,
            "funding_rate": round(float(funding) * 100, 4) if funding is not None else None,
            "mark_price": round(float(chosen.get("price")), 2) if chosen.get("price") else None,
        }
    except Exception as e:
        print(f"[WARN] Derivatives parse failed: {e}", file=sys.stderr)
        return None


def compute_btc_mood(spot, derivs):
    scores = []
    weights = []
    reasons = []

    # Price change (weight 60)
    if spot and spot.get("change_24h_percent") is not None:
        cp = spot["change_24h_percent"]
        s = max(-60, min(60, cp * 2.5))
        scores.append(s)
        weights.append(60)
        if cp > 1:
            reasons.append(f"BTC up {cp:.2f}% in 24h")
        elif cp < -1:
            reasons.append(f"BTC down {abs(cp):.2f}% in 24h")

    # Funding rate (weight 20)
    if derivs and derivs.get("funding_rate") is not None:
        fr = derivs["funding_rate"]
        if fr > 0.03:
            scores.append(-15)
            reasons.append(f"Funding elevated ({fr:.3f}%) — longs overheated")
        elif fr < -0.03:
            scores.append(15)
            reasons.append(f"Funding negative ({fr:.3f}%) — shorts crowded")
        else:
            scores.append(0)
        weights.append(20)

    # OI presence (weight 20) - neutral placeholder
    if derivs and derivs.get("open_interest"):
        scores.append(0)
        weights.append(20)

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

    print("Fetching BTC spot from CoinGecko...")
    spot = fetch_btc_spot()

    print("Fetching BTC derivatives from CoinGecko...")
    derivs = fetch_btc_derivatives()

    if not spot or not spot.get("price"):
        payload = {
            "status": "DATA UNAVAILABLE",
            "reason": "CoinGecko did not return BTC data",
            "updated_utc": datetime.now(timezone.utc).isoformat(),
        }
    else:
        mood_score, mood_reason = compute_btc_mood(spot, derivs)
        data = dict(spot)
        data["mood_score"] = mood_score
        data["mood_reason"] = mood_reason

        payload = {
            "updated_utc": datetime.now(timezone.utc).isoformat(),
            "source": "CoinGecko",
            "source_url": "https://www.coingecko.com/en/coins/bitcoin",
            "data": data,
        }

    with open("data/btc.json", "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    derivatives_file = {
        "updated_utc": datetime.now(timezone.utc).isoformat(),
        "source": "CoinGecko Derivatives",
        "open_interest": derivs.get("open_interest") if derivs else None,
        "funding": {
            "funding_rate": derivs.get("funding_rate"),
            "mark_price": derivs.get("mark_price"),
        } if derivs else None,
    }
    with open("data/btc_factors.json", "w", encoding="utf-8") as f:
        json.dump(derivatives_file, f, ensure_ascii=False, indent=2)

    print("Saved data/btc.json and data/btc_factors.json")


if __name__ == "__main__":
    main()
