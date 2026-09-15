"""
GONESH Market Intelligence
Fetch FII / DII activity from NSE
"""

import json
import os
import sys
import urllib.request
from datetime import datetime, timezone

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.nseindia.com/",
}


def fetch_fii_dii():
    """Fetch FII/DII data from NSE India."""
    url = "https://www.nseindia.com/api/fiidiiTradeReact"
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        return data
    except Exception as e:
        print(f"[WARN] NSE FII/DII failed: {e}", file=sys.stderr)
        return None


def main():
    os.makedirs("data", exist_ok=True)

    data = fetch_fii_dii()

    if not data:
        payload = {
            "status": "DATA UNAVAILABLE",
            "reason": "NSE endpoint did not return data",
            "updated_utc": datetime.now(timezone.utc).isoformat(),
        }
    else:
        payload = {
            "updated_utc": datetime.now(timezone.utc).isoformat(),
            "source": "NSE India",
            "source_url": "https://www.nseindia.com/",
            "data": data,
        }

    with open("data/fii_dii.json", "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    print("Saved data/fii_dii.json")


if __name__ == "__main__":
    main()
