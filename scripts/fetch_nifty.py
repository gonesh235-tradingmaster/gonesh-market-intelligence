"""
GONESH Market Intelligence
Fetch NIFTY 50 + related market data from Yahoo Finance
No API key required.
"""

import json
import os
import sys
import urllib.request
import urllib.error
from datetime import datetime, timezone


# Yahoo Finance tickers
TICKERS = {
    "nifty": "^NSEI",           # NIFTY 50
    "sp500": "^GSPC",           # S&P 500
    "nasdaq": "^IXIC",          # Nasdaq
    "dow": "^DJI",              # Dow Jones
    "vix": "^VIX",              # US VIX
    "us10y": "^TNX",            # US 10Y yield
    "dxy": "DX-Y.NYB",          # US Dollar Index
    "brent": "BZ=F",            # Brent crude
    "wti": "CL=F",              # WTI crude
    "gold": "GC=F",             # Gold
}

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Market Intelligence Fetcher)",
    "Accept": "application/json",
}


def fetch_quote(ticker):
    """Fetch latest quote from Yahoo Finance chart endpoint."""
    url = (
        f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}"
        f"?interval=1d&range=5d"
    )
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        print(f"[WARN] {ticker} fetch failed: {e}", file=sys.stderr)
        return None

    try:
        result = data["chart"]["result"][0]
        meta = result["meta"]
        price = meta.get("regularMarketPrice")
        prev_close = meta.get("chartPreviousClose") or meta.get("previousClose")

        if price is None:
            return None

        change = None
        change_pct = None
        if prev_close:
            change = price - prev_close
            change_pct = (change / prev_close) * 100

        return {
            "value": round(price, 2),
            "previous_close": round(prev_close, 2) if prev_close else None,
            "change": round(change, 2) if change is not None else None,
            "change_percent": round(change_pct, 2) if change_pct is not None else None,
            "day_high": round(meta.get("regularMarketDayHigh"), 2) if meta.get("regularMarketDayHigh") else None,
            "day_low": round(meta.get("regularMarketDayLow"), 2) if meta.get("regularMarketDayLow") else None,
            "currency": meta.get("currency", ""),
            "market_state": meta.get("marketState", ""),
        }
    except Exception as e:
        print(f"[WARN] {ticker} parse failed: {e}", file=sys.stderr)
        return None


def compute_nifty_mood(nifty, sp500, nasdaq, vix, us10y, brent, dxy):
    """
    Simple mood score for NIFTY based on available data.
    Range: -100 to +100
    """
    scores = []
    reasons = []

    # NIFTY own move (weight 30)
    if nifty and nifty.get("change_percent") is not None:
        cp = nifty["change_percent"]
        s = max(-30, min(30, cp * 6))
        scores.append(("nifty_move", s, 30))
        if cp > 0.5:
            reasons.append(f"NIFTY up {cp:.2f}%")
        elif cp < -0.5:
            reasons.append(f"NIFTY down {abs(cp):.2f}%")

    # US markets (weight 25)
    us_avg = []
    for m in (sp500, nasdaq):
        if m and m.get("change_percent") is not None:
            us_avg.append(m["change_percent"])
    if us_avg:
        avg = sum(us_avg) / len(us_avg)
        s = max(-25, min(25, avg * 8))
        scores.append(("us_markets", s, 25))
        if avg > 0.3:
            reasons.append(f"US markets up {avg:.2f}%")
        elif avg < -0.3:
            reasons.append(f"US markets down {abs(avg):.2f}%")

    # VIX (weight 10) - higher vix = negative
    if vix and vix.get("value"):
        v = vix["value"]
        if v > 25:
            scores.append(("vix", -8, 10))
            reasons.append(f"VIX elevated ({v:.1f})")
        elif v < 15:
            scores.append(("vix", 5, 10))
        else:
            scores.append(("vix", 0, 10))

    # US 10Y yield (weight 10) - sharp moves negative
    if us10y and us10y.get("change_percent") is not None:
        cp = us10y["change_percent"]
        s = max(-10, min(10, -cp * 5))
        scores.append(("us10y", s, 10))
        if cp > 1:
            reasons.append("US 10Y yield rising sharply")
        elif cp < -1:
            reasons.append("US 10Y yield falling")

    # Crude oil (weight 15) - rising crude bad for India
    if brent and brent.get("change_percent") is not None:
        cp = brent["change_percent"]
        s = max(-15, min(15, -cp * 5))
        scores.append(("brent", s, 15))
        if cp > 1.5:
            reasons.append("Crude oil rising sharply")
        elif cp < -1.5:
            reasons.append("Crude oil falling")

    # DXY (weight 10)
    if dxy and dxy.get("change_percent") is not None:
        cp = dxy["change_percent"]
        s = max(-10, min(10, -cp * 4))
        scores.append(("dxy", s, 10))
        if cp > 0.5:
            reasons.append("Dollar strengthening")
        elif cp < -0.5:
            reasons.append("Dollar weakening")

    if not scores:
        return None, "Insufficient data"

    # Normalize to -100..100
    total_weight = sum(w for _, _, w in scores)
    raw = sum(s for _, s, _ in scores)
    score = int(round((raw / total_weight) * 100))
    score = max(-100, min(100, score))

    if not reasons:
        reasons.append("Mixed signals across factors")

    return score, " • ".join(reasons[:3])


def main():
    os.makedirs("data", exist_ok=True)

    # Fetch all quotes
    quotes = {}
    for key, ticker in TICKERS.items():
        print(f"Fetching {key} ({ticker})...")
        quotes[key] = fetch_quote(ticker)

    # NIFTY main file
    nifty = quotes.get("nifty")
    if not nifty:
        nifty_payload = {
            "status": "DATA UNAVAILABLE",
            "reason": "Yahoo Finance did not return NIFTY data",
            "updated_utc": datetime.now(timezone.utc).isoformat(),
        }
    else:
        mood_score, mood_reason = compute_nifty_mood(
            quotes.get("nifty"),
            quotes.get("sp500"),
            quotes.get("nasdaq"),
            quotes.get("vix"),
            quotes.get("us10y"),
            quotes.get("brent"),
            quotes.get("dxy"),
        )

        nifty_data = dict(nifty)
        nifty_data["mood_score"] = mood_score
        nifty_data["mood_reason"] = mood_reason

        nifty_payload = {
            "updated_utc": datetime.now(timezone.utc).isoformat(),
            "source": "Yahoo Finance",
            "source_url": "https://finance.yahoo.com/quote/%5ENSEI",
            "data": nifty_data,
        }

    with open("data/nifty.json", "w", encoding="utf-8") as f:
        json.dump(nifty_payload, f, ensure_ascii=False, indent=2)

    # Detailed factors file (for nifty.html)
    factors = {
        "updated_utc": datetime.now(timezone.utc).isoformat(),
        "source": "Yahoo Finance",
        "us_markets": {
            "sp500": quotes.get("sp500"),
            "nasdaq": quotes.get("nasdaq"),
            "dow": quotes.get("dow"),
            "vix": quotes.get("vix"),
        },
        "bonds": {
            "us10y": quotes.get("us10y"),
        },
        "commodities": {
            "brent": quotes.get("brent"),
            "wti": quotes.get("wti"),
            "gold": quotes.get("gold"),
        },
        "dxy": quotes.get("dxy"),
    }

    with open("data/nifty_factors.json", "w", encoding="utf-8") as f:
        json.dump(factors, f, ensure_ascii=False, indent=2)

    print("Saved data/nifty.json and data/nifty_factors.json")


if __name__ == "__main__":
    main()
