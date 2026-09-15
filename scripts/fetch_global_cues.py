"""
GONESH Market Intelligence
Fetch Global Market Cues (pre-market context)
"""

import json
import os
import urllib.request
import urllib.error
from datetime import datetime, timezone

# Yahoo Finance tickers for global cues
CUES_TICKERS = {
    "gift_nifty": "^NSEI",          # GIFT NIFTY proxy
    "nikkei": "^N225",              # Japan Nikkei
    "hang_seng": "^HSI",            # Hong Kong
    "kospi": "^KS11",               # South Korea
    "usd_jpy": "JPY=X",             # USD/JPY
    "usd_idr": "IDR=X",             # USD/IDR
    "usd_myr": "MYR=X",             # USD/MYR
}

def fetch_quote(ticker):
    """Fetch quote from Yahoo Finance."""
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?interval=1d&range=1d"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode())
        meta = data["chart"]["result"][0]["meta"]
        price = meta.get("regularMarketPrice")
        prev = meta.get("chartPreviousClose") or meta.get("previousClose")
        if price is None:
            return None
        change = price - prev if prev else 0
        change_pct = (change / prev) * 100 if prev else 0
        return {
            "value": round(price, 2),
            "change": round(change, 2),
            "change_percent": round(change_pct, 2),
        }
    except Exception as e:
        print(f"[WARN] {ticker} failed: {e}")
        return None

def main():
    os.makedirs("data", exist_ok=True)
    cues = {}
    for key, ticker in CUES_TICKERS.items():
        cues[key] = fetch_quote(ticker)

    payload = {
        "updated_utc": datetime.now(timezone.utc).isoformat(),
        "source": "Yahoo Finance (Global Cues proxy)",
        "data": cues,
    }
    with open("data/global_cues.json", "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    print("Saved data/global_cues.json")

if __name__ == "__main__":
    main()
