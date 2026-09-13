"""
GONESH Market Intelligence
Fetch financial news from RSS feeds
No API key required.
"""

import json
import os
import sys
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone

try:
    import feedparser
except ImportError:
    print("[ERROR] feedparser not installed", file=sys.stderr)
    sys.exit(1)


FEEDS = [
    ("CoinDesk", "https://www.coindesk.com/arc/outboundfeeds/rss/"),
    ("Cointelegraph", "https://cointelegraph.com/rss"),
    ("Investing Forex", "https://www.investing.com/rss/news_1.rss"),
    ("Investing Crypto", "https://www.investing.com/rss/news_301.rss"),
    ("Yahoo Finance", "https://finance.yahoo.com/news/rssindex"),
    ("MarketWatch", "https://feeds.marketwatch.com/marketwatch/topstories/"),
    ("Reuters Business", "https://feeds.reuters.com/reuters/businessNews"),
]

MAX_PER_FEED = 8
MAX_TOTAL = 40

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Market Intelligence Fetcher)",
    "Accept": "application/rss+xml, application/xml, text/xml, */*",
}


def fetch_feed(source_name, url):
    """Fetch and parse a single RSS feed."""
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=15) as resp:
            raw = resp.read()
        feed = feedparser.parse(raw)

        items = []
        for entry in feed.entries[:MAX_PER_FEED]:
            ts = 0
            if entry.get("published_parsed"):
                try:
                    ts = int(time.mktime(entry.published_parsed))
                except Exception:
                    ts = 0

            items.append({
                "source": source_name,
                "title": entry.get("title", "").strip(),
                "link": entry.get("link", ""),
                "published": entry.get("published", ""),
                "ts": ts,
            })
        return items
    except Exception as e:
        print(f"[WARN] {source_name} failed: {e}", file=sys.stderr)
        return []


def main():
    os.makedirs("data", exist_ok=True)

    all_items = []
    for source_name, url in FEEDS:
        print(f"Fetching {source_name}...")
        items = fetch_feed(source_name, url)
        all_items.extend(items)

    # Deduplicate by title
    seen = set()
    unique = []
    for item in all_items:
        key = item["title"].lower()
        if key in seen or not key:
            continue
        seen.add(key)
        unique.append(item)

    # Sort by timestamp (newest first)
    unique.sort(key=lambda x: x["ts"], reverse=True)
    top = unique[:MAX_TOTAL]

    if not top:
        payload = {
            "status": "DATA UNAVAILABLE",
            "reason": "All RSS sources failed",
            "updated_utc": datetime.now(timezone.utc).isoformat(),
        }
    else:
        payload = {
            "updated_utc": datetime.now(timezone.utc).isoformat(),
            "source": "RSS feeds",
            "count": len(top),
            "items": top,
        }

    with open("data/news.json", "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    print(f"Saved data/news.json ({len(top)} items)")


if __name__ == "__main__":
    main()
