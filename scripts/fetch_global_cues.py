"""
GONESH Market Intelligence
Fetch Global Market Cues (pre-market context)
"""

import json
import os
import sys
import urllib.request
from datetime import datetime, timezone

CUES_TICKERS = {
    "gift_nifty": "^NSEI",
    "nikkei": "^N225",
    "hang_seng": "^HSI",
    "kospi": "^KS11",
    "usd_jpy": "JPY=X",
    "usd_idr": "IDR=X",
    "usd_myr": "MYR=X",
}

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Market Intelligence Fetcher)",
    "Accept": "application/json",
}


def fetch_quote(ticker):
    url = (
        f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}"
        f"?interval=1d&range=5d"
    )
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        meta = data["chart"]["result"][0]["meta"]
        price = meta.get("regularMarketPrice")
        prev = meta.get("chartPreviousClose") or meta.get("previousClose")
        if price is None:
            return None
        change = price - prev if prev else 0
        change_pct = (change / prev) * 100 if prev else 0
        return {
            "value": round(price, 2),
            "previous_close": round(prev, 2) if prev else None,
            "change": round(change, 2),
            "change_percent": round(change_pct, 2),
        }
    except Exception as e:
        print(f"[WARN] {ticker} failed: {e}", file=sys.stderr)
        return None


def main():
    os.makedirs("data", exist_ok=True)

    cues = {}
    for key, ticker in CUES_TICKERS.items():
        print(f"Fetching {key} ({ticker})...")
        cues[key] = fetch_quote(ticker)

    payload = {
        "updated_utc": datetime.now(timezone.utc).isoformat(),
        "source": "Yahoo Finance",
        "data": cues,
    }

    with open("data/global_cues.json", "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    print("Saved data/global_cues.json")


if __name__ == "__main__":
    main()
